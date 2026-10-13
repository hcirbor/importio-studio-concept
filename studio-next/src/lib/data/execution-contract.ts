type ExecutionWorkflow = 'extract' | 'research' | 'collect' | 'enrichment' | 'monitor-page' | 'monitor-topic';

type ExecutionLimits = {
  maxPages: number;
  maxRecords: number;
  timeoutMs: number;
};

export type ExecutionRequest = {
  workflow: ExecutionWorkflow;
  goal: string;
  sources: string[];
  fields: string[];
  limits: ExecutionLimits;
};

export type ExecutionPlan = ExecutionRequest & {
  id: string;
  createdAt: string;
  requiresHumanInput: boolean;
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

type RunState = 'queued' | 'running' | 'needs-input' | 'canceling' | 'completed';
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
  type: 'state' | 'progress' | 'human-input' | 'result' | 'failure';
  state: RunState;
  outcome: RunOutcome;
  message?: string;
};

export type EvidenceItem = {
  id: string;
  runId: string;
  recordId: string;
  field: string;
  sourceUrl: string;
  quote: string;
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

export type HumanReviewInput = {
  id: string;
  runId: string;
  prompt: string;
  choices: string[];
  state: 'open' | 'decided';
  decision: string | null;
};

export type HumanReviewDecision = {
  inputId: string;
  choice: string;
  decidedAt: string;
};

type ExecutionRecord = {
  id: string;
  values: Record<string, string | number | boolean | null>;
  evidenceIds: Record<string, string[]>;
};

export type ExecutionDataset = {
  id: string;
  runId: string;
  fields: string[];
  records: ExecutionRecord[];
  createdAt: string;
};

export type RunResults = {
  runId: string;
  datasetId: string | null;
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

export interface ExecutionEngine {
  plan(request: ExecutionRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionPlan>>;
  validate(plan: ExecutionPlan, options?: OperationOptions): Promise<ExecutionResult<ValidationResult>>;
  startRun(plan: ExecutionPlan, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  getRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  retryRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  cancelRun(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  subscribeRunEvents(runId: string, listener: (event: RunEvent) => void): () => void;
  getEvidence(runId: string, options?: OperationOptions): Promise<ExecutionResult<EvidenceItem[]>>;
  getCaptures(runId: string, options?: OperationOptions): Promise<ExecutionResult<CaptureArtifact[]>>;
  getHumanReviewInputs(runId: string, options?: OperationOptions): Promise<ExecutionResult<HumanReviewInput[]>>;
  decideHumanReview(decision: HumanReviewDecision, options?: OperationOptions): Promise<ExecutionResult<HumanReviewInput>>;
  getResults(runId: string, options?: OperationOptions): Promise<ExecutionResult<RunResults>>;
  getDataset(datasetId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionDataset>>;
  getUsage(runId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionUsage>>;
  startEnrichment(request: EnrichmentRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionRun>>;
  createMonitor(request: MonitorRequest, options?: OperationOptions): Promise<ExecutionResult<ExecutionMonitor>>;
  getMonitor(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<ExecutionMonitor>>;
  listMonitorEvents(monitorId: string, options?: OperationOptions): Promise<ExecutionResult<MonitorEvent[]>>;
}
