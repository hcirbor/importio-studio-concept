export type Role = 'Owner' | 'Admin' | 'Editor' | 'Viewer';
export type PermissionAction = 'run' | 'review' | 'promote' | 'create_monitor' | 'create_dataset' | 'manage_members' | 'assign_owner' | 'manage_api_keys' | 'manage_webhooks' | 'manage_billing' | 'delete_workspace';

export type AuthUser = { id: string; name: string; email: string };
export type Workspace = { id: string; name: string; subtitle: string; role: Role; empty?: boolean };
export type Member = { id: string; name: string; email: string; role: Role; lastActive: string; status?: 'Invited' };
export type WorkspaceRun = {
  id: string;
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
  scenario?: 'compare' | 'research' | 'collect' | 'discover' | 'extract' | 'monitor';
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
  sourceRunId?: string;
  records?: DatasetRecord[];
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
  notifyVia?: 'Email' | 'Slack' | 'Webhook';
};
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
};
export type Session = { user: AuthUser; workspaceId: string; role: Role };
export type SignInMethod =
  | { type: 'google' | 'microsoft' | 'sso' }
  | { type: 'email'; email: string }
  | { type: 'signup'; email: string; name: string; workspaceName: string };

type CapabilityStatus = 'available' | 'preview' | 'coming-soon';
type Capability = { status: CapabilityStatus; note?: string; limit?: number };
export type CapabilityMap = Readonly<Record<string, Capability>>;

export type WorkflowRequest = { prompt: string; sources: string[]; fields: string[] };
export type WorkflowPlan = WorkflowRequest & { name: string; queries: number };
type ValidationResult = { valid: boolean; messages: string[] };
export type RunEvent = { runId: string; state: WorkspaceRun['state']; outcome: WorkspaceRun['outcome'] };
export type SearchResult = { title: string; url: string; detail?: string };

export interface ExecutionEngine {
  suggest(request: WorkflowRequest): WorkflowPlan;
  plan(request: WorkflowRequest): WorkflowPlan;
  validate(plan: WorkflowPlan): ValidationResult;
  startRun(run: WorkspaceRun): void;
  getRun(runId: string): WorkspaceRun | undefined;
  cancelRun(runId: string): void;
  subscribeRunEvents(runId: string, listener: (event: RunEvent) => void): () => void;
  evidence(datasetId: string): DatasetRecord[];
  search(query: string): SearchResult[];
  domainLabel(domain: string): string;
  recordForDomain(domain: string, fields: string[]): DatasetRecord;
  recordsForDomains(domains: string[], fields: string[]): DatasetRecord[];
  startEnrichment(enrichment: WorkspaceEnrichment): void;
  createMonitor(monitor: WorkspaceMonitor): void;
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
  addEnrichment(enrichment: WorkspaceEnrichment): void;
  updateEnrichment(id: string, updates: Partial<WorkspaceEnrichment>): void;
  addSource(source: string): void;
  removeSource(source: string): void;
  acceptReviewItem(): void;
  restoreReviewItem(): void;
  promotePipeline(): void;
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
  sources: string[];
  demoRole?: Role;
};

export type AuthInterface = StudioAuthSnapshot & StudioAuth & StudioControlPlane;
type HumanReviewSnapshot = {
  hasReviewItem: boolean;
  reviewCount: number;
  pipelineVersion: number;
  pipelineStatus: 'Needs review' | 'Healthy';
  acceptReviewItem(): void;
  restoreReviewItem(): void;
  promotePipeline(): void;
};
export type StudioSnapshot = {
  auth: AuthInterface;
  humanReview: HumanReviewSnapshot;
  execution: ExecutionEngine;
  controlPlane: StudioControlPlane;
  capabilities: CapabilityMap;
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
