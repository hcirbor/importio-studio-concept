import { once } from 'node:events';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export type FakeCall = {
  method: string;
  path: string;
  authorization: string | undefined;
  body: string;
};

export type FakeCiteOtter = {
  url: URL;
  calls: FakeCall[];
  setHealthy(value: boolean): void;
  setScenario(value: string | undefined): void;
  close(): Promise<void>;
};

async function bodyOf(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

export async function startFakeCiteOtter(): Promise<FakeCiteOtter> {
  let healthy = true;
  let scenario: string | undefined;
  const calls: FakeCall[] = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake.local');
    const body = await bodyOf(request);
    calls.push({ method: request.method ?? 'GET', path: `${url.pathname}${url.search}`, authorization: request.headers.authorization, body });

    if (request.headers.authorization !== `Basic ${Buffer.from('test-user:test-password').toString('base64')}`) {
      json(response, 401, { code: 'unauthorized', detail: 'credential rejected' });
      return;
    }
    if (url.pathname === '/healthz') {
      json(response, healthy ? 200 : 503, { status: healthy ? 'ok' : 'down' });
      return;
    }

    if (scenario === 'timeout') {
      setTimeout(() => json(response, 200, { id: 'late-task' }), 250);
      return;
    }
    if (scenario === 'html') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<script>window.pwned = true</script>');
      return;
    }
    const failures: Record<string, [number, string]> = {
      blocked: [422, 'blocked'],
      unavailable: [503, 'unavailable'],
      unauthorized: [401, 'unauthorized'],
      invalid: [422, 'invalid_request'],
      capacity: [429, 'capacity_exceeded'],
      conflict: [409, 'conflict'],
      missing: [404, 'not_found'],
    };
    if (scenario && failures[scenario]) {
      const [status, code] = failures[scenario];
      json(response, status, { error: { code, detail: 'fake detail must not be returned' } });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/v1/tasks/validate') json(response, 200, { valid: true, issues: [] });
    else if (request.method === 'POST' && url.pathname === '/v1/tasks') json(response, 201, { id: 'task-1', state: 'queued' });
    else if (request.method === 'GET' && url.pathname === '/v1/tasks') json(response, 200, { tasks: [] });
    else if (/^\/v1\/tasks\/[^/]+\/events$/.test(url.pathname)) json(response, 200, { events: [] });
    else if (/^\/v1\/tasks\/[^/]+\/cancel$/.test(url.pathname)) json(response, 200, { id: 'task-1', state: 'cancelled' });
    else if (/^\/v1\/tasks\/[^/]+$/.test(url.pathname)) json(response, 200, { id: 'task-1', state: 'running' });
    else if (request.method === 'POST' && url.pathname === '/v1/search') json(response, 200, { results: [] });
    else if (request.method === 'POST' && url.pathname === '/v1/monitors/validate') json(response, 200, { valid: true, issues: [] });
    else if (/^\/v1\/monitors(\/.*)?$/.test(url.pathname)) json(response, 200, { monitors: [], id: 'monitor-1' });
    else if (/^\/v1\/enrichments\/[^/]+\/export$/.test(url.pathname)) {
      response.writeHead(200, { 'content-type': 'text/csv' });
      response.end('name,value\nExample,1\n');
    }
    else if (/^\/v1\/enrichments(\/.*)?$/.test(url.pathname)) json(response, 200, { enrichments: [], id: 'enrichment-1' });
    else if (url.pathname === '/v1/usage') json(response, 200, { model_requests: 0, cost_usd: null });
    else json(response, 404, { code: 'not_found' });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fake server did not bind a TCP port.');
  return {
    url: new URL(`http://127.0.0.1:${address.port}`),
    calls,
    setHealthy(value) { healthy = value; },
    setScenario(value) { scenario = value; },
    async close() {
      server.close();
      await once(server, 'close');
    },
  };
}
