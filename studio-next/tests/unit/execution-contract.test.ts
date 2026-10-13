import { describe, expect, it } from 'vitest';
import type { ExecutionPlan, ExecutionRequest, ExecutionResult, HumanReviewInput } from '@/lib/data/execution-contract';
import { MockContractExecutionEngine } from '@/lib/data/mock/mock-contract-execution';

const request: ExecutionRequest = {
  workflow: 'extract',
  goal: 'Extract supported product facts.',
  sources: ['https://shop.example/product'],
  fields: ['name', 'price'],
  limits: { maxPages: 3, maxRecords: 10, timeoutMs: 300_000 },
};

function value<T>(result: ExecutionResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function plan(engine: MockContractExecutionEngine, overrides: Partial<ExecutionRequest> = {}): Promise<ExecutionPlan> {
  return value(await engine.plan({ ...request, ...overrides }));
}

describe('production ExecutionEngine contract', () => {
  it.each(['extract', 'research', 'collect', 'enrichment', 'monitor-page', 'monitor-topic'] as const)(
    'plans and validates %s work',
    async (workflow) => {
      const engine = new MockContractExecutionEngine();
      const planned = await plan(engine, { workflow });
      expect(value(await engine.validate(planned))).toEqual({ valid: true, issues: [] });
    },
  );

  it('returns structured validation issues and operation failures', async () => {
    const engine = new MockContractExecutionEngine();
    const invalid = await plan(engine, { goal: '', sources: [], limits: { maxPages: 0, maxRecords: 0, timeoutMs: 0 } });
    const validation = value(await engine.validate(invalid));
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.path)).toEqual(['goal', 'sources', 'limits']);

    const timedOut = await engine.plan(request, { timeoutMs: 0 });
    expect(timedOut).toEqual({ ok: false, error: { code: 'timeout', message: 'Operation timed out.', retryable: true } });
    const controller = new AbortController();
    controller.abort();
    expect(await engine.plan(request, { signal: controller.signal })).toEqual({ ok: false, error: { code: 'cancelled', message: 'Operation was cancelled.', retryable: false } });
  });

  it('publishes ordered lifecycle events and supports cancellation and retry', async () => {
    const engine = new MockContractExecutionEngine();
    const started = value(await engine.startRun(await plan(engine)));
    const events: string[] = [];
    const unsubscribe = engine.subscribeRunEvents(started.id, (event) => events.push(`${event.sequence}:${event.type}:${event.outcome}`));
    const cancelled = value(await engine.cancelRun(started.id));
    const retried = value(await engine.retryRun(started.id));
    unsubscribe();

    expect(cancelled.outcome).toBe('cancelled');
    expect(cancelled.failure).toMatchObject({ code: 'cancelled', retryable: false });
    expect(retried).toMatchObject({ attempt: 2, state: 'running', outcome: null });
    expect(events).toEqual(['2:state:cancelled']);
  });

  it.each([
    ['blocked', false],
    ['unavailable', true],
    ['timeout', true],
    ['partial', false],
    ['succeeded', false],
  ] as const)('represents terminal %s outcomes', async (outcome, retryable) => {
    const engine = new MockContractExecutionEngine();
    const started = value(await engine.startRun(await plan(engine)));
    engine.completeRun(started.id, outcome);
    const run = value(await engine.getRun(started.id));
    expect(run).toMatchObject({ state: 'completed', outcome });
    if (['blocked', 'unavailable', 'timeout'].includes(outcome)) expect(run.failure?.retryable).toBe(retryable);
    else expect(run.failure).toBeNull();
  });

  it('retains result, evidence, capture and dataset records with explicit nulls', async () => {
    const engine = new MockContractExecutionEngine();
    const started = value(await engine.startRun(await plan(engine)));
    engine.seedRun(started.id, {
      records: [{ id: 'record-1', values: { name: 'Trailhead', price: null }, evidenceIds: { name: ['evidence-1'], price: [] } }],
      evidence: [{ id: 'evidence-1', runId: started.id, recordId: 'record-1', field: 'name', sourceUrl: 'https://shop.example/product', quote: 'Trailhead tent', retainedAt: new Date(0).toISOString() }],
      captures: [{ id: 'capture-1', runId: started.id, sourceUrl: 'https://shop.example/product', kind: 'html', state: 'retained', retainedAt: new Date(0).toISOString() }],
    });
    engine.completeRun(started.id, 'partial');

    const results = value(await engine.getResults(started.id));
    expect(results.records[0]?.values.price).toBeNull();
    expect(value(await engine.getEvidence(started.id))).toHaveLength(1);
    expect(value(await engine.getCaptures(started.id))).toHaveLength(1);
    expect(value(await engine.getDataset(results.datasetId ?? 'missing')).records).toEqual(results.records);
  });

  it('records human-review decisions without changing the run outcome', async () => {
    const engine = new MockContractExecutionEngine();
    const started = value(await engine.startRun(await plan(engine)));
    const input: HumanReviewInput = { id: 'input-1', runId: started.id, prompt: 'Allow the cookie choice?', choices: ['allow', 'skip'], state: 'open', decision: null };
    engine.seedRun(started.id, { humanInputs: [input] });

    const decided = value(await engine.decideHumanReview({ inputId: input.id, choice: 'skip', decidedAt: new Date(0).toISOString() }));
    expect(decided).toMatchObject({ state: 'decided', decision: 'skip' });
    expect(value(await engine.getRun(started.id))).toMatchObject({ state: 'running', outcome: null });
  });

  it('keeps measured usage while costUsd is always unknown', async () => {
    const engine = new MockContractExecutionEngine();
    const started = value(await engine.startRun(await plan(engine)));
    engine.seedRun(started.id, { usage: { modelRequests: 2, inputTokens: 120, outputTokens: 24, pageAttempts: 1, toolWallMs: 850 } });
    expect(value(await engine.getUsage(started.id))).toEqual({ modelRequests: 2, inputTokens: 120, outputTokens: 24, pageAttempts: 1, toolWallMs: 850, costUsd: null });
  });

  it('starts bounded enrichment runs', async () => {
    const engine = new MockContractExecutionEngine();
    const run = value(await engine.startEnrichment({ name: 'Enrich companies', sourceField: 'url', rows: [{ id: '1', values: { url: 'https://company.example' } }], fields: ['category'], limits: request.limits }));
    expect(run).toMatchObject({ state: 'running', outcome: null, attempt: 1 });
  });

  it('notifies on monitor changes only when on_change is configured', async () => {
    const engine = new MockContractExecutionEngine();
    const changed = value(await engine.createMonitor({ kind: 'page', goal: 'Watch price', source: 'https://shop.example/product', fields: ['price'], scheduleMinutes: 60, notify: 'on_change' }));
    const quiet = value(await engine.createMonitor({ kind: 'topic', goal: 'Watch news', query: 'Example launch', fields: ['title'], scheduleMinutes: 60, notify: 'none' }));
    engine.recordMonitorRun(changed.id, 'run-1', 'unchanged');
    engine.recordMonitorRun(changed.id, 'run-2', 'changed');
    engine.recordMonitorRun(quiet.id, 'run-3', 'changed');

    expect(value(await engine.listMonitorEvents(changed.id)).map((event) => event.notified)).toEqual([false, true]);
    expect(value(await engine.listMonitorEvents(quiet.id))[0]?.notified).toBe(false);
  });
});
