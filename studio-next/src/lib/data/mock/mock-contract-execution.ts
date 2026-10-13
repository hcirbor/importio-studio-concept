import type {
  CaptureArtifact,
  EnrichmentRequest,
  EvidenceItem,
  ExecutionDataset,
  ExecutionEngine,
  ExecutionFailure,
  ExecutionMonitor,
  ExecutionPlan,
  ExecutionRequest,
  ExecutionResult,
  ExecutionRun,
  ExecutionUsage,
  MonitorEvent,
  MonitorRequest,
  OperationOptions,
  RunEvent,
  RunResults,
  SearchResult,
  ValidationIssue,
  ValidationResult,
} from '@/lib/data/execution-contract';

type RunSeed = {
  outcome?: Exclude<ExecutionRun['outcome'], null>;
  records?: RunResults['records'];
  evidence?: EvidenceItem[];
  captures?: CaptureArtifact[];
  usage?: Partial<ExecutionUsage>;
};

const defaultUsage: ExecutionUsage = {
  modelRequests: 0,
  inputTokens: null,
  outputTokens: null,
  pageAttempts: 0,
  toolWallMs: 0,
  costUsd: null,
};

const failure = (code: ExecutionFailure['code'], message: string, retryable = false): ExecutionResult<never> => ({
  ok: false,
  error: { code, message, retryable },
});

function stopped(options?: OperationOptions): ExecutionResult<never> | undefined {
  if (options?.signal?.aborted) return failure('cancelled', 'Operation was cancelled.');
  if (options?.timeoutMs !== undefined && options.timeoutMs <= 0) return failure('timeout', 'Operation timed out.', true);
  return undefined;
}

export class MockContractExecutionEngine implements ExecutionEngine {
  private sequence = 0;
  private plans = new Map<string, ExecutionPlan>();
  private runs = new Map<string, ExecutionRun>();
  private seeds = new Map<string, RunSeed>();
  private datasets = new Map<string, ExecutionDataset>();
  private monitors = new Map<string, ExecutionMonitor>();
  private monitorEvents = new Map<string, MonitorEvent[]>();
  private listeners = new Map<string, Set<(event: RunEvent) => void>>();

  seedRun(runId: string, seed: RunSeed) {
    this.seeds.set(runId, seed);
  }

  async plan(request: ExecutionRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionPlan>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const plan: ExecutionPlan = {
      ...request,
      id: `plan-${this.plans.size + 1}`,
      createdAt: new Date(0).toISOString(),
      requiresHumanInput: false,
    };
    this.plans.set(plan.id, plan);
    return { ok: true, value: plan };
  }

  async validate(plan: ExecutionPlan, options?: OperationOptions): Promise<ExecutionResult<ValidationResult>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const issues: ValidationIssue[] = [];
    if (!plan.goal.trim()) issues.push({ path: 'goal', code: 'required', message: 'A goal is required.' });
    if (!plan.sources.length && !plan.workflow.startsWith('monitor-topic')) issues.push({ path: 'sources', code: 'required', message: 'At least one source is required.' });
    if (plan.limits.maxPages < 1 || plan.limits.maxRecords < 1 || plan.limits.timeoutMs < 1) issues.push({ path: 'limits', code: 'limit_exceeded', message: 'Limits must be positive.' });
    return { ok: true, value: { valid: issues.length === 0, issues } };
  }

  async startRun(plan: ExecutionPlan, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const validation = await this.validate(plan, options);
    if (!validation.ok) return validation;
    if (!validation.value.valid) return failure('invalid_request', validation.value.issues[0]?.message ?? 'Plan is invalid.');
    const run = this.newRun(plan.id, 1);
    this.runs.set(run.id, run);
    this.emit(run, 'state');
    return { ok: true, value: run };
  }

  async getRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const run = this.runs.get(runId);
    return run ? { ok: true, value: run } : failure('not_found', 'Run was not found.');
  }

  async listRuns(options?: OperationOptions): Promise<ExecutionResult<ExecutionRun[]>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    return { ok: true, value: [...this.runs.values()] };
  }

  async retryRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const previous = this.runs.get(runId);
    if (!previous) return failure('not_found', 'Run was not found.');
    if (!previous.outcome || previous.outcome === 'succeeded') return failure('conflict', 'Only terminal unsuccessful runs can be retried.');
    const retried = this.newRun(previous.planId, previous.attempt + 1);
    this.runs.set(retried.id, retried);
    this.emit(retried, 'state');
    return { ok: true, value: retried };
  }

  async cancelRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const run = this.runs.get(runId);
    if (!run) return failure('not_found', 'Run was not found.');
    if (run.state === 'completed') return failure('conflict', 'Completed runs cannot be cancelled.');
    const cancelled = this.finish(run, 'cancelled');
    this.runs.set(runId, cancelled);
    this.emit(cancelled, 'state');
    return { ok: true, value: cancelled };
  }

  subscribeRunEvents(runId: string, listener: (event: RunEvent) => void) {
    const listeners = this.listeners.get(runId) ?? new Set<(event: RunEvent) => void>();
    listeners.add(listener);
    this.listeners.set(runId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(runId);
    };
  }

  async getEvidence(runId: string, options?: OperationOptions): Promise<ExecutionResult<EvidenceItem[]>> {
    return this.runArtifact(runId, options, (seed) => seed.evidence ?? []);
  }

  async getCaptures(runId: string, options?: OperationOptions): Promise<ExecutionResult<CaptureArtifact[]>> {
    return this.runArtifact(runId, options, (seed) => seed.captures ?? []);
  }

  async getResults(runId: string, options?: OperationOptions): Promise<ExecutionResult<RunResults>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    if (!this.runs.has(runId)) return failure('not_found', 'Run was not found.');
    const run = this.runs.get(runId);
    const fields = this.plans.get(run?.planId ?? '')?.fields ?? [];
    const records = this.seeds.get(runId)?.records ?? [];
    const datasetId = records.length ? `dataset-${runId}` : null;
    if (datasetId && !this.datasets.has(datasetId)) {
      this.datasets.set(datasetId, { id: datasetId, runId, fields, records, createdAt: new Date(0).toISOString() });
    }
    return { ok: true, value: { runId, datasetId, fields, records } };
  }

  async getDataset(datasetId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionDataset>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const dataset = this.datasets.get(datasetId);
    return dataset ? { ok: true, value: dataset } : failure('not_found', 'Dataset was not found.');
  }

  async getUsage(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionUsage>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    if (!this.runs.has(runId)) return failure('not_found', 'Run was not found.');
    return { ok: true, value: { ...defaultUsage, ...this.seeds.get(runId)?.usage, costUsd: null } };
  }

  async search(query: string, options?: OperationOptions): Promise<ExecutionResult<SearchResult[]>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    return { ok: true, value: query.trim() ? [{ title: 'Example result', url: 'https://result.example', description: 'Supported public result.' }] : [] };
  }

  async startEnrichment(request: EnrichmentRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>> {
    const planned = await this.plan({ workflow: 'enrichment', goal: request.name, sources: request.rows.map((row) => row.values[request.sourceField]).filter(Boolean), fields: request.fields.map((name) => ({ name, required: true })), limits: request.limits }, options);
    return planned.ok ? this.startRun(planned.value, options) : planned;
  }

  async createMonitor(request: MonitorRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionMonitor>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    if (request.notify !== 'none' && request.notify !== 'on_change') return failure('invalid_request', 'Unsupported monitor notification mode.');
    if ((request.kind === 'page' && !request.source) || (request.kind === 'topic' && !request.query)) return failure('invalid_request', 'Monitor source or query is required.');
    const monitor: ExecutionMonitor = { ...request, id: `monitor-${this.monitors.size + 1}`, state: 'active', createdAt: new Date(0).toISOString(), baselineRunId: null };
    this.monitors.set(monitor.id, monitor);
    this.monitorEvents.set(monitor.id, []);
    return { ok: true, value: monitor };
  }

  async getMonitor(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionMonitor>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const monitor = this.monitors.get(monitorId);
    return monitor ? { ok: true, value: monitor } : failure('not_found', 'Monitor was not found.');
  }

  async pauseMonitor(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionMonitor>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const monitor = this.monitors.get(monitorId);
    if (!monitor) return failure('not_found', 'Monitor was not found.');
    const paused = { ...monitor, state: 'paused' as const };
    this.monitors.set(monitorId, paused);
    return { ok: true, value: paused };
  }

  async deleteMonitor(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<void>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    if (!this.monitors.delete(monitorId)) return failure('not_found', 'Monitor was not found.');
    this.monitorEvents.delete(monitorId);
    return { ok: true, value: undefined };
  }

  async listMonitorEvents(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<MonitorEvent[]>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    const events = this.monitorEvents.get(monitorId);
    return events ? { ok: true, value: events } : failure('not_found', 'Monitor was not found.');
  }

  completeRun(runId: string, outcome: Exclude<ExecutionRun['outcome'], null>) {
    const run = this.runs.get(runId);
    if (!run) return;
    const finished = this.finish(run, outcome);
    this.runs.set(runId, finished);
    this.emit(finished, outcome === 'succeeded' || outcome === 'partial' ? 'result' : 'failure');
  }

  recordSourceResult(runId: string, sourceUrl: string, workerId: string, verdict: NonNullable<RunEvent['verdict']>, captureId?: string) {
    const run = this.runs.get(runId);
    if (!run) return;
    this.emit(run, 'result', { sourceUrl, workerId, verdict, ...(captureId ? { captureId } : {}) });
  }

  recordMonitorRun(monitorId: string, runId: string, change: MonitorEvent['change']) {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) return;
    const event: MonitorEvent = {
      id: `monitor-event-${(this.monitorEvents.get(monitorId)?.length ?? 0) + 1}`,
      monitorId,
      runId,
      change,
      notified: monitor.notify === 'on_change' && change === 'changed',
      occurredAt: new Date(0).toISOString(),
    };
    this.monitorEvents.get(monitorId)?.push(event);
  }

  private newRun(planId: string, attempt: number): ExecutionRun {
    return { id: `run-${this.runs.size + 1}`, planId, attempt, state: 'running', outcome: null, createdAt: new Date(0).toISOString(), startedAt: new Date(0).toISOString(), finishedAt: null, usage: defaultUsage, failure: null };
  }

  private finish(run: ExecutionRun, outcome: Exclude<ExecutionRun['outcome'], null>): ExecutionRun {
    const failed = ['blocked', 'unavailable', 'timeout', 'cancelled'].includes(outcome);
    return { ...run, state: 'completed', outcome, finishedAt: new Date(1).toISOString(), failure: failed ? { code: outcome as ExecutionFailure['code'], message: `Run ended: ${outcome}.`, retryable: outcome === 'unavailable' || outcome === 'timeout' } : null };
  }

  private emit(run: ExecutionRun, type: RunEvent['type'], detail: Pick<RunEvent, 'sourceUrl' | 'workerId'> & Partial<Pick<RunEvent, 'captureId' | 'verdict'>> = { sourceUrl: null, workerId: null }) {
    const event: RunEvent = { id: `event-${this.sequence + 1}`, runId: run.id, sequence: this.sequence += 1, occurredAt: new Date(this.sequence).toISOString(), type, state: run.state, outcome: run.outcome, ...detail };
    this.listeners.get(run.id)?.forEach((listener) => listener(event));
  }

  private async runArtifact<T>(runId: string, options: OperationOptions | undefined, select: (seed: RunSeed) => T): Promise<ExecutionResult<T>> {
    const interrupted = stopped(options);
    if (interrupted) return interrupted;
    if (!this.runs.has(runId)) return failure('not_found', 'Run was not found.');
    return { ok: true, value: select(this.seeds.get(runId) ?? {}) };
  }
}
