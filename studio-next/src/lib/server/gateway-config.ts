import 'server-only';

const GATEWAY_ENV_NAMES = {
  upstreamUrl: 'CITEOTTER_UPSTREAM_URL',
  credentialFile: 'CITEOTTER_BASIC_AUTH_FILE',
  timeoutMs: 'CITEOTTER_TIMEOUT_MS',
  iapAudience: 'IAP_AUDIENCE',
  localAuthBypass: 'STUDIO_LOCAL_AUTH_BYPASS',
} as const;

export type GatewayConfig = {
  upstreamUrl: URL;
  credentialFile: string;
  timeoutMs: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

export function readGatewayConfig(): GatewayConfig {
  const upstreamUrl = new URL(requiredEnv(GATEWAY_ENV_NAMES.upstreamUrl));
  if (process.env.NODE_ENV === 'production' && upstreamUrl.protocol !== 'https:') {
    throw new Error('The upstream service must use HTTPS in production.');
  }
  if (!['https:', 'http:'].includes(upstreamUrl.protocol)) {
    throw new Error('The upstream service protocol is unsupported.');
  }

  const timeoutValue = process.env[GATEWAY_ENV_NAMES.timeoutMs];
  const timeoutMs = timeoutValue ? Number(timeoutValue) : 30_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000) {
    throw new Error('The upstream timeout must be between 1000 and 300000 milliseconds.');
  }

  return {
    upstreamUrl,
    credentialFile: requiredEnv(GATEWAY_ENV_NAMES.credentialFile),
    timeoutMs,
  };
}

export function localAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
    && process.env[GATEWAY_ENV_NAMES.localAuthBypass] === 'true';
}
