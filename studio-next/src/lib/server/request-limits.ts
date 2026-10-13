import { isIP } from 'node:net';

export type JsonObject = Record<string, unknown>;

type RequestFailure = {
  path: string;
  message: string;
};

export type RequestValidator = (body: JsonObject) => RequestFailure[];

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

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unknownFields(body: JsonObject, allowed: ReadonlySet<string>): RequestFailure[] {
  return Object.keys(body)
    .filter((key) => !allowed.has(key))
    .map((key) => ({ path: key, message: `${key} is not a recognised field for this request.` }));
}

function integerInRange(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
}

const TASK_FIELDS = new Set([
  'schema_version', 'workflow', 'goal', 'sources', 'allowed_origins', 'follow_links',
  'allowed_actions', 'output_format', 'output_schema', 'records_field', 'limits',
  'parent_id', 'memory_ids',
]);

const TASK_LIMITS = {
  max_pages: { normal: 3, agent: 6 },
  max_steps: { normal: 30, agent: 40 },
  max_records: { normal: 10, agent: 10 },
  timeout_seconds: { normal: 300, agent: 300 },
} as const;

export const validateTaskRequest: RequestValidator = (body) => {
  const failures = unknownFields(body, TASK_FIELDS);
  const workflow = typeof body.workflow === 'string' ? body.workflow : '';
  const agent = workflow === 'agent';
  const sources = Array.isArray(body.sources) ? body.sources : [];

  if (body.sources !== undefined && !Array.isArray(body.sources)) {
    failures.push({ path: 'sources', message: 'sources must be an array.' });
  } else if (sources.some((source) => typeof source !== 'string')) {
    failures.push({ path: 'sources', message: 'Every source must be a string.' });
  } else {
    sources.forEach((source, index) => {
      if (!isPublicHttpsSource(source as string)) failures.push({ path: `sources.${index}`, message: 'Sources must be public HTTPS URLs.' });
    });
  }

  const maxPagesAllowed = agent ? 6 : 3;
  if (sources.length > maxPagesAllowed) failures.push({ path: 'sources', message: `This workflow supports at most ${maxPagesAllowed} sources.` });

  if (body.limits !== undefined && !isObject(body.limits)) {
    failures.push({ path: 'limits', message: 'limits must be an object.' });
  } else if (isObject(body.limits)) {
    for (const [key, value] of Object.entries(body.limits)) {
      const range = TASK_LIMITS[key as keyof typeof TASK_LIMITS];
      if (!range) {
        failures.push({ path: `limits.${key}`, message: `${key} is not a recognised CiteOtter task limit.` });
        continue;
      }
      const maximum = agent ? range.agent : range.normal;
      if (!integerInRange(value, 1, maximum)) failures.push({ path: `limits.${key}`, message: `${key} must be an integer from 1 to ${maximum}.` });
    }
    if (typeof body.limits.max_pages === 'number' && body.limits.max_pages < sources.length) {
      failures.push({ path: 'limits.max_pages', message: 'max_pages must cover every source.' });
    }
  }
  return failures;
};

const MONITOR_FIELDS = new Set(['kind', 'goal', 'source', 'output_schema', 'query', 'schedule_minutes', 'notify']);

export const validateMonitorRequest: RequestValidator = (body) => {
  const failures = unknownFields(body, MONITOR_FIELDS);
  if (body.kind !== 'page' && body.kind !== 'topic') failures.push({ path: 'kind', message: 'kind must be page or topic.' });
  if (!integerInRange(body.schedule_minutes, 60, 10_080)) {
    failures.push({ path: 'schedule_minutes', message: 'schedule_minutes must be an integer from 60 to 10080.' });
  }
  if (body.notify !== undefined && body.notify !== 'none' && body.notify !== 'on_change') {
    failures.push({ path: 'notify', message: 'notify must be none or on_change.' });
  }
  if (body.output_schema !== undefined && !isObject(body.output_schema)) {
    failures.push({ path: 'output_schema', message: 'output_schema must be a JSON object.' });
  }
  if (body.kind === 'page') {
    if (typeof body.goal !== 'string' || body.goal.trim().length < 1 || new TextEncoder().encode(body.goal).byteLength > 8_000) {
      failures.push({ path: 'goal', message: 'goal must contain 1–8000 bytes.' });
    }
    if (typeof body.source !== 'string' || !isPublicHttpsSource(body.source)) {
      failures.push({ path: 'source', message: 'source must be a public HTTPS URL.' });
    }
  }
  if (body.kind === 'topic' && (typeof body.query !== 'string' || body.query.trim().length < 1 || [...body.query.trim()].length > 400)) {
    failures.push({ path: 'query', message: 'query must contain 1–400 characters.' });
  }
  return failures;
};

const MONITOR_STATE_FIELDS = new Set(['state']);

export const validateMonitorStateRequest: RequestValidator = (body) => {
  const failures = unknownFields(body, MONITOR_STATE_FIELDS);
  if (body.state !== 'pause' && body.state !== 'resume') failures.push({ path: 'state', message: 'state must be pause or resume.' });
  return failures;
};

const ENRICHMENT_FIELDS = new Set(['label', 'goal', 'csv', 'source_column', 'id_column', 'output_schema']);

function parseCsv(input: string): string[][] | null {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;
  let endedRecord = false;

  const finishRecord = () => {
    record.push(field);
    records.push(record);
    record = [];
    field = '';
    quoteClosed = false;
    endedRecord = true;
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        field += character;
      }
      endedRecord = false;
      continue;
    }
    if (quoteClosed && character !== ',' && character !== '\n' && character !== '\r') return null;
    if (character === '"') {
      if (field.length > 0) return null;
      quoted = true;
      endedRecord = false;
    } else if (character === ',') {
      record.push(field);
      field = '';
      quoteClosed = false;
      endedRecord = false;
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      finishRecord();
    } else {
      field += character;
      endedRecord = false;
    }
  }
  if (quoted) return null;
  if (!endedRecord || record.length > 0 || field.length > 0) finishRecord();
  return records;
}

export const validateEnrichmentRequest: RequestValidator = (body) => {
  const failures = unknownFields(body, ENRICHMENT_FIELDS);
  if (body.label !== undefined && (typeof body.label !== 'string' || [...body.label].length > 200)) {
    failures.push({ path: 'label', message: 'label must not exceed 200 characters.' });
  }
  if (typeof body.goal !== 'string' || body.goal.trim().length < 1 || new TextEncoder().encode(body.goal).byteLength > 8_000) {
    failures.push({ path: 'goal', message: 'goal must contain 1–8000 bytes.' });
  }
  if (body.output_schema !== undefined && !isObject(body.output_schema)) {
    failures.push({ path: 'output_schema', message: 'output_schema must be a JSON object.' });
  }
  if (typeof body.csv !== 'string' || new TextEncoder().encode(body.csv).byteLength > 256 * 1024) {
    failures.push({ path: 'csv', message: 'csv must be a string no larger than 256 KiB.' });
    return failures;
  }

  const records = parseCsv(body.csv);
  if (!records) {
    failures.push({ path: 'csv', message: 'csv is malformed.' });
    return failures;
  }
  const header = records[0] ?? [];
  const rows = records.slice(1);
  if (rows.length < 2 || rows.length > 10) failures.push({ path: 'csv', message: 'csv must contain 2–10 data rows.' });
  if (header.length > 20) failures.push({ path: 'csv', message: 'csv must contain at most 20 columns.' });
  if (header.some((column) => column.length === 0) || new Set(header).size !== header.length) {
    failures.push({ path: 'csv', message: 'CSV columns must be non-empty and unique.' });
  }
  if (typeof body.source_column !== 'string' || !header.includes(body.source_column)) {
    failures.push({ path: 'source_column', message: 'source_column must name a CSV column.' });
    return failures;
  }
  if (body.id_column !== undefined && (typeof body.id_column !== 'string' || (body.id_column !== '' && !header.includes(body.id_column)))) {
    failures.push({ path: 'id_column', message: 'id_column must name a CSV column.' });
  }
  const sourceIndex = header.indexOf(body.source_column);
  rows.forEach((row, index) => {
    const source = row[sourceIndex]?.trim() ?? '';
    if (!isPublicHttpsSource(source)) failures.push({ path: `csv.row.${index + 1}`, message: 'Every enrichment source must be a public HTTPS URL.' });
  });
  return failures;
};

const SEARCH_FIELDS = new Set(['query', 'seeds', 'max_results', 'language']);
const SEARCH_LANGUAGE = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/;

export const validateSearchRequest: RequestValidator = (body) => {
  const failures = unknownFields(body, SEARCH_FIELDS);
  if (typeof body.query !== 'string' || body.query.trim().length < 1 || [...body.query.trim()].length > 400) {
    failures.push({ path: 'query', message: 'query must contain 1–400 characters.' });
  }
  if (body.seeds !== undefined && (!Array.isArray(body.seeds) || body.seeds.length > 3 || body.seeds.some((seed) => typeof seed !== 'string'))) {
    failures.push({ path: 'seeds', message: 'seeds must contain at most three public HTTPS URLs.' });
  } else if (Array.isArray(body.seeds)) {
    body.seeds.forEach((seed, index) => {
      if (!isPublicHttpsSource(seed as string)) failures.push({ path: `seeds.${index}`, message: 'Seeds must be public HTTPS URLs.' });
    });
  }
  if (body.max_results !== undefined && body.max_results !== 0 && !integerInRange(body.max_results, 1, 20)) {
    failures.push({ path: 'max_results', message: 'max_results must be an integer from 1 to 20.' });
  }
  if (body.language !== undefined && (typeof body.language !== 'string' || (body.language !== '' && !SEARCH_LANGUAGE.test(body.language)))) {
    failures.push({ path: 'language', message: 'language must be a short BCP 47 hint.' });
  }
  return failures;
};
