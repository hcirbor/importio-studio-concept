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
    const body = method === 'POST' ? { workflow: 'extract', sources: ['https://example.com/page'], limits: { max_pages: 1, max_records: 1 } } : undefined;
    const response = await handleGatewayRequest(request(segments.join('/'), method, body), segments, dependencies);
    expect(response.ok).toBe(true);
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
    [{ workflow: 'extract', sources: ['http://public.example'], limits: { max_pages: 1, max_records: 1 } }, 'source'],
    [{ workflow: 'extract', sources: ['https://127.0.0.1/page'], limits: { max_pages: 1, max_records: 1 } }, 'source'],
    [{ workflow: 'extract', sources: ['https://100.64.0.1/page'], limits: { max_pages: 1, max_records: 1 } }, 'source'],
    [{ workflow: 'collect', sources: ['https://example.com/one', 'https://example.com/two', 'https://example.com/three', 'https://example.com/four'], limits: { max_pages: 3, max_records: 1 } }, 'source'],
    [{ workflow: 'collect', sources: ['https://example.com/one'], limits: { max_pages: 1, max_records: 11 } }, 'limit'],
    [{ workflow: 'extract', sources: ['https://example.com'], limits: { maxPages: 1 } }, 'recognised'],
    [{ workflow: 'extract', sources: ['https://example.com'], max_pages: 1 }, 'recognised'],
    [{ source: 'https://example.com', notify: 'on_change' }, 'contract field'],
  ])('rejects unsupported limits', async (body, expectedMessage) => {
    const response = await handleGatewayRequest(request('tasks', 'POST', body), ['tasks'], dependencies);
    expect(response.status).toBe(400);
    expect((await response.text()).toLowerCase()).toContain(expectedMessage);
    expect(fake.calls).toHaveLength(0);
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
