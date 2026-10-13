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

function numberAt(body: JsonObject, camel: string, snake: string): number | undefined {
  const limits = typeof body.limits === 'object' && body.limits !== null ? body.limits as JsonObject : {};
  const value = limits[camel] ?? body[snake] ?? body[camel];
  return typeof value === 'number' ? value : undefined;
}

function sourceEntries(body: JsonObject): Array<{ path: string; value: string }> {
  const entries: Array<{ path: string; value: string }> = [];
  if (typeof body.source === 'string') entries.push({ path: 'source', value: body.source });
  if (typeof body.url === 'string') entries.push({ path: 'url', value: body.url });
  if (Array.isArray(body.sources)) {
    body.sources.forEach((value, index) => {
      if (typeof value === 'string') entries.push({ path: `sources.${index}`, value });
    });
  }
  const sourceField = typeof body.sourceField === 'string' ? body.sourceField : body.source_field;
  if (typeof sourceField === 'string' && Array.isArray(body.rows)) {
    body.rows.forEach((row, index) => {
      if (typeof row !== 'object' || row === null) return;
      const values = (row as JsonObject).values;
      if (typeof values !== 'object' || values === null) return;
      const value = (values as JsonObject)[sourceField];
      if (typeof value === 'string') entries.push({ path: `rows.${index}.values.${sourceField}`, value });
    });
  }
  return entries;
}

export function validateGatewayLimits(body: JsonObject): LimitFailure[] {
  const failures: LimitFailure[] = [];
  const workflow = typeof body.workflow === 'string' ? body.workflow : '';
  const maxPagesAllowed = workflow === 'agent' || workflow === 'research' ? 6 : 3;
  const sources = sourceEntries(body);
  const maxPages = numberAt(body, 'maxPages', 'max_pages');
  const maxRecords = numberAt(body, 'maxRecords', 'max_records');
  const recordCount = Array.isArray(body.records)
    ? body.records.length
    : Array.isArray(body.rows) ? body.rows.length : 0;

  for (const source of sources) {
    if (!isPublicHttpsSource(source.value)) {
      failures.push({ path: source.path, message: 'Sources must be public HTTPS URLs.' });
    }
  }
  if (sources.length > maxPagesAllowed || (maxPages !== undefined && (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > maxPagesAllowed))) {
    failures.push({ path: 'limits.maxPages', message: `This workflow supports at most ${maxPagesAllowed} pages.` });
  }
  if (recordCount > 10 || (maxRecords !== undefined && (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 10))) {
    failures.push({ path: 'limits.maxRecords', message: 'This workflow supports at most 10 records.' });
  }
  if (body.notify !== undefined && body.notify !== 'none' && body.notify !== 'on_change') {
    failures.push({ path: 'notify', message: 'Notification must be none or on_change.' });
  }
  return failures;
}
