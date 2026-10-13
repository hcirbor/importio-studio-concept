import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { verifyIapJwt, verifyIapRequest } from '@/lib/server/iap';
import { localAuthBypassEnabled } from '@/lib/server/gateway-config';

const now = 1_800_000_000;
const audience = '/projects/123456789/global/backendServices/987654321';
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'ES256', use: 'sig' };
const loadKeys = async () => ({ keys: [jwk] });

function token(overrides: Record<string, unknown> = {}, signingKey: KeyObject = privateKey): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: 'test-key', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: 'https://cloud.google.com/iap', aud: audience, sub: 'accounts.google.com:123',
    email: 'person@neuralogics.com', iat: now - 30, exp: now + 300, ...overrides,
  })).toString('base64url');
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key: signingKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('IAP signed-header verification', () => {
  it('accepts a valid Google IAP ES256 token with an authenticated email', async () => {
    await expect(verifyIapJwt(token(), { audience, nowSeconds: now, loadKeys })).resolves.toEqual({
      email: 'person@neuralogics.com', subject: 'accounts.google.com:123',
    });
  });

  it('rejects an RS256 token', async () => {
    const rsaKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'rsa-key', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: 'https://cloud.google.com/iap', aud: audience, sub: 'accounts.google.com:123',
      email: 'person@neuralogics.com', iat: now - 30, exp: now + 300,
    })).toString('base64url');
    const signature = sign('sha256', Buffer.from(`${header}.${payload}`), rsaKeys.privateKey).toString('base64url');
    await expect(verifyIapJwt(`${header}.${payload}.${signature}`, { audience, nowSeconds: now, loadKeys })).rejects.toThrow('header');
  });

  it('rejects a bad signature', async () => {
    const other = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    await expect(verifyIapJwt(token({}, other.privateKey), { audience, nowSeconds: now, loadKeys })).rejects.toThrow('signature');
  });

  it.each([
    [{ iss: 'https://issuer.example' }, 'issuer'],
    [{ aud: '/projects/wrong/global/backendServices/wrong' }, 'audience'],
    [{ exp: now - 1 }, 'Expired'],
  ])('rejects invalid claims', async (overrides, message) => {
    await expect(verifyIapJwt(token(overrides), { audience, nowSeconds: now, loadKeys })).rejects.toThrow(message);
  });

  it('refetches keys once after an unknown kid and accepts a rotated key', async () => {
    const stale = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const staleJwk = { ...stale.publicKey.export({ format: 'jwk' }), kid: 'stale-key', alg: 'ES256' };
    const loader = vi.fn(async (forceRefresh?: boolean) => ({ keys: forceRefresh ? [jwk] : [staleJwk] }));

    await expect(verifyIapJwt(token(), { audience, nowSeconds: now, loadKeys: loader })).resolves.toMatchObject({
      email: 'person@neuralogics.com',
    });
    expect(loader.mock.calls).toEqual([[false], [true]]);
  });

  it('fails after one refresh when the signing key remains unknown', async () => {
    const loader = vi.fn(async () => ({ keys: [] }));
    await expect(verifyIapJwt(token(), { audience, nowSeconds: now, loadKeys: loader })).rejects.toThrow('Unknown');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('rejects a missing signed header', async () => {
    await expect(verifyIapRequest(new Request('https://studio.example'), { audience, nowSeconds: now, loadKeys })).rejects.toThrow('missing');
  });

  it('permits the explicit local bypass outside production only', () => {
    vi.stubEnv('STUDIO_LOCAL_AUTH_BYPASS', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    expect(localAuthBypassEnabled()).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(localAuthBypassEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
