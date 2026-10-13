type ExecutionWorkflow = 'extract' | 'research' | 'collect' | 'enrichment' | 'monitor-page' | 'monitor-topic';
type FieldVerdict = 'supported' | 'not_stated' | 'conflicting' | 'unknown' | 'not_run';
type ExecutionField = { name: string; required: boolean };

type ExecutionLimits = {
  maxPages: number;
  maxRecords: number;
  timeoutMs: number;
};

export type ExecutionRequest = {
  workflow: ExecutionWorkflow;
  goal: string;
  sources: string[];
  fields: ExecutionField[];
  limits: ExecutionLimits;
};

export type ExecutionPlan = ExecutionRequest & {
  id: string;
  createdAt: string;
};

export type ValidationIssue = {
  path: string;
  code: 'required' | 'unsupported' | 'limit_exceeded' | 'invalid_source';
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

type ExecutionFailureCode =
  | 'blocked'
  | 'unavailable'
  | 'timeout'
  | 'cancelled'
  | 'invalid_request'
  | 'capacity_exceeded'
  | 'conflict'
  | 'not_found';

export type ExecutionFailure = {
  code: ExecutionFailureCode;
  message: string;
  retryable: boolean;
  path?: string;
};

export type ExecutionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ExecutionFailure };

export type OperationOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

type RunState = 'queued' | 'running' | 'canceling' | 'completed';
type RunOutcome = 'succeeded' | 'partial' | 'blocked' | 'unavailable' | 'timeout' | 'cancelled' | null;

export type ExecutionUsage = {
  modelRequests: number;
  inputTokens: number | null;
  outputTokens: number | null;
  pageAttempts: number;
  toolWallMs: number;
  costUsd: null;
};

export type ExecutionRun = {
  id: string;
  planId: string;
  attempt: number;
  state: RunState;
  outcome: RunOutcome;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  usage: ExecutionUsage;
  failure: ExecutionFailure | null;
};

export type RunEvent = {
  id: string;
  runId: string;
  sequence: number;
  occurredAt: string;
  type: 'state' | 'progress' | 'result' | 'failure';
  state: RunState;
  outcome: RunOutcome;
  sourceUrl: string | null;
  workerId: string | null;
  captureId?: string;
  verdict?: FieldVerdict;
  message?: string;
};

export type EvidenceItem = {
  id: string;
  runId: string;
  recordId: string;
  field: string;
  sourceUrl: string;
  quote: string;
  verdict: FieldVerdict;
  retainedAt: string;
};

export type CaptureArtifact = {
  id: string;
  runId: string;
  sourceUrl: string;
  kind: 'html' | 'screenshot' | 'recording';
  state: 'retained' | 'unavailable';
  retainedAt: string | null;
};

type ExecutionRecord = {
  id: string;
  fields: Record<string, {
    value: string | number | boolean | null;
    verdict: FieldVerdict;
    evidenceIds: string[];
  }>;
};

export type ExecutionDataset = {
  id: string;
  runId: string;
  fields: ExecutionField[];
  records: ExecutionRecord[];
  createdAt: string;
};

export type RunResults = {
  runId: string;
  datasetId: string | null;
  fields: ExecutionField[];
  records: ExecutionRecord[];
};

export type EnrichmentRequest = {
  name: string;
  sourceField: string;
  rows: Array<{ id: string; values: Record<string, string> }>;
  fields: string[];
  limits: ExecutionLimits;
};

type MonitorNotification = 'none' | 'on_change';
export type MonitorRequest = {
  kind: 'page' | 'topic';
  goal: string;
  source?: string;
  query?: string;
  fields: string[];
  scheduleMinutes: number;
  notify: MonitorNotification;
};

export type ExecutionMonitor = MonitorRequest & {
  id: string;
  state: 'active' | 'paused';
  createdAt: string;
  baselineRunId: string | null;
};

export type MonitorEvent = {
  id: string;
  monitorId: string;
  runId: string;
  change: 'changed' | 'unchanged' | 'failed';
  notified: boolean;
  occurredAt: string;
};

export type SearchResult = {
  title: string;
  url: string;
  description: string;
};

export type AcceptedUnknownField = {
  recordId: string;
  field: string;
};

export function deriveStudioOutcome(run: ExecutionRun, results: RunResults, acceptedUnknowns: readonly AcceptedUnknownField[] = []): RunOutcome {
  if (run.failure) return run.outcome;
  if (run.state !== 'completed') return null;
  const required = results.fields.filter((field) => field.required);
  if (!results.records.length && required.length) return 'partial';
  const accepted = new Set(acceptedUnknowns.map(({ recordId, field }) => JSON.stringify([recordId, field])));
  let resolvedByAcceptance = false;
  const unresolved = results.records.some((record) => required.some((field) => {
    const verdict = record.fields[field.name]?.verdict;
    if (verdict === 'supported') return false;
    const acceptedUnknown = (verdict === 'unknown' || verdict === 'not_stated')
      && accepted.has(JSON.stringify([record.id, field.name]));
    if (acceptedUnknown) resolvedByAcceptance = true;
    return !acceptedUnknown;
  }));
  if (unresolved) return 'partial';
  if (run.outcome === 'partial' && !resolvedByAcceptance) return 'partial';
  return 'succeeded';
}

export interface ExecutionEngine {
  plan(request: ExecutionRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionPlan>>;
  validate(plan: ExecutionPlan, options?: OperationOptions): Promise<ExecutionResult<ValidationResult>>;
  startRun(plan: ExecutionPlan, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  getRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  listRuns(options?: OperationOptions): Promise<ExecutionResult<ExecutionRun[]>>;
  retryRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  cancelRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  subscribeRunEvents(runId: string, listener: (event: RunEvent) => void): () => void;
  getEvidence(runId: string, options?: OperationOptions): Promise<ExecutionResult<EvidenceItem[]>>;
  getCaptures(runId: string, options?: OperationOptions): Promise<ExecutionResult<CaptureArtifact[]>>;
  getResults(runId: string, options?: OperationOptions): Promise<ExecutionResult<RunResults>>;
  getDataset(datasetId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionDataset>>;
  getUsage(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionUsage>>;
  search(query: string, options?: OperationOptions): Promise<ExecutionResult<SearchResult[]>>;
  startEnrichment(request: EnrichmentRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  createMonitor(request: MonitorRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionMonitor>>;
  getMonitor(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionMonitor>>;
  pauseMonitor(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionMonitor>>;
  deleteMonitor(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<void>>;
  listMonitorEvents(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<MonitorEvent[]>>;
}
