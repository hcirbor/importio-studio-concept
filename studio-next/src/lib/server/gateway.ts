import 'server-only';

import { readFile } from 'node:fs/promises';
import type { ExecutionFailure, ExecutionFailureCode } from '@/lib/data/execution-contract';
import { readGatewayConfig, type GatewayConfig } from '@/lib/server/gateway-config';
import {
  validateEnrichmentRequest,
  validateMonitorRequest,
  validateMonitorStateRequest,
  validateSearchRequest,
  validateTaskRequest,
  type JsonObject,
  type RequestValidator,
} from '@/lib/server/request-limits';

const MAX_REQUEST_BYTES = 1_000_000;
const MAX_RESPONSE_BYTES = 5_000_000;

type RouteRule = {
  method: string;
  pattern: RegExp;
  upstreamPath: (match: RegExpMatchArray, body?: JsonObject) => string;
  idGroups?: readonly number[];
  query?: readonly ('limit' | 'cursor')[];
  responseKind?: 'json' | 'export';
  validator?: RequestValidator;
  forwardsBody?: boolean;
};

const ROUTES: readonly RouteRule[] = [
  { method: 'GET', pattern: /^tasks$/, upstreamPath: () => '/v1/tasks', query: ['limit', 'cursor'] },
  { method: 'POST', pattern: /^tasks$/, upstreamPath: () => '/v1/tasks', validator: validateTaskRequest },
  { method: 'POST', pattern: /^tasks\/validate$/, upstreamPath: () => '/v1/tasks/validate', validator: validateTaskRequest },
  { method: 'GET', pattern: /^tasks\/([^/]+)$/, upstreamPath: (match) => `/v1/tasks/${match[1] ?? ''}`, idGroups: [1] },
  { method: 'GET', pattern: /^tasks\/([^/]+)\/events$/, upstreamPath: (match) => `/v1/tasks/${match[1] ?? ''}/events`, idGroups: [1], query: ['limit', 'cursor'] },
  { method: 'POST', pattern: /^tasks\/([^/]+)\/cancel$/, upstreamPath: (match) => `/v1/tasks/${match[1] ?? ''}/cancel`, idGroups: [1] },
  { method: 'POST', pattern: /^search$/, upstreamPath: () => '/v1/search', validator: validateSearchRequest },
  { method: 'GET', pattern: /^enrichments$/, upstreamPath: () => '/v1/enrichments', query: ['limit', 'cursor'] },
  { method: 'POST', pattern: /^enrichments$/, upstreamPath: () => '/v1/enrichments', validator: validateEnrichmentRequest },
  { method: 'GET', pattern: /^enrichments\/([^/]+)$/, upstreamPath: (match) => `/v1/enrichments/${match[1] ?? ''}`, idGroups: [1] },
  { method: 'GET', pattern: /^enrichments\/([^/]+)\/export$/, upstreamPath: (match) => `/v1/enrichments/${match[1] ?? ''}/export`, idGroups: [1], responseKind: 'export' },
  { method: 'GET', pattern: /^monitors$/, upstreamPath: () => '/v1/monitors', query: ['limit', 'cursor'] },
  { method: 'POST', pattern: /^monitors$/, upstreamPath: () => '/v1/monitors', validator: validateMonitorRequest },
  { method: 'POST', pattern: /^monitors\/validate$/, upstreamPath: () => '/v1/monitors/validate', validator: validateMonitorRequest },
  { method: 'GET', pattern: /^monitors\/([^/]+)$/, upstreamPath: (match) => `/v1/monitors/${match[1] ?? ''}`, idGroups: [1] },
  { method: 'DELETE', pattern: /^monitors\/([^/]+)$/, upstreamPath: (match) => `/v1/monitors/${match[1] ?? ''}`, idGroups: [1] },
  {
    method: 'POST',
    pattern: /^monitors\/([^/]+)\/state$/,
    upstreamPath: (match, body) => `/v1/monitors/${match[1] ?? ''}/${String(body?.state ?? '')}`,
    idGroups: [1],
    validator: validateMonitorStateRequest,
    forwardsBody: false,
  },
  { method: 'GET', pattern: /^monitors\/([^/]+)\/events$/, upstreamPath: (match) => `/v1/monitors/${match[1] ?? ''}/events`, idGroups: [1], query: ['limit', 'cursor'] },
  { method: 'GET', pattern: /^usage$/, upstreamPath: () => '/v1/usage' },
];

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export type GatewayDependencies = {
  config?: GatewayConfig;
  fetchImpl?: typeof fetch;
  readCredential?: (path: string) => Promise<string>;
};

function jsonFailure(status: number, failure: ExecutionFailure): Response {
  return new Response(JSON.stringify({ error: failure }), {
    status,
    headers: { 'content-type': 'application/json', 'x-content-type-options': 'nosniff' },
  });
}

function failure(code: ExecutionFailureCode, message: string, retryable: boolean, path?: string): ExecutionFailure {
  return { code, message, retryable, ...(path ? { path } : {}) };
}

function findRoute(method: string, segments: readonly string[]): { rule: RouteRule; match: RegExpMatchArray } | null {
  const path = segments.join('/');
  for (const rule of ROUTES) {
    if (rule.method !== method) continue;
    const match = path.match(rule.pattern);
    if (match && (rule.idGroups ?? []).every((group) => SAFE_ID.test(match[group] ?? ''))) return { rule, match };
  }
  return null;
}

function allowedQuery(request: Request, names: RouteRule['query']): URLSearchParams | Response {
  const incoming = new URL(request.url).searchParams;
  const outgoing = new URLSearchParams();
  for (const name of names ?? []) {
    const values = incoming.getAll(name);
    if (values.length > 1) return jsonFailure(400, failure('invalid_request', `${name} must be supplied once.`, false, name));
    const value = values[0];
    if (value === undefined) continue;
    if (name === 'limit' && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100)) {
      return jsonFailure(400, failure('invalid_request', 'limit must be an integer from 1 to 100.', false, name));
    }
    if (name === 'cursor' && (value.length < 1 || value.length > 1024 || /[\u0000-\u001f\u007f]/.test(value))) {
      return jsonFailure(400, failure('invalid_request', 'cursor is invalid.', false, name));
    }
    outgoing.set(name, value);
  }
  return outgoing;
}

async function readJsonBody(request: Request): Promise<{ body: JsonObject; bytes: Uint8Array } | Response> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonFailure(413, failure('capacity_exceeded', 'Request body is too large.', false));
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_REQUEST_BYTES) {
    return jsonFailure(413, failure('capacity_exceeded', 'Request body is too large.', false));
  }
  if (!bytes.byteLength) return { body: {}, bytes };
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('object required');
    return { body: parsed as JsonObject, bytes };
  } catch {
    return jsonFailure(400, failure('invalid_request', 'Request body must be a JSON object.', false));
  }
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
  return Boolean(forwardedHost) && origin === `${forwardedProto}://${forwardedHost}`;
}

function mappedFailure(status: number, upstreamCode?: string): { status: number; error: ExecutionFailure } {
  const known = new Set<ExecutionFailureCode>(['blocked', 'unavailable', 'timeout', 'cancelled', 'invalid_request', 'capacity_exceeded', 'conflict', 'not_found']);
  const code = upstreamCode && known.has(upstreamCode as ExecutionFailureCode)
    ? upstreamCode as ExecutionFailureCode
    : status === 404 ? 'not_found'
      : status === 408 || status === 504 ? 'timeout'
        : status === 409 ? 'conflict'
          : status === 429 ? 'capacity_exceeded'
            : status >= 500 || status === 401 || status === 403 ? 'unavailable'
              : 'invalid_request';
  const responseStatus = code === 'not_found' ? 404
    : code === 'timeout' ? 504
      : code === 'conflict' ? 409
        : code === 'capacity_exceeded' ? 429
          : code === 'unavailable' ? 503
            : 400;
  const messages: Record<ExecutionFailureCode, string> = {
    blocked: 'The source blocked access.',
    unavailable: 'The upstream service is unavailable.',
    timeout: 'The upstream request timed out.',
    cancelled: 'The upstream request was cancelled.',
    invalid_request: 'The upstream rejected the request.',
    capacity_exceeded: 'The upstream capacity limit was reached.',
    conflict: 'The request conflicts with existing upstream state.',
    not_found: 'The upstream resource was not found.',
  };
  return { status: responseStatus, error: failure(code, messages[code], ['unavailable', 'timeout', 'capacity_exceeded'].includes(code)) };
}

async function readBoundedResponse(response: Response): Promise<Uint8Array | null> {
  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (contentLength > MAX_RESPONSE_BYTES) return null;
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function upstreamFailure(response: Response): Promise<{ status: number; error: ExecutionFailure }> {
  let upstreamCode: string | undefined;
  try {
    const bytes = await readBoundedResponse(response);
    if (!bytes) return mappedFailure(429, 'capacity_exceeded');
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof payload === 'object' && payload !== null) {
      const object = payload as JsonObject;
      if (typeof object.code === 'string') upstreamCode = object.code;
      else if (typeof object.error === 'object' && object.error !== null && typeof (object.error as JsonObject).code === 'string') {
        upstreamCode = (object.error as JsonObject).code as string;
      }
    }
  } catch {
    // Upstream error bodies are deliberately not reflected to clients.
  }
  return mappedFailure(response.status, upstreamCode);
}

async function proxyAllowedRequest(
  request: Request,
  upstreamPath: string,
  bodyBytes: Uint8Array | undefined,
  dependencies: GatewayDependencies,
  responseKind: 'json' | 'export' = 'json',
  query = new URLSearchParams(),
): Promise<Response> {
  const config = dependencies.config ?? readGatewayConfig();
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const credentialReader = dependencies.readCredential ?? ((path: string) => readFile(path, 'utf8'));
  const upstreamUrl = new URL(upstreamPath, config.upstreamUrl);
  if (upstreamUrl.pathname !== upstreamPath) {
    return jsonFailure(404, failure('not_found', 'Gateway route not found.', false));
  }
  upstreamUrl.search = query.toString();
  let rawCredential: string;
  try {
    rawCredential = (await credentialReader(config.credentialFile)).trim();
  } catch {
    return jsonFailure(503, failure('unavailable', 'The upstream service is unavailable.', true));
  }
  if (!rawCredential) return jsonFailure(503, failure('unavailable', 'The upstream service is unavailable.', true));

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.timeoutMs);
  const cancel = () => controller.abort();
  request.signal.addEventListener('abort', cancel, { once: true });
  if (request.signal.aborted) controller.abort();
  try {
    const response = await fetchImpl(upstreamUrl, {
      method: request.method,
      headers: {
        accept: 'application/json',
        authorization: `Basic ${Buffer.from(rawCredential).toString('base64')}`,
        ...(bodyBytes ? { 'content-type': 'application/json' } : {}),
      },
      ...(bodyBytes ? { body: Buffer.from(bodyBytes) } : {}),
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      const mapped = await upstreamFailure(response);
      return jsonFailure(mapped.status, mapped.error);
    }
    const bytes = await readBoundedResponse(response);
    if (!bytes) {
      return jsonFailure(502, failure('capacity_exceeded', 'The upstream response is too large.', false));
    }
    if (responseKind === 'json') {
      try {
        JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return jsonFailure(502, failure('unavailable', 'The upstream service returned an invalid response.', true));
      }
      return new Response(Buffer.from(bytes), {
        status: response.status,
        headers: { 'content-type': 'application/json', 'x-content-type-options': 'nosniff' },
      });
    }
    const upstreamType = response.headers.get('content-type')?.toLowerCase() ?? '';
    const exportType = upstreamType.includes('text/csv') ? 'text/csv; charset=utf-8'
      : upstreamType.includes('application/json') || upstreamType.includes('+json') ? 'application/json'
        : null;
    if (!exportType) {
      return jsonFailure(502, failure('unavailable', 'The upstream service returned an invalid export.', true));
    }
    const extension = exportType.startsWith('text/csv') ? 'csv' : 'json';
    return new Response(Buffer.from(bytes), {
      status: response.status,
      headers: {
        'content-type': exportType,
        'content-disposition': `attachment; filename="enrichment-export.${extension}"`,
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    if (timedOut) return jsonFailure(504, failure('timeout', 'The upstream request timed out.', true));
    if (request.signal.aborted) return jsonFailure(499, failure('cancelled', 'The request was cancelled.', false));
    return jsonFailure(503, failure('unavailable', 'The upstream service is unavailable.', true));
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', cancel);
  }
}

export async function handleGatewayRequest(request: Request, segments: readonly string[], dependencies: GatewayDependencies = {}): Promise<Response> {
  const route = findRoute(request.method, segments);
  if (!route) return jsonFailure(404, failure('not_found', 'Gateway route not found.', false));
  if (!sameOrigin(request)) return jsonFailure(403, failure('invalid_request', 'Cross-origin requests are not allowed.', false));
  const query = allowedQuery(request, route.rule.query);
  if (query instanceof Response) return query;

  let bytes: Uint8Array | undefined;
  let body: JsonObject | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const parsed = await readJsonBody(request);
    if (parsed instanceof Response) return parsed;
    body = parsed.body;
    bytes = route.rule.forwardsBody === false ? undefined : parsed.bytes;
    if (route.rule.validator) {
      const failures = route.rule.validator(parsed.body);
      const first = failures[0];
      if (first) return jsonFailure(400, failure('invalid_request', first.message, false, first.path));
    }
  }
  const upstreamPath = route.rule.upstreamPath(route.match, body);
  return proxyAllowedRequest(request, upstreamPath, bytes, dependencies, route.rule.responseKind, query);
}

export async function handleSmokeRequest(request: Request, dependencies: GatewayDependencies = {}): Promise<Response> {
  if (request.method !== 'POST') return jsonFailure(404, failure('not_found', 'Gateway route not found.', false));
  if (!sameOrigin(request)) return jsonFailure(403, failure('invalid_request', 'Cross-origin requests are not allowed.', false));
  const parsed = await readJsonBody(request);
  if (parsed instanceof Response) return parsed;
  const source = parsed.body.source;
  const fields = Array.isArray(parsed.body.fields) ? parsed.body.fields : [];
  const fieldNames = fields.filter((field): field is string => typeof field === 'string' && field.length > 0);
  const schemaFields = fieldNames.length ? fieldNames : ['title'];
  const task: JsonObject = {
    schema_version: '1',
    workflow: 'extract',
    goal: typeof parsed.body.goal === 'string' ? parsed.body.goal : 'Verify the bounded production extraction path.',
    sources: typeof source === 'string' ? [source] : [],
    allowed_actions: ['read_page'],
    output_schema: {
      type: 'object',
      properties: Object.fromEntries(schemaFields.map((field) => [field, { type: 'string' }])),
      required: schemaFields,
      additionalProperties: false,
    },
    limits: { max_pages: 1, max_records: 10 },
  };
  const failures = typeof source === 'string' ? validateTaskRequest(task) : [{ path: 'source', message: 'One public HTTPS source is required.' }];
  const requestedLimits = typeof parsed.body.limits === 'object' && parsed.body.limits !== null ? parsed.body.limits as JsonObject : {};
  if ((typeof requestedLimits.maxPages === 'number' && requestedLimits.maxPages > 1)
    || (typeof requestedLimits.maxRecords === 'number' && requestedLimits.maxRecords > 10)) {
    failures.push({ path: 'limits', message: 'The smoke test is limited to one page and ten records.' });
  }
  const first = failures[0];
  if (first) return jsonFailure(400, failure('invalid_request', first.message, false, first.path));
  const bodyBytes = new TextEncoder().encode(JSON.stringify(task));
  return proxyAllowedRequest(request, '/v1/tasks', bodyBytes, dependencies);
}

export function createReadinessChecker(dependencies: GatewayDependencies = {}, now: () => number = Date.now): () => Promise<boolean> {
  let cached: { expiresAt: number; result: Promise<boolean> } | undefined;
  return async () => {
    const currentTime = now();
    if (cached && cached.expiresAt > currentTime) return cached.result;
    const request = new Request('http://localhost/readyz', { method: 'GET' });
    const result = proxyAllowedRequest(request, '/healthz', undefined, dependencies).then((response) => response.ok);
    cached = { expiresAt: currentTime + 30_000, result };
    return result;
  };
}
