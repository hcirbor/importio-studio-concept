export const ROLE_VALUES = ['Owner', 'Admin', 'Editor', 'Viewer'] as const;
export type Role = (typeof ROLE_VALUES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLE_VALUES.some((role) => role === value);
}
export type PermissionAction = 'run' | 'review' | 'promote' | 'create_monitor' | 'create_dataset' | 'manage_members' | 'assign_owner' | 'manage_api_keys' | 'manage_webhooks' | 'manage_billing' | 'delete_workspace';

export type AuthUser = { id: string; name: string; email: string };
export type Workspace = { id: string; name: string; subtitle: string; role: Role; empty?: boolean };
export type Member = { id: string; name: string; email: string; role: Role; lastActive: string; status?: 'Invited' };
export type WorkspaceRun = {
  id: string;
  href: string;
  when: string;
  createdAt?: number;
  pipeline: string;
  coverage: string;
  records: string;
  queries: number;
  state: 'Running' | 'Completed' | 'Failed';
  outcome: 'Running' | 'Succeeded' | 'Partial' | 'Blocked';
  tone: 'info' | 'success' | 'warning' | 'danger';
  badge?: boolean;
  defaultOpen?: boolean;
  scenario?: 'compare' | 'research' | 'collect' | 'discover' | 'extract' | 'monitor';
  issueCount: number;
  datasetId?: string;
  needsInput?: {
    count: number;
    summary: string;
  };
  domainQueue?: Array<{
    domain: string;
    scope: string;
    progress: string;
    status: 'Waiting' | 'Running' | 'Complete';
  }>;
};
type DatasetEvidence = { sourceUrl: string; quote: string };
export type DatasetRecord = {
  id: string;
  values: Record<string, string | null>;
  evidence: Record<string, DatasetEvidence>;
  reviewedBy?: Record<string, string>;
  reviewNotes?: Record<string, string>;
};
export type WorkspaceDataset = {
  id: string;
  version: string;
  title: string;
  detail: string;
  status: 'Validated' | 'Needs review' | 'Partial';
  tone: 'success' | 'warning';
  href?: string;
  recordCount?: number;
  fields?: string[];
  lastUpdated?: string;
  updatedAt?: number;
  unresolvedCount?: number;
  sourceWorkflow?: string;
  pipelineId?: string;
  sourceRunId?: string;
  sourceRunHref?: string;
  records?: DatasetRecord[];
  review?: {
    title: string;
    status: 'Open' | 'Resolved';
    issueCount: number;
    summary: string;
    description: string;
    itemDescription: string;
    recommendation: string;
    captureLabel: string;
    field: string;
  };
};
export type WorkspaceApiKey = { id: string; name: string; display: string; createdBy: string; access?: 'Full' | 'Read-only' };
export type WorkspaceMonitor = {
  id: string;
  name: string;
  detail: string;
  baselineDataset: string;
  schedule: string;
  lastChange: string;
  status: 'Healthy' | 'Paused' | 'Scheduled';
  tone: 'success' | 'warning' | 'info';
  fields: string[];
  alertRule: string;
  notifyVia?: NotificationChannel;
};
export type PipelineRepair = {
  id: string;
  pipelineId: string;
  pipelineName: string;
  title: string;
  summary: string;
  baseVersion: number;
  proposedVersion: number;
  status: 'Ready' | 'Approved' | 'Rolled back';
  fields: Array<{
    field: string;
    before: string;
    after: string;
    beforeEvidence: string;
    afterEvidence: string;
    beforeHref: string;
    afterHref: string;
  }>;
};
export type MonitorEvent = {
  id: string;
  monitorId: string;
  monitorName: string;
  title: string;
  field: string;
  previousValue: string;
  currentValue: string;
  evidence: string;
  sourceUrl: string;
  runId: string;
  runHref: string;
  occurredAt: string;
  status: 'New' | 'Baseline accepted' | 'Muted 7 days';
};
export type AuditEntry = {
  id: string;
  memberId: string;
  memberName: string;
  action: string;
  createdAt: number;
};
export type NotificationEventType = 'Review required' | 'Monitor change' | 'Repair ready';
export type NotificationPreference = {
  eventType: NotificationEventType;
  inApp: boolean;
  email: boolean;
};
const NOTIFICATION_CHANNELS = ['Email', 'Slack', 'Webhook'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export function isNotificationChannel(value: unknown): value is NotificationChannel {
  return typeof value === 'string' && NOTIFICATION_CHANNELS.some((channel) => channel === value);
}
type EnrichmentVerdict = 'Supported' | 'Not stated' | 'Conflicting';
export type EnrichmentCell = { value: string | null; verdict: EnrichmentVerdict; evidence: DatasetEvidence };
type EnrichmentRow = { id: string; values: Record<string, string>; enriched: Record<string, EnrichmentCell> };
export type WorkspaceEnrichment = {
  id: string;
  name: string;
  rowCount: number;
  state: 'Validated' | 'Running' | 'Completed';
  outcome: 'Ready' | 'Succeeded' | 'Partial';
  sourceFile: string;
  inputFields: string[];
  enrichedFields: string[];
  rows: EnrichmentRow[];
  runId?: string;
  runHref?: string;
};
export type Session = { user: AuthUser; workspaceId: string; role: Role };
export type SignInMethod =
  | { type: 'google' | 'microsoft' | 'sso' }
  | { type: 'email'; email: string }
  | { type: 'signup'; email: string; name: string; workspaceName: string };

type CapabilityStatus = 'available' | 'preview' | 'coming-soon';
type Capability = { status: CapabilityStatus; note?: string; limit?: number };
export const CAPABILITY_IDS = [
  'workflow-planning',
  'run-execution',
  'evidence',
  'search',
  'enrichment',
  'monitors',
  'workspaces',
  'members',
  'humanReview',
  'datasets',
  'pipelines',
  'api-keys',
  'browser-actions',
  'take-control',
  'input-decisions',
  'collect-pagination',
  'large-collect',
  'monitor-rules',
  'monitor-channels',
  'cost-estimates',
  'capture-screenshot',
  'capture-html',
  'capture-recording',
] as const;
export type CapabilityId = (typeof CAPABILITY_IDS)[number];
export type CapabilityMap = Readonly<Record<CapabilityId, Capability>>;

export type WorkflowRequest = { prompt: string; sources: string[]; fields: string[] };
export type WorkflowPlan = WorkflowRequest & {
  name: string;
  queries: number;
  scenario?: WorkspaceRun['scenario'];
  recordCount?: number;
  completed?: boolean;
  needsReview?: boolean;
};
type ValidationResult = { valid: boolean; messages: string[] };
export type RunWorkerState = 'Running' | 'Complete' | 'Needs input' | 'Failed';
export type RunWorker = {
  name: string;
  domain: string;
  state: RunWorkerState;
  price?: string;
  planDetails?: string;
  availability?: string;
};
export type RunPresentation = {
  title: string;
  kind: NonNullable<WorkspaceRun['scenario']>;
  completed: boolean;
  workers: RunWorker[];
};
export type RunEvent = {
  runId: string;
  state: WorkspaceRun['state'];
  outcome: WorkspaceRun['outcome'];
  presentation: RunPresentation;
  decisionState?: 'Running' | 'Complete';
};
type SearchResult = { domain: string; title: string; url: string; description: string };
export type MonitorRequest = Omit<WorkspaceMonitor, 'id' | 'baselineDataset'> & {
  runId?: string;
  workflowName: string;
  sources: string[];
};
type EnrichmentRequest = { enrichmentId: string };

type QualificationVerdict = 'Supported' | 'Unresolved' | 'Not supported';
type RecentPipeline = {
  id?: string;
  name: string;
  status: string;
  records: string;
  tone: 'success' | 'warning';
  href: string;
};
export type MockFixtures = {
  searchResults: SearchResult[];
  candidates: { name: string; domain: string; detail: string }[];
  qualificationRows: { id: string; name: string; verdicts: QualificationVerdict[] }[];
  readyCandidateIds: string[];
  pipelines: { id: string; name: string; detail: string; version: string; lastRun: string; schedule: string; status: string; tone: 'success' | 'warning'; href?: string }[];
  memoryRows: { id: string; label: string; runId: string; retention: string; status: string; tone: 'success' | 'warning'; href: string }[];
  groups: { name: string; items: string; status: string; tone: 'success' | 'warning' }[];
  usageRows: { id: string; values: string[] }[];
  usageTrend: { runs: number[]; dates: string[] };
  webhooks: { id: string; url: string; events: string; health: 'Healthy' | 'Validating' }[];
  mcpSetups: { id: string; label: string; title: string; setup: string }[];
  recentItems: { label: string; href: string; kind: 'run' | 'pipeline' | 'dataset' }[];
  homePipelinesByWorkspace: Record<string, Array<RecentPipeline & { reviewLinked?: boolean }>>;
};

export interface ExecutionEngine {
  suggest(request: WorkflowRequest): WorkflowPlan;
  plan(request: WorkflowRequest): Promise<WorkflowPlan>;
  validate(plan: WorkflowPlan): Promise<ValidationResult>;
  startRun(plan: WorkflowPlan): Promise<string>;
  getRun(runId: string): Promise<WorkspaceRun | undefined>;
  cancelRun(runId: string): Promise<void>;
  subscribeRunEvents(runId: string, listener: (event: RunEvent) => void): () => void;
  resolveRunDecision(runId: string): Promise<void>;
  evidence(datasetId: string): Promise<DatasetRecord[]>;
  search(query: string): Promise<SearchResult[]>;
  startEnrichment(request: EnrichmentRequest): Promise<void>;
  createMonitor(request: MonitorRequest): Promise<{ dataset: WorkspaceDataset; monitor: WorkspaceMonitor }>;
}

export interface StudioControlPlane {
  switchWorkspace(id: string): void;
  createWorkspace(name: string): void;
  inviteMembers(emails: string[], role: Role): void;
  resendInvite(id: string): void;
  revokeInvite(id: string): void;
  changeMemberRole(id: string, role: Role): { ok: boolean; message?: string };
  removeMember(id: string): { ok: boolean; message?: string };
  addRun(run: WorkspaceRun): void;
  updateRun(id: string, updates: Partial<WorkspaceRun>): void;
  addDataset(dataset: WorkspaceDataset): void;
  updateDatasetValue(datasetId: string, recordId: string, field: string, value: string, reviewedBy?: string, note?: string): void;
  setDatasetReviewState(datasetId: string, unresolvedCount: number): void;
  createApiKey(key: WorkspaceApiKey): void;
  revokeApiKey(id: string): void;
  addMonitor(monitor: WorkspaceMonitor): void;
  approvePipelineRepair(id: string): void;
  rollbackPipelineRepair(id: string): void;
  acceptMonitorBaseline(id: string): void;
  muteMonitorField(id: string): void;
  setNotificationPreference(eventType: NotificationEventType, channel: 'inApp' | 'email', enabled: boolean): void;
  addEnrichment(enrichment: WorkspaceEnrichment): void;
  updateEnrichment(id: string, updates: Partial<WorkspaceEnrichment>): void;
  addSource(source: string): void;
  removeSource(source: string): void;
}

interface StudioAuth {
  getSession(): Session | null;
  signIn(method: SignInMethod): void;
  signOut(): void;
  setDemoRole(role?: Role): void;
}

type StudioAuthSnapshot = {
  ready: boolean;
  session: Session | null;
  currentUser: AuthUser | null;
  currentRole: Role | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: Member[];
  runs: WorkspaceRun[];
  datasets: WorkspaceDataset[];
  apiKeys: WorkspaceApiKey[];
  monitors: WorkspaceMonitor[];
  enrichments: WorkspaceEnrichment[];
  pipelineRepairs: PipelineRepair[];
  monitorEvents: MonitorEvent[];
  auditEntries: AuditEntry[];
  notificationPreferences: NotificationPreference[];
  sources: string[];
  demoRole?: Role;
};

export type AuthInterface = StudioAuthSnapshot & StudioAuth & StudioControlPlane;
type HumanReviewSnapshot = {
  items: WorkspaceDataset[];
  reviewCount: number;
  pipelineStatus: 'Needs review' | 'Healthy';
};

export function pipelineVersionForRepair(repair: PipelineRepair | undefined, fallback: number) {
  return repair?.status === 'Approved' ? repair.proposedVersion : repair?.baseVersion ?? fallback;
}
export type StudioSnapshot = {
  auth: AuthInterface;
  humanReview: HumanReviewSnapshot;
  execution: ExecutionEngine;
  controlPlane: StudioControlPlane;
  capabilities: CapabilityMap;
  fixtures: MockFixtures;
  recentPipelines: RecentPipeline[];
  pipelineRepairs: PipelineRepair[];
  monitorEvents: MonitorEvent[];
  auditEntries: AuditEntry[];
  notificationPreferences: NotificationPreference[];
};

export interface StudioDataSource {
  readonly source: 'mock';
  readonly auth: StudioAuth;
  readonly execution: ExecutionEngine;
  readonly controlPlane: StudioControlPlane;
  readonly capabilities: CapabilityMap;
  initialize(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): StudioSnapshot;
}
