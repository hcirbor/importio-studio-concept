import { isIP } from 'node:net';

export type JsonObject = Record<string, unknown>;

export type LimitFailure = {
  path: string;
  message: string;
};

const PRIVATE_IPV4 = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^192\.88\.99\./,
  /^192\.168\./,
  /^198\.(1[89])\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^(22[4-9]|23\d)\./,
  /^(24\d|25[0-5])\./,
];

function isPublicHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized.endsWith('.example')
    || normalized.endsWith('.invalid')
    || normalized.endsWith('.test')) return false;
  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return !PRIVATE_IPV4.some((pattern) => pattern.test(normalized));
  if (ipVersion === 6) {
    return normalized !== '::1'
      && normalized !== '::'
      && !normalized.startsWith('fc')
      && !normalized.startsWith('fd')
      && !normalized.startsWith('fe8')
      && !normalized.startsWith('fe9')
      && !normalized.startsWith('fea')
      && !normalized.startsWith('feb')
      && !normalized.startsWith('ff')
      && !normalized.startsWith('2001:db8:');
  }
  return normalized.includes('.');
}

function isPublicHttpsSource(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && isPublicHostname(url.hostname);
  } catch {
    return false;
  }
}

function sourceEntries(body: JsonObject): Array<{ path: string; value: string }> {
  const entries: Array<{ path: string; value: string }> = [];
  if (Array.isArray(body.sources)) {
    body.sources.forEach((value, index) => {
      if (typeof value === 'string') entries.push({ path: `sources.${index}`, value });
    });
  }
  return entries;
}

const LIMIT_RANGES = {
  max_pages: { defaultMax: 3, agentMax: 6 },
  max_steps: { defaultMax: 30, agentMax: 40 },
  max_records: { defaultMax: 10, agentMax: 10 },
  timeout_seconds: { defaultMax: 300, agentMax: 300 },
} as const;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateGatewayLimits(body: JsonObject): LimitFailure[] {
  const failures: LimitFailure[] = [];
  const workflow = typeof body.workflow === 'string' ? body.workflow : '';
  const maxPagesAllowed = workflow === 'agent' ? 6 : 3;
  const sources = sourceEntries(body);

  if (body.sources !== undefined && !Array.isArray(body.sources)) {
    failures.push({ path: 'sources', message: 'sources must be an array.' });
  } else if (Array.isArray(body.sources) && body.sources.some((source) => typeof source !== 'string')) {
    failures.push({ path: 'sources', message: 'Every source must be a string.' });
  }

  for (const alias of ['source', 'url', 'sourceField', 'source_field', 'notify']) {
    if (Object.hasOwn(body, alias)) {
      failures.push({ path: alias, message: `${alias} is not a CiteOtter task contract field.` });
    }
  }
  for (const key of Object.keys(body)) {
    if (key !== 'limits' && (/(?:limit)/i.test(key) || /^(?:max|timeout)/i.test(key))) {
      failures.push({ path: key, message: `${key} is not a recognised CiteOtter limit field.` });
    }
  }

  const limits = body.limits;
  if (limits !== undefined && !isObject(limits)) {
    failures.push({ path: 'limits', message: 'limits must be an object.' });
  } else if (isObject(limits)) {
    for (const [key, value] of Object.entries(limits)) {
      const range = LIMIT_RANGES[key as keyof typeof LIMIT_RANGES];
      if (!range) {
        failures.push({ path: `limits.${key}`, message: `${key} is not a recognised CiteOtter limit field.` });
        continue;
      }
      const maximum = workflow === 'agent' ? range.agentMax : range.defaultMax;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > maximum) {
        failures.push({ path: `limits.${key}`, message: `${key} must be an integer from 1 to ${maximum}.` });
      }
    }
  }

  for (const source of sources) {
    if (!isPublicHttpsSource(source.value)) {
      failures.push({ path: source.path, message: 'Sources must be public HTTPS URLs.' });
    }
  }
  if (sources.length > maxPagesAllowed) {
    failures.push({ path: 'sources', message: `This workflow supports at most ${maxPagesAllowed} sources.` });
  }
  if (isObject(limits) && typeof limits.max_pages === 'number' && limits.max_pages < sources.length) {
    failures.push({ path: 'limits.max_pages', message: 'max_pages must cover every source.' });
  }
  return failures;
}
