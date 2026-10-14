import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReadinessChecker, handleGatewayRequest, handleSmokeRequest, type GatewayDependencies } from '@/lib/server/gateway';
import { healthResponse } from '@/lib/server/health';
import { startFakeCiteOtter, type FakeCiteOtter } from '../fakes/citeotter-server';

let fake: FakeCiteOtter;
let dependencies: GatewayDependencies;

function request(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Request {
  return new Request(`http://studio.local/api/engine/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
}

async function errorCode(response: Response): Promise<string> {
  const body = await response.json() as { error: { code: string } };
  return body.error.code;
}

const outputSchema = {
  type: 'object',
  properties: { title: { type: 'string' } },
  required: ['title'],
  additionalProperties: false,
};

const taskBody = {
  schema_version: '1', workflow: 'extract', goal: 'Extract the title.',
  sources: ['https://example.com/page'], allowed_actions: ['read_page'], output_schema: outputSchema,
  limits: { max_pages: 1, max_steps: 8, max_records: 10, timeout_seconds: 120 },
};
const pageMonitorBody = {
  kind: 'page', goal: 'Watch the title.', source: 'https://example.com/page',
  output_schema: outputSchema, schedule_minutes: 60, notify: 'on_change',
};
const enrichmentBody = {
  label: 'Company titles', goal: 'Extract the company title.',
  csv: 'id,url\n1,https://example.com/one\n2,https://example.org/two\n',
  source_column: 'url', id_column: 'id', output_schema: outputSchema,
};
const searchBody = { query: 'company research', seeds: ['https://example.com/start'], max_results: 10, language: 'en' };

function validPostBody(segments: readonly string[]): unknown {
  if (segments[0] === 'tasks' && segments.length <= 2) return taskBody;
  if (segments[0] === 'search') return searchBody;
  if (segments[0] === 'enrichments') return enrichmentBody;
  if (segments[0] === 'monitors' && segments.at(-1) === 'state') return { state: 'pause' };
  if (segments[0] === 'monitors' && segments.length <= 2) return pageMonitorBody;
  return undefined;
}

async function expectRejected(path: string, segments: readonly string[], body: unknown): Promise<void> {
  const response = await handleGatewayRequest(request(path, 'POST', body), segments, dependencies);
  expect(response.status).toBe(400);
  expect(fake.calls).toHaveLength(0);
}

beforeEach(async () => {
  fake = await startFakeCiteOtter();
  dependencies = {
    config: { upstreamUrl: fake.url, credentialFile: '/mounted/credential', timeoutMs: 1_000 },
    readCredential: async () => 'test-user:test-password',
  };
});

afterEach(async () => {
  await fake.close();
  vi.restoreAllMocks();
});

describe('CiteOtter gateway allowlist and credential handling', () => {
  it('returns 404 without calling upstream for an unknown route', async () => {
    const response = await handleGatewayRequest(request('admin/secrets'), ['admin', 'secrets'], dependencies);
    expect(response.status).toBe(404);
    expect(fake.calls).toHaveLength(0);
  });

  it.each([
    ['GET', ['tasks']], ['POST', ['tasks']], ['POST', ['tasks', 'validate']],
    ['GET', ['tasks', 'task-1']],
    ['GET', ['tasks', 'task-1', 'events']], ['POST', ['tasks', 'task-1', 'cancel']],
    ['POST', ['search']], ['GET', ['enrichments']], ['POST', ['enrichments']],
    ['GET', ['enrichments', 'enrichment-1']], ['GET', ['enrichments', 'enrichment-1', 'export']],
    ['GET', ['monitors']], ['POST', ['monitors']], ['POST', ['monitors', 'validate']],
    ['GET', ['monitors', 'monitor-1']], ['DELETE', ['monitors', 'monitor-1']],
    ['POST', ['monitors', 'monitor-1', 'state']], ['GET', ['monitors', 'monitor-1', 'events']],
    ['GET', ['usage']],
  ] as const)('proxies allowlisted %s /%s', async (method, segments) => {
    const body = method === 'POST' ? validPostBody(segments) : undefined;
    const response = await handleGatewayRequest(request(segments.join('/'), method, body), segments, dependencies);
    expect(response.ok).toBe(true);
  });

  it('translates the monitor state wrapper to CiteOtter pause with no upstream body', async () => {
    const response = await handleGatewayRequest(request('monitors/monitor-1/state', 'POST', { state: 'pause' }), ['monitors', 'monitor-1', 'state'], dependencies);
    expect(response.ok).toBe(true);
    expect(fake.calls[0]).toMatchObject({ path: '/v1/monitors/monitor-1/pause', body: '' });
  });

  it('never returns or logs the credential or an upstream error detail', async () => {
    const logs = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    fake.setScenario('unauthorized');
    const response = await handleGatewayRequest(request('tasks'), ['tasks'], dependencies);
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).not.toContain('test-user');
    expect(body).not.toContain('test-password');
    expect(body).not.toContain('fake detail');
    expect(logs.flatMap((spy) => spy.mock.calls).join(' ')).toBe('');
    expect(fake.calls[0]?.authorization).toBe(`Basic ${Buffer.from('test-user:test-password').toString('base64')}`);
  });

  it('rejects invalid captured IDs before any upstream request', async () => {
    const attempts = [
      ['tasks/..', ['tasks', '..']],
      ['tasks/../events', ['tasks', '..', 'events']],
      ['tasks/./events', ['tasks', '.', 'events']],
      ['monitors/../state', ['monitors', '..', 'state']],
      ['tasks/%2e%2e', ['tasks', '%2e%2e']],
      ['tasks/%2F', ['tasks', '%2F']],
    ] as const;
    for (const [path, segments] of attempts) {
      const response = await handleGatewayRequest(request(path), segments, dependencies);
      expect(response.status).toBe(404);
    }
    expect(fake.calls).toHaveLength(0);
  });

  it('does not allow deleting a task', async () => {
    const response = await handleGatewayRequest(request('tasks/task-1', 'DELETE'), ['tasks', 'task-1'], dependencies);
    expect(response.status).toBe(404);
    expect(fake.calls).toHaveLength(0);
  });

  it('forwards only validated query parameters named by the route', async () => {
    const response = await handleGatewayRequest(request('tasks?limit=25&cursor=next_page&admin=true'), ['tasks'], dependencies);
    expect(response.ok).toBe(true);
    expect(fake.calls[0]?.path).toBe('/v1/tasks?limit=25&cursor=next_page');

    const invalid = await handleGatewayRequest(request('tasks?limit=0'), ['tasks'], dependencies);
    expect(invalid.status).toBe(400);
    expect(fake.calls).toHaveLength(1);
  });
});

describe('gateway validation and failures', () => {
  it.each([
    ['tasks', ['tasks'], taskBody],
    ['monitors', ['monitors'], pageMonitorBody],
    ['enrichments', ['enrichments'], enrichmentBody],
    ['search', ['search'], searchBody],
  ] as const)('accepts a valid %s request and calls upstream once', async (path, segments, body) => {
    const response = await handleGatewayRequest(request(path, 'POST', body), segments, dependencies);
    expect(response.ok).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  it('accepts a topic monitor and notify on_change', async () => {
    const body = { kind: 'topic', query: 'product launches', schedule_minutes: 10_080, notify: 'on_change' };
    const response = await handleGatewayRequest(request('monitors', 'POST', body), ['monitors'], dependencies);
    expect(response.ok).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  it.each([
    [{ ...taskBody, limits: { ...taskBody.limits, maxPages: 1 } }],
    [{ ...taskBody, limits: { ...taskBody.limits, max_pages: 4 } }],
    [{ ...taskBody, limits: { ...taskBody.limits, max_steps: 31 } }],
    [{ ...taskBody, limits: { ...taskBody.limits, max_records: 11 } }],
    [{ ...taskBody, limits: { ...taskBody.limits, timeout_seconds: 301 } }],
    [{ ...taskBody, max_pages: 1 }],
  ])('rejects task aliases, unknown fields and bounds without calling upstream', async (body) => {
    await expectRejected('tasks', ['tasks'], body);
  });

  it.each([
    [{ ...pageMonitorBody, scheduleMinutes: 60 }],
    [{ ...pageMonitorBody, schedule_minutes: 59 }],
    [{ ...pageMonitorBody, schedule_minutes: 10_081 }],
    [{ ...pageMonitorBody, notify: 'email' }],
    [{ ...pageMonitorBody, notify: 'slack' }],
    [{ ...pageMonitorBody, threshold: 10 }],
    [{ ...pageMonitorBody, goal: 'x'.repeat(8_001) }],
    [{ kind: 'topic', query: 'x'.repeat(401), schedule_minutes: 60, notify: 'none' }],
  ])('rejects unsupported monitor fields, bounds and channels without calling upstream', async (body) => {
    await expectRejected('monitors', ['monitors'], body);
  });

  it.each([
    [{ state: 'active' }],
    [{ state: 'paused' }],
    [{ action: 'pause' }],
  ])('rejects undocumented monitor state requests without calling upstream', async (body) => {
    await expectRejected('monitors/monitor-1/state', ['monitors', 'monitor-1', 'state'], body);
  });

  it.each([
    ['http://example.com/one'],
    ['https://127.0.0.1/one'],
    ['https://localhost/one'],
    ['https://source.example/one'],
  ])('rejects enrichment source %s without calling upstream', async (source) => {
    const body = { ...enrichmentBody, csv: `id,url\n1,${source}\n2,https://example.org/two\n` };
    await expectRejected('enrichments', ['enrichments'], body);
  });

  it.each([
    [{ ...enrichmentBody, source_field: 'url' }],
    [{ ...enrichmentBody, rows: [] }],
    [{ ...enrichmentBody, limits: { max_pages: 1 } }],
    [{ ...enrichmentBody, label: 'x'.repeat(201) }],
    [{ ...enrichmentBody, goal: '' }],
    [{ ...enrichmentBody, csv: 'id,url\n1,https://example.com/one\n' }],
    [{ ...enrichmentBody, csv: `id,url\n${Array.from({ length: 11 }, (_, index) => `${index + 1},https://example.com/${index + 1}`).join('\n')}\n` }],
    [{ ...enrichmentBody, csv: `${Array.from({ length: 21 }, (_, index) => `column_${index}`).join(',')}\n${Array.from({ length: 21 }, (_, index) => index === 1 ? 'https://example.com/one' : 'a').join(',')}\n${Array.from({ length: 21 }, (_, index) => index === 1 ? 'https://example.org/two' : 'b').join(',')}\n`, source_column: 'column_1' }],
    [{ ...enrichmentBody, csv: `id,url,notes\n1,https://example.com/one,${'x'.repeat(256 * 1024)}\n2,https://example.org/two,ok\n` }],
  ])('rejects enrichment aliases, unknown fields and row bounds without calling upstream', async (body) => {
    await expectRejected('enrichments', ['enrichments'], body);
  });

  it.each([
    [{ ...searchBody, limit: 5 }],
    [{ ...searchBody, maxResults: 5 }],
    [{ ...searchBody, max_results: 21 }],
    [{ ...searchBody, seeds: ['https://localhost/start'] }],
    [{ ...searchBody, seeds: ['https://example.com/1', 'https://example.com/2', 'https://example.com/3', 'https://example.com/4'] }],
    [{ ...searchBody, query: '' }],
    [{ ...searchBody, query: 'x'.repeat(401) }],
    [{ ...searchBody, language: 'english' }],
  ])('rejects search aliases, unknown fields and bounds without calling upstream', async (body) => {
    await expectRejected('search', ['search'], body);
  });

  it.each([
    ['blocked', 'blocked'], ['unavailable', 'unavailable'], ['unauthorized', 'unavailable'],
    ['invalid', 'invalid_request'], ['capacity', 'capacity_exceeded'],
    ['conflict', 'conflict'], ['missing', 'not_found'],
  ])('maps the %s upstream failure', async (scenario, expected) => {
    fake.setScenario(scenario);
    const response = await handleGatewayRequest(request('tasks'), ['tasks'], dependencies);
    expect(await errorCode(response)).toBe(expected);
  });

  it('times out and aborts every upstream call', async () => {
    const timed = { ...dependencies, config: { ...dependencies.config!, timeoutMs: 20 } };
    fake.setScenario('timeout');
    const timedOut = await handleGatewayRequest(request('tasks'), ['tasks'], timed);
    expect(timedOut.status).toBe(504);
    expect(await errorCode(timedOut)).toBe('timeout');

    const controller = new AbortController();
    const pending = handleGatewayRequest(request('tasks', 'GET', undefined, controller.signal), ['tasks'], dependencies);
    setTimeout(() => controller.abort(), 10);
    const aborted = await pending;
    expect(aborted.status).toBe(499);
    expect(await errorCode(aborted)).toBe('cancelled');
  });

  it('never serves an upstream HTML response as HTML', async () => {
    fake.setScenario('html');
    const response = await handleGatewayRequest(request('tasks'), ['tasks'], dependencies);
    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await response.text()).not.toContain('<script>');
  });

  it('forces safe JSON and export download headers', async () => {
    const jsonResponse = await handleGatewayRequest(request('tasks'), ['tasks'], dependencies);
    expect(jsonResponse.headers.get('content-type')).toBe('application/json');
    expect(jsonResponse.headers.get('x-content-type-options')).toBe('nosniff');

    const exportResponse = await handleGatewayRequest(request('enrichments/enrichment-1/export'), ['enrichments', 'enrichment-1', 'export'], dependencies);
    expect(exportResponse.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(exportResponse.headers.get('content-disposition')).toContain('attachment');
    expect(exportResponse.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('health, readiness and bounded smoke', () => {
  it('/healthz is local and never calls upstream', async () => {
    expect(await healthResponse().json()).toEqual({ status: 'ok' });
    expect(fake.calls).toHaveLength(0);
  });

  it('/readyz caches upstream availability for 30 seconds', async () => {
    let now = 1_000;
    const checkUpstreamReadiness = createReadinessChecker(dependencies, () => now);
    expect(await checkUpstreamReadiness()).toBe(true);
    expect(await checkUpstreamReadiness()).toBe(true);
    expect(fake.calls).toHaveLength(1);

    fake.setHealthy(false);
    now += 30_000;
    expect(await checkUpstreamReadiness()).toBe(false);
    expect(fake.calls).toHaveLength(2);
  });

  it('runs one bounded public-HTTPS Extract smoke request', async () => {
    const response = await handleSmokeRequest(request('smoke/extract', 'POST', { source: 'https://example.com/page', limits: { maxPages: 1, maxRecords: 10 } }), dependencies);
    expect(response.status).toBe(201);
    expect(JSON.parse(fake.calls[0]?.body ?? '{}')).toMatchObject({ workflow: 'extract', sources: ['https://example.com/page'], limits: { max_pages: 1, max_records: 10 } });
  });

  it.each([
    [{ source: 'http://example.com/page' }, 'source'],
    [{ source: 'https://source.example/page' }, 'source'],
    [{ source: 'https://example.com/page', limits: { maxPages: 2, maxRecords: 10 } }, 'limit'],
    [{ source: 'https://example.com/page', limits: { maxPages: 1, maxRecords: 11 } }, 'limit'],
  ])('rejects an invalid smoke request', async (body, expectedMessage) => {
    const response = await handleSmokeRequest(request('smoke/extract', 'POST', body), dependencies);
    expect(response.status).toBe(400);
    expect((await response.text()).toLowerCase()).toContain(expectedMessage);
    expect(fake.calls).toHaveLength(0);
  });
});
