import 'server-only';

import { createPublicKey, verify } from 'node:crypto';

const IAP_ISSUER = 'https://cloud.google.com/iap';
const IAP_JWKS_URL = 'https://www.gstatic.com/iap/verify/public_key-jwk';
const KEY_CACHE_MS = 60 * 60 * 1000;

type JsonObject = Record<string, unknown>;
type PublicJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type JwkSet = { keys: PublicJwk[] };

export type VerifiedIapIdentity = {
  email: string;
  subject: string;
};

export type IapVerificationOptions = {
  audience: string;
  nowSeconds?: number;
  loadKeys?: (forceRefresh?: boolean) => Promise<JwkSet>;
};

let cachedKeys: { expiresAt: number; value: JwkSet } | undefined;

function decodeJson(segment: string): JsonObject {
  const value: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid JWT object.');
  return value as JsonObject;
}

async function loadGoogleKeys(forceRefresh = false): Promise<JwkSet> {
  const now = Date.now();
  if (!forceRefresh && cachedKeys && cachedKeys.expiresAt > now) return cachedKeys.value;
  const response = await fetch(IAP_JWKS_URL, { cache: 'no-store', signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error('Unable to load IAP verification keys.');
  const value: unknown = await response.json();
  if (typeof value !== 'object' || value === null || !Array.isArray((value as JsonObject).keys)) {
    throw new Error('Invalid IAP key set.');
  }
  const keys = value as JwkSet;
  cachedKeys = { expiresAt: now + KEY_CACHE_MS, value: keys };
  return keys;
}

export async function verifyIapJwt(token: string, options: IapVerificationOptions): Promise<VerifiedIapIdentity> {
  const segments = token.split('.');
  if (segments.length !== 3) throw new Error('Invalid IAP token.');
  const [encodedHeader = '', encodedPayload = '', encodedSignature = ''] = segments;
  const header = decodeJson(encodedHeader);
  const claims = decodeJson(encodedPayload);
  if (header.alg !== 'ES256' || typeof header.kid !== 'string') throw new Error('Invalid IAP token header.');

  const keyLoader = options.loadKeys ?? loadGoogleKeys;
  let keySet = await keyLoader(false);
  let jwk = keySet.keys.find((candidate) => candidate.kid === header.kid && (!candidate.alg || candidate.alg === 'ES256'));
  if (!jwk) {
    keySet = await keyLoader(true);
    jwk = keySet.keys.find((candidate) => candidate.kid === header.kid && (!candidate.alg || candidate.alg === 'ES256'));
  }
  if (!jwk) throw new Error('Unknown IAP signing key.');
  const validSignature = verify(
    'sha256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    { key: createPublicKey({ key: jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' },
    Buffer.from(encodedSignature, 'base64url'),
  );
  if (!validSignature) throw new Error('Invalid IAP signature.');

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (claims.iss !== IAP_ISSUER) throw new Error('Invalid IAP issuer.');
  if (claims.aud !== options.audience) throw new Error('Invalid IAP audience.');
  if (typeof claims.exp !== 'number' || claims.exp <= now) throw new Error('Expired IAP token.');
  if (typeof claims.iat !== 'number' || claims.iat > now + 60) throw new Error('Invalid IAP issue time.');
  if (typeof claims.email !== 'string' || !claims.email.includes('@')) throw new Error('IAP email is missing.');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('IAP subject is missing.');
  return { email: claims.email, subject: claims.sub };
}

export async function verifyIapRequest(request: Request, options: Omit<IapVerificationOptions, 'audience'> & { audience?: string } = {}): Promise<VerifiedIapIdentity> {
  const token = request.headers.get('x-goog-iap-jwt-assertion');
  if (!token) throw new Error('IAP assertion is missing.');
  const audience = options.audience ?? process.env.IAP_AUDIENCE?.trim();
  if (!audience) throw new Error('IAP audience is not configured.');
  return verifyIapJwt(token, { ...options, audience });
}
