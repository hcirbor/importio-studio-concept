import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkUpstreamReadiness, handleGatewayRequest, handleSmokeRequest, type GatewayDependencies } from '@/lib/server/gateway';
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
    ['GET', ['tasks', 'task-1']], ['DELETE', ['tasks', 'task-1']],
    ['GET', ['tasks', 'task-1', 'events']], ['POST', ['tasks', 'task-1', 'cancel']],
    ['POST', ['search']], ['GET', ['enrichments']], ['POST', ['enrichments']],
    ['GET', ['enrichments', 'enrichment-1']], ['GET', ['enrichments', 'enrichment-1', 'export']],
    ['GET', ['monitors']], ['POST', ['monitors']], ['POST', ['monitors', 'validate']],
    ['GET', ['monitors', 'monitor-1']], ['DELETE', ['monitors', 'monitor-1']],
    ['POST', ['monitors', 'monitor-1', 'state']], ['GET', ['monitors', 'monitor-1', 'events']],
    ['GET', ['usage']],
  ] as const)('proxies allowlisted %s /%s', async (method, segments) => {
    const body = method === 'POST' ? { workflow: 'extract', sources: ['https://example.com/page'], limits: { maxPages: 1, maxRecords: 1 }, notify: 'none' } : undefined;
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
    const response = await handleGatewayRequest(request('tasks?case=unauthorized'), ['tasks'], dependencies);
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).not.toContain('test-user');
    expect(body).not.toContain('test-password');
    expect(body).not.toContain('fake detail');
    expect(logs.flatMap((spy) => spy.mock.calls).join(' ')).toBe('');
    expect(fake.calls[0]?.authorization).toBe(`Basic ${Buffer.from('test-user:test-password').toString('base64')}`);
  });
});

describe('gateway validation and failures', () => {
  it.each([
    [{ workflow: 'extract', sources: ['http://public.example'], limits: { maxPages: 1, maxRecords: 1 } }, 'source'],
    [{ workflow: 'extract', sources: ['https://127.0.0.1/page'], limits: { maxPages: 1, maxRecords: 1 } }, 'source'],
    [{ workflow: 'extract', sources: ['https://100.64.0.1/page'], limits: { maxPages: 1, maxRecords: 1 } }, 'source'],
    [{ workflow: 'collect', sources: ['https://example.com/one', 'https://example.com/two', 'https://example.com/three', 'https://example.com/four'], limits: { maxPages: 4, maxRecords: 1 } }, 'limit'],
    [{ workflow: 'collect', sources: ['https://example.com/one'], limits: { maxPages: 1, maxRecords: 11 } }, 'limit'],
    [{ sourceField: 'url', rows: [{ values: { url: 'http://example.com' } }], limits: { maxPages: 1, maxRecords: 1 } }, 'source'],
    [{ source: 'https://example.com', notify: 'email' }, 'notification'],
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
    const response = await handleGatewayRequest(request(`tasks?case=${scenario}`), ['tasks'], dependencies);
    expect(await errorCode(response)).toBe(expected);
  });

  it('times out and aborts every upstream call', async () => {
    const timed = { ...dependencies, config: { ...dependencies.config!, timeoutMs: 20 } };
    const timedOut = await handleGatewayRequest(request('tasks?case=timeout'), ['tasks'], timed);
    expect(timedOut.status).toBe(504);
    expect(await errorCode(timedOut)).toBe('timeout');

    const controller = new AbortController();
    const pending = handleGatewayRequest(request('tasks?case=timeout', 'GET', undefined, controller.signal), ['tasks'], dependencies);
    setTimeout(() => controller.abort(), 10);
    const aborted = await pending;
    expect(aborted.status).toBe(499);
    expect(await errorCode(aborted)).toBe('cancelled');
  });
});

describe('health, readiness and bounded smoke', () => {
  it('/healthz is local and never calls upstream', async () => {
    expect(await healthResponse().json()).toEqual({ status: 'ok' });
    expect(fake.calls).toHaveLength(0);
  });

  it('/readyz reflects fake-upstream availability without exposing details', async () => {
    expect(await checkUpstreamReadiness(dependencies)).toBe(true);
    fake.setHealthy(false);
    expect(await checkUpstreamReadiness(dependencies)).toBe(false);
  });

  it('runs one bounded public-HTTPS Extract smoke request', async () => {
    const response = await handleSmokeRequest(request('smoke/extract', 'POST', { source: 'https://example.com/page', limits: { maxPages: 1, maxRecords: 10 } }), dependencies);
    expect(response.status).toBe(201);
    expect(JSON.parse(fake.calls[0]?.body ?? '{}')).toMatchObject({ workflow: 'extract', sources: ['https://example.com/page'], limits: { maxPages: 1, maxRecords: 10 } });
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
