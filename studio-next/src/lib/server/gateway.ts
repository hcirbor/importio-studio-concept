import 'server-only';

import { readFile } from 'node:fs/promises';
import type { ExecutionFailure, ExecutionFailureCode } from '@/lib/data/execution-contract';
import { readGatewayConfig, type GatewayConfig } from '@/lib/server/gateway-config';
import { validateGatewayLimits, type JsonObject } from '@/lib/server/request-limits';

const MAX_REQUEST_BYTES = 1_000_000;
const MAX_RESPONSE_BYTES = 5_000_000;

type RouteRule = {
  method: string;
  pattern: RegExp;
  upstreamPath: (match: RegExpMatchArray) => string;
  validatesLimits?: boolean;
};

const ROUTES: readonly RouteRule[] = [
  { method: 'GET', pattern: /^tasks$/, upstreamPath: () => '/v1/tasks' },
  { method: 'POST', pattern: /^tasks$/, upstreamPath: () => '/v1/tasks', validatesLimits: true },
  { method: 'POST', pattern: /^tasks\/validate$/, upstreamPath: () => '/v1/tasks/validate', validatesLimits: true },
  { method: 'GET', pattern: /^tasks\/([^/]+)$/, upstreamPath: (match) => `/v1/tasks/${encodeURIComponent(match[1] ?? '')}` },
  { method: 'DELETE', pattern: /^tasks\/([^/]+)$/, upstreamPath: (match) => `/v1/tasks/${encodeURIComponent(match[1] ?? '')}` },
  { method: 'GET', pattern: /^tasks\/([^/]+)\/events$/, upstreamPath: (match) => `/v1/tasks/${encodeURIComponent(match[1] ?? '')}/events` },
  { method: 'POST', pattern: /^tasks\/([^/]+)\/cancel$/, upstreamPath: (match) => `/v1/tasks/${encodeURIComponent(match[1] ?? '')}/cancel` },
  { method: 'POST', pattern: /^search$/, upstreamPath: () => '/v1/search', validatesLimits: true },
  { method: 'GET', pattern: /^enrichments$/, upstreamPath: () => '/v1/enrichments' },
  { method: 'POST', pattern: /^enrichments$/, upstreamPath: () => '/v1/enrichments', validatesLimits: true },
  { method: 'GET', pattern: /^enrichments\/([^/]+)$/, upstreamPath: (match) => `/v1/enrichments/${encodeURIComponent(match[1] ?? '')}` },
  { method: 'GET', pattern: /^enrichments\/([^/]+)\/export$/, upstreamPath: (match) => `/v1/enrichments/${encodeURIComponent(match[1] ?? '')}/export` },
  { method: 'GET', pattern: /^monitors$/, upstreamPath: () => '/v1/monitors' },
  { method: 'POST', pattern: /^monitors$/, upstreamPath: () => '/v1/monitors', validatesLimits: true },
  { method: 'POST', pattern: /^monitors\/validate$/, upstreamPath: () => '/v1/monitors/validate', validatesLimits: true },
  { method: 'GET', pattern: /^monitors\/([^/]+)$/, upstreamPath: (match) => `/v1/monitors/${encodeURIComponent(match[1] ?? '')}` },
  { method: 'DELETE', pattern: /^monitors\/([^/]+)$/, upstreamPath: (match) => `/v1/monitors/${encodeURIComponent(match[1] ?? '')}` },
  { method: 'POST', pattern: /^monitors\/([^/]+)\/state$/, upstreamPath: (match) => `/v1/monitors/${encodeURIComponent(match[1] ?? '')}/state`, validatesLimits: true },
  { method: 'GET', pattern: /^monitors\/([^/]+)\/events$/, upstreamPath: (match) => `/v1/monitors/${encodeURIComponent(match[1] ?? '')}/events` },
  { method: 'GET', pattern: /^usage$/, upstreamPath: () => '/v1/usage' },
];

export type GatewayDependencies = {
  config?: GatewayConfig;
  fetchImpl?: typeof fetch;
  readCredential?: (path: string) => Promise<string>;
};

function jsonFailure(status: number, failure: ExecutionFailure): Response {
  return Response.json({ error: failure }, { status });
}

function failure(code: ExecutionFailureCode, message: string, retryable: boolean, path?: string): ExecutionFailure {
  return { code, message, retryable, ...(path ? { path } : {}) };
}

function findRoute(method: string, segments: readonly string[]): { rule: RouteRule; match: RegExpMatchArray } | null {
  const path = segments.join('/');
  for (const rule of ROUTES) {
    if (rule.method !== method) continue;
    const match = path.match(rule.pattern);
    if (match) return { rule, match };
  }
  return null;
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

async function proxyAllowedRequest(request: Request, upstreamPath: string, bodyBytes: Uint8Array | undefined, dependencies: GatewayDependencies): Promise<Response> {
  const config = dependencies.config ?? readGatewayConfig();
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const credentialReader = dependencies.readCredential ?? ((path: string) => readFile(path, 'utf8'));
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
    const upstreamUrl = new URL(upstreamPath, config.upstreamUrl);
    upstreamUrl.search = new URL(request.url).search;
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
    return new Response(Buffer.from(bytes), {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
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

  let bytes: Uint8Array | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const parsed = await readJsonBody(request);
    if (parsed instanceof Response) return parsed;
    bytes = parsed.bytes;
    if (route.rule.validatesLimits) {
      const failures = validateGatewayLimits(parsed.body);
      const first = failures[0];
      if (first) return jsonFailure(400, failure('invalid_request', first.message, false, first.path));
    }
  }
  return proxyAllowedRequest(request, route.rule.upstreamPath(route.match), bytes, dependencies);
}

export async function handleSmokeRequest(request: Request, dependencies: GatewayDependencies = {}): Promise<Response> {
  if (request.method !== 'POST') return jsonFailure(404, failure('not_found', 'Gateway route not found.', false));
  if (!sameOrigin(request)) return jsonFailure(403, failure('invalid_request', 'Cross-origin requests are not allowed.', false));
  const parsed = await readJsonBody(request);
  if (parsed instanceof Response) return parsed;
  const source = parsed.body.source;
  const fields = Array.isArray(parsed.body.fields) ? parsed.body.fields : [];
  const task: JsonObject = {
    workflow: 'extract',
    goal: typeof parsed.body.goal === 'string' ? parsed.body.goal : 'Verify the bounded production extraction path.',
    sources: typeof source === 'string' ? [source] : [],
    fields,
    limits: { maxPages: 1, maxRecords: 10 },
  };
  const failures = typeof source === 'string' ? validateGatewayLimits(task) : [{ path: 'source', message: 'One public HTTPS source is required.' }];
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

export async function checkUpstreamReadiness(dependencies: GatewayDependencies = {}): Promise<boolean> {
  const request = new Request('http://localhost/readyz', { method: 'GET' });
  const response = await proxyAllowedRequest(request, '/healthz', undefined, dependencies);
  return response.ok;
}
