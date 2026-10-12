import { datasetDisplayName } from '@/lib/dataset-slug';
import { isRole } from '@/lib/data/StudioDataSource';
import type {
  AuthInterface,
  AuthUser,
  DatasetRecord,
  Member,
  Role,
  Session,
  SignInMethod,
  StudioControlPlane,
  StudioDataSource,
  StudioSnapshot,
  Workspace,
  WorkspaceApiKey,
  WorkspaceDataset,
  WorkspaceEnrichment,
  WorkspaceMonitor,
  WorkspaceRun,
} from '@/lib/data/StudioDataSource';
import { mockCapabilities } from '@/lib/data/mock/mock-capabilities';
import { createMockExecution } from '@/lib/data/mock/mock-execution';
import { mockFixtures } from '@/lib/data/mock/mock-fixtures';

type AuthState = {
  session: Session | null;
  workspaces: Workspace[];
  membersByWorkspace: Record<string, Member[]>;
  runsByWorkspace: Record<string, WorkspaceRun[]>;
  datasetsByWorkspace: Record<string, WorkspaceDataset[]>;
  apiKeysByWorkspace: Record<string, WorkspaceApiKey[]>;
  monitorsByWorkspace: Record<string, WorkspaceMonitor[]>;
  enrichmentsByWorkspace: Record<string, WorkspaceEnrichment[]>;
  sourcesByWorkspace: Record<string, string[]>;
  demoRole?: Role;
};

type WorkspaceReviewState = { hasReviewItem: boolean; pipelineVersion: number };
type ReviewStateMap = Record<string, WorkspaceReviewState>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isAuthUser(value: unknown): value is AuthUser {
  return isRecord(value) && isString(value.id) && isString(value.name) && isString(value.email);
}

function isSession(value: unknown): value is Session {
  return isRecord(value) && isAuthUser(value.user) && isString(value.workspaceId) && isRole(value.role);
}

function isWorkspace(value: unknown): value is Workspace {
  return isRecord(value) && isString(value.id) && isString(value.name) && isString(value.subtitle) && isRole(value.role)
    && (value.empty === undefined || typeof value.empty === 'boolean');
}

function isMember(value: unknown): value is Member {
  return isRecord(value) && isString(value.id) && isString(value.name) && isString(value.email) && isRole(value.role)
    && isString(value.lastActive) && (value.status === undefined || value.status === 'Invited');
}

function isWorkspaceRun(value: unknown): value is WorkspaceRun {
  return isRecord(value) && isString(value.id) && isString(value.when) && isString(value.pipeline)
    && isString(value.coverage) && isString(value.records) && typeof value.queries === 'number'
    && ['Running', 'Completed', 'Failed'].includes(String(value.state))
    && ['Running', 'Succeeded', 'Partial', 'Blocked'].includes(String(value.outcome))
    && ['info', 'success', 'warning', 'danger'].includes(String(value.tone))
    && (value.createdAt === undefined || typeof value.createdAt === 'number');
}

function isDatasetRecord(value: unknown): value is DatasetRecord {
  if (!isRecord(value) || !isString(value.id) || !isRecord(value.values) || !isRecord(value.evidence)) return false;
  return Object.values(value.values).every((item) => item === null || isString(item))
    && Object.values(value.evidence).every((item) => isRecord(item) && isString(item.sourceUrl) && isString(item.quote));
}

function isWorkspaceDataset(value: unknown): value is WorkspaceDataset {
  return isRecord(value) && isString(value.id) && isString(value.version) && isString(value.title) && isString(value.detail)
    && ['Validated', 'Needs review', 'Partial'].includes(String(value.status))
    && ['success', 'warning'].includes(String(value.tone))
    && (value.fields === undefined || (Array.isArray(value.fields) && value.fields.every(isString)))
    && (value.records === undefined || (Array.isArray(value.records) && value.records.every(isDatasetRecord)));
}

function isWorkspaceApiKey(value: unknown): value is WorkspaceApiKey {
  return isRecord(value) && isString(value.id) && isString(value.name) && isString(value.display) && isString(value.createdBy)
    && (value.access === undefined || value.access === 'Full' || value.access === 'Read-only');
}

function isWorkspaceMonitor(value: unknown): value is WorkspaceMonitor {
  return isRecord(value) && isString(value.id) && isString(value.name) && isString(value.detail)
    && isString(value.baselineDataset) && isString(value.schedule) && isString(value.lastChange)
    && ['Healthy', 'Paused', 'Scheduled'].includes(String(value.status))
    && ['success', 'warning', 'info'].includes(String(value.tone))
    && Array.isArray(value.fields) && value.fields.every(isString) && isString(value.alertRule);
}

function isWorkspaceEnrichment(value: unknown): value is WorkspaceEnrichment {
  return isRecord(value) && isString(value.id) && isString(value.name) && typeof value.rowCount === 'number'
    && ['Validated', 'Running', 'Completed'].includes(String(value.state))
    && ['Ready', 'Succeeded', 'Partial'].includes(String(value.outcome)) && isString(value.sourceFile)
    && Array.isArray(value.inputFields) && value.inputFields.every(isString)
    && Array.isArray(value.enrichedFields) && value.enrichedFields.every(isString) && Array.isArray(value.rows);
}

function decodeWorkspaceMap<T>(value: unknown, fallback: Record<string, T[]>, isItem: (item: unknown) => item is T) {
  if (!isRecord(value)) return fallback;
  const result: Record<string, T[]> = { ...fallback };
  for (const [workspaceId, items] of Object.entries(value)) {
    if (Array.isArray(items) && items.every(isItem)) result[workspaceId] = items;
  }
  return result;
}

const jordan: AuthUser = { id: 'jordan', name: 'Jordan Davis', email: 'jordan@example.com' };
const seededWorkspaces: Workspace[] = [
  { id: 'studio', name: 'Import.io Studio', subtitle: 'Demo workspace', role: 'Owner' },
  { id: 'northwind', name: 'Northwind Pricing', subtitle: 'Editor', role: 'Editor', empty: true },
];
const seededMembers: Record<string, Member[]> = {
  studio: [
    { id: 'jordan', name: 'Jordan Davis', email: 'jordan@example.com', role: 'Owner', lastActive: 'Now' },
    { id: 'maya', name: 'Maya Chen', email: 'maya@example.com', role: 'Editor', lastActive: '2 hours ago' },
    { id: 'sam', name: 'Sam Okafor', email: 'sam@example.com', role: 'Viewer', lastActive: 'Yesterday' },
    { id: 'priya', name: 'Pending invite', email: 'priya@example.com', role: 'Editor', lastActive: 'Invited', status: 'Invited' },
  ],
  northwind: [
    { id: 'jordan', name: 'Jordan Davis', email: 'jordan@example.com', role: 'Editor', lastActive: 'Now' },
  ],
};
const seededNow = Date.now();
const seededRuns: Record<string, WorkspaceRun[]> = {
  studio: [
    { id: 'run_batch_91af', when: 'Running now', createdAt: seededNow, pipeline: 'SaaS pricing research', coverage: '2 / 3 sources', records: '2', queries: 3, state: 'Running', outcome: 'Running', tone: 'info', badge: true, scenario: 'research' },
    { id: 'run_7f3a', when: '2 minutes ago', createdAt: seededNow - 2 * 60_000, pipeline: 'Competitor prices', coverage: '3 / 3 sources', records: '3', queries: 3, state: 'Completed', outcome: 'Partial', tone: 'warning', badge: true, scenario: 'compare' },
    { id: 'run_7e91', when: '1 hour ago', createdAt: seededNow - 60 * 60_000, pipeline: 'Outdoor catalogue', coverage: '1,284 / 1,284 pages', records: '1,284', queries: 1284, state: 'Completed', outcome: 'Succeeded', tone: 'success', badge: true, scenario: 'collect' },
    { id: 'run_failed_9d11', when: 'Yesterday', createdAt: seededNow - 24 * 60 * 60_000, pipeline: 'Retail availability', coverage: '2 / 3 sources', records: '2', queries: 3, state: 'Failed', outcome: 'Blocked', tone: 'danger', scenario: 'extract' },
  ],
  northwind: [],
};
const seededDatasets: Record<string, WorkspaceDataset[]> = {
  studio: [
    {
      id: 'competitor-prices', version: 'DATASET · V4', title: 'Competitor prices', detail: '3 records · 5 fields · 1 unresolved', status: 'Needs review', tone: 'warning', href: '/datasets/competitor-prices', recordCount: 3,
      fields: ['Retailer','Product','Price','Availability'], lastUpdated: '2 minutes ago', updatedAt: seededNow - 2 * 60_000, unresolvedCount: 1, sourceWorkflow: 'Competitor prices', sourceRunId: 'run_7f3a',
      records: [
        { id: 'northwind', values: { Retailer:'Northwind Outdoors',Product:'Trailhead 2P Tent',Price:'€249.00',Availability:'In stock' }, evidence: { Retailer:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Northwind Outdoors — Trailhead 2P Tent.'}, Product:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249.00 · In stock.'}, Price:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249.00 · In stock.'}, Availability:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249.00 · In stock.'} } },
        { id: 'summit', values: { Retailer:'Summit Supply',Product:'Trailhead Two-Person Tent',Price:'€239.00',Availability:'Low stock' }, evidence: { Retailer:{sourceUrl:'https://summit-supply.example/camping/trailhead-two-person',quote:'Summit Supply — Trailhead Two-Person Tent.'}, Product:{sourceUrl:'https://summit-supply.example/camping/trailhead-two-person',quote:'Trailhead Two-Person Tent — €239.00 · Low stock.'}, Price:{sourceUrl:'https://summit-supply.example/camping/trailhead-two-person',quote:'Trailhead Two-Person Tent — €239.00 · Low stock.'}, Availability:{sourceUrl:'https://summit-supply.example/camping/trailhead-two-person',quote:'Trailhead Two-Person Tent — €239.00 · Low stock.'} } },
        { id: 'trail-shop', values: { Retailer:'Trail Shop',Product:'Trailhead 2 Person',Price:'€259.00',Availability:'Unknown' }, evidence: { Retailer:{sourceUrl:'https://trail-shop.example/search?q=trailhead',quote:'Trail Shop — Trailhead 2 Person.'}, Product:{sourceUrl:'https://trail-shop.example/search?q=trailhead',quote:'Trailhead 2 Person — €259.00.'}, Price:{sourceUrl:'https://trail-shop.example/search?q=trailhead',quote:'Trailhead 2 Person — €259.00.'}, Availability:{sourceUrl:'https://trail-shop.example/search?q=trailhead',quote:'No availability statement appears on the captured page.'} } },
      ],
    },
    { id: 'outdoor-catalogue', version: 'DATASET · V7', title: 'Outdoor catalogue', detail: '1,284 records · 8 fields · fully validated', status: 'Validated', tone: 'success', href: '/datasets/outdoor-catalogue', recordCount: 1284, fields: ['Product','Price','Availability','URL'], lastUpdated:'1 hour ago', updatedAt: seededNow - 60 * 60_000, unresolvedCount: 0, sourceWorkflow:'Outdoor catalogue', sourceRunId:'run_7e91', records: [{ id:'summit-solo', values:{Product:'Summit Solo Tent',Price:'€179',Availability:'In stock',URL:'northwind-outdoors.example/tents/summit-solo'}, evidence:{Product:{sourceUrl:'https://northwind-outdoors.example/tents/summit-solo',quote:'Summit Solo Tent — €179 · In stock.'},Price:{sourceUrl:'https://northwind-outdoors.example/tents/summit-solo',quote:'Summit Solo Tent — €179 · In stock.'},Availability:{sourceUrl:'https://northwind-outdoors.example/tents/summit-solo',quote:'Summit Solo Tent — €179 · In stock.'},URL:{sourceUrl:'https://northwind-outdoors.example/tents/summit-solo',quote:'Summit Solo Tent product page.'}}}] },
    { id: 'qualified-suppliers', version: 'DATASET · V2', title: 'Qualified suppliers', detail: '74 records · 9 fields · 6 unresolved', status: 'Partial', tone: 'warning', href: '/datasets/qualified-suppliers', recordCount:74, fields:['Company','Location','Categories','Minimum order'], lastUpdated:'Yesterday', updatedAt: seededNow - 24 * 60 * 60_000, unresolvedCount: 6, sourceWorkflow:'Qualified supplier discovery', sourceRunId:'run_supplier_2b81', records:[{id:'northwind-trade',values:{Company:'Northwind Trade',Location:'Rotterdam',Categories:'Tents, packs','Minimum order':'€500'},evidence:{Company:{sourceUrl:'https://worthington-directory.example/northwind-trade',quote:'Northwind Trade — wholesale outdoor equipment.'},Location:{sourceUrl:'https://worthington-directory.example/northwind-trade',quote:'Based in Rotterdam, Netherlands.'},Categories:{sourceUrl:'https://worthington-directory.example/northwind-trade',quote:'Categories: tents and packs.'},'Minimum order':{sourceUrl:'https://worthington-directory.example/northwind-trade',quote:'Minimum order €500.'}}}] },
  ],
  northwind: [],
};
const seededApiKeys: Record<string, WorkspaceApiKey[]> = {
  studio: [{ id: 'production', name: 'Production', display: 'mcp_live_••••9f2a', createdBy: 'Created by Jordan Davis · 14 Sep' }],
  northwind: [],
};
const seededMonitors: Record<string, WorkspaceMonitor[]> = {
  studio: [
    { id: 'map-watch', name: 'MAP watch', detail: 'Price and seller availability', baselineDataset: 'Marketplace sellers', schedule: 'Daily', lastChange: 'Yesterday · 12 changes', status: 'Healthy', tone: 'success', fields: ['Price', 'Seller availability'], alertRule: 'Alert when any value changes' },
    { id: 'trailhead-availability', name: 'Trailhead availability', detail: 'Price and stock status', baselineDataset: 'Competitor prices', schedule: 'Every 6 hours', lastChange: '3 days ago · low stock', status: 'Healthy', tone: 'success', fields: ['Price', 'Availability'], alertRule: 'Alert when price or availability changes' },
    { id: 'supplier-terms', name: 'Supplier terms', detail: 'Minimum order and lead time', baselineDataset: 'Qualified suppliers', schedule: 'Paused', lastChange: '12 days ago', status: 'Paused', tone: 'warning', fields: ['Minimum order', 'Lead time'], alertRule: 'Alert when terms change' },
  ],
  northwind: [],
};
const seededEnrichments: Record<string, WorkspaceEnrichment[]> = {
  studio: [
    {
      id: 'supplier-enrichment',
      name: 'Supplier enrichment',
      rowCount: 248,
      state: 'Completed',
      outcome: 'Partial',
      sourceFile: 'eu-suppliers.csv',
      inputFields: ['company', 'website'],
      enrichedFields: ['category', 'headquarters'],
      runId: 'run_supplier_2b81',
      rows: [
        {
          id: 'acme-tools',
          values: { company: 'Acme Tools', website: 'acme-tools.example' },
          enriched: {
            category: { value: 'Industrial tools', verdict: 'Supported', evidence: { sourceUrl: 'https://acme-tools.example/about', quote: 'Acme Tools supplies industrial hand tools to trade customers.' } },
            headquarters: { value: 'Birmingham, UK', verdict: 'Supported', evidence: { sourceUrl: 'https://acme-tools.example/contact', quote: 'Head office: Birmingham, United Kingdom.' } },
          },
        },
        {
          id: 'widgetco',
          values: { company: 'WidgetCo', website: 'widgetco.example' },
          enriched: {
            category: { value: 'Components', verdict: 'Supported', evidence: { sourceUrl: 'https://widgetco.example/company', quote: 'WidgetCo manufactures precision components for equipment makers.' } },
            headquarters: { value: null, verdict: 'Not stated', evidence: { sourceUrl: 'https://widgetco.example/company', quote: 'No headquarters location is stated on the company page.' } },
          },
        },
        {
          id: 'northwind-trade',
          values: { company: 'Northwind Trade', website: 'northwind.example' },
          enriched: {
            category: { value: 'Outdoor equipment', verdict: 'Supported', evidence: { sourceUrl: 'https://northwind.example/about', quote: 'Wholesale outdoor equipment for independent retailers.' } },
            headquarters: { value: 'Rotterdam, Netherlands', verdict: 'Conflicting', evidence: { sourceUrl: 'https://northwind.example/contact', quote: 'The contact page lists Rotterdam while the directory profile lists Utrecht.' } },
          },
        },
      ],
    },
    {
      id: 'retailer-domain-match',
      name: 'Retailer domain match',
      rowCount: 74,
      state: 'Completed',
      outcome: 'Succeeded',
      sourceFile: 'retailers.csv',
      inputFields: ['retailer', 'country'],
      enrichedFields: ['domain'],
      runId: 'run_7e91',
      rows: [
        {
          id: 'northwind-outdoors',
          values: { retailer: 'Northwind Outdoors', country: 'Netherlands' },
          enriched: {
            domain: { value: 'northwind-outdoors.example', verdict: 'Supported', evidence: { sourceUrl: 'https://northwind-outdoors.example/about', quote: 'Northwind Outdoors serves customers from its Netherlands retail operation.' } },
          },
        },
        {
          id: 'summit-supply',
          values: { retailer: 'Summit Supply', country: 'France' },
          enriched: {
            domain: { value: 'summit-supply.example', verdict: 'Supported', evidence: { sourceUrl: 'https://summit-supply.example/contact', quote: 'Summit Supply Europe · Lyon, France.' } },
          },
        },
      ],
    },
  ],
  northwind: [],
};
const seededSources: Record<string, string[]> = { studio: [], northwind: [] };
const legacyFixedRunIds = new Set(['run_collect', 'run_discover', 'run_extract', 'run_monitor']);

function timestampFromRelativeLabel(label?: string) {
  const now = Date.now();
  if (!label || /^(?:Just now|Running now|Now)$/i.test(label)) return now;
  const minutes = label.match(/^(\d+)\s+minutes?\s+ago$/i)?.[1];
  if (minutes) return now - Number(minutes) * 60_000;
  const hours = label.match(/^(\d+)\s+hours?\s+ago$/i)?.[1];
  if (hours) return now - Number(hours) * 60 * 60_000;
  if (/^Yesterday$/i.test(label)) return now - 24 * 60 * 60_000;
  const days = label.match(/^(\d+)\s+days?\s+ago$/i)?.[1];
  return days ? now - Number(days) * 24 * 60 * 60_000 : now;
}

function unresolvedCountFromDetail(detail: string) {
  return Number(detail.match(/(\d+)\s+unresolved/i)?.[1] ?? 0);
}

function normalizeRuns(collections: Record<string, WorkspaceRun[]> | undefined) {
  if (!collections) return {};
  return Object.fromEntries(Object.entries(collections).map(([workspaceId, runs]) => [
    workspaceId,
    runs.filter((run) => !legacyFixedRunIds.has(run.id)).map((run) => ({
      ...run,
      createdAt: run.createdAt ?? timestampFromRelativeLabel(run.when),
    })),
  ]));
}

function normalizeDatasets(collections: Record<string, WorkspaceDataset[]> | undefined) {
  if (!collections) return {};
  return Object.fromEntries(Object.entries(collections).map(([workspaceId, datasets]) => {
    const seen = new Set<string>();
    const normalized = datasets.flatMap((dataset) => {
      const stableIds: Record<string,string> = {
        'SaaS pricing research': 'saas-pricing-research',
        'Extract': 'extract',
        'Build a dataset': 'build-a-dataset',
        'Qualified supplier discovery': 'supplier-discovery',
        'Trailhead baseline': 'trailhead-baseline',
        'Competitor prices': 'competitor-prices',
      };
      const stableId = stableIds[dataset.title] ?? dataset.id;
      if (seen.has(stableId)) return [];
      seen.add(stableId);
      const recordCount = dataset.title === 'Build a dataset' || dataset.title === 'SaaS pricing research'
        ? 3
        : dataset.title === 'Extract'
          ? 1
          : dataset.title === 'Trailhead baseline'
            ? 2
            : null;
      const seeded = seededDatasets[workspaceId]?.find((item) => item.id === stableId);
      return [{
        ...seeded,
        ...dataset,
        id: stableId,
        title: datasetDisplayName(dataset.title.replace(/\s+\(\d+\)$/, ''), stableId),
        href: `/datasets/${stableId}`,
        updatedAt: dataset.updatedAt ?? seeded?.updatedAt ?? timestampFromRelativeLabel(dataset.lastUpdated),
        unresolvedCount: dataset.unresolvedCount ?? seeded?.unresolvedCount ?? unresolvedCountFromDetail(dataset.detail),
        detail: recordCount === null
          ? dataset.detail
          : dataset.detail.replace(/^\d+ records?/, `${recordCount} ${recordCount === 1 ? 'record' : 'records'}`),
      }];
    });
    return [workspaceId, normalized];
  }));
}

const storageKey = 'importio-studio-demo-auth';
const reviewStateKey = 'importio-studio-review-state';
const seededReviewState: ReviewStateMap = {
  studio: { hasReviewItem: true, pipelineVersion: 4 },
  northwind: { hasReviewItem: false, pipelineVersion: 4 },
};
const initialState = (): AuthState => ({
    session: null,
    workspaces: seededWorkspaces,
    membersByWorkspace: seededMembers,
    runsByWorkspace: seededRuns,
    datasetsByWorkspace: seededDatasets,
    apiKeysByWorkspace: seededApiKeys,
    monitorsByWorkspace: seededMonitors,
    enrichmentsByWorkspace: seededEnrichments,
    sourcesByWorkspace: seededSources,
});

function decodeAuthState(value: unknown): AuthState {
  const fallback = initialState();
  if (!isRecord(value)) return fallback;
  const session = value.session === null || isSession(value.session) ? value.session : fallback.session;
  const workspaces = Array.isArray(value.workspaces) && value.workspaces.every(isWorkspace) ? value.workspaces : fallback.workspaces;
  const demoRole = isRole(value.demoRole) ? value.demoRole : undefined;
  return {
    session,
    workspaces,
    membersByWorkspace: decodeWorkspaceMap(value.membersByWorkspace, fallback.membersByWorkspace, isMember),
    runsByWorkspace: normalizeRuns(decodeWorkspaceMap(value.runsByWorkspace, fallback.runsByWorkspace, isWorkspaceRun)),
    datasetsByWorkspace: normalizeDatasets(decodeWorkspaceMap(value.datasetsByWorkspace, fallback.datasetsByWorkspace, isWorkspaceDataset)),
    apiKeysByWorkspace: decodeWorkspaceMap(value.apiKeysByWorkspace, fallback.apiKeysByWorkspace, isWorkspaceApiKey),
    monitorsByWorkspace: decodeWorkspaceMap(value.monitorsByWorkspace, fallback.monitorsByWorkspace, isWorkspaceMonitor),
    enrichmentsByWorkspace: decodeWorkspaceMap(value.enrichmentsByWorkspace, fallback.enrichmentsByWorkspace, isWorkspaceEnrichment),
    sourcesByWorkspace: decodeWorkspaceMap(value.sourcesByWorkspace, fallback.sourcesByWorkspace, isString),
    demoRole,
  };
}

function isWorkspaceReviewState(value: unknown): value is WorkspaceReviewState {
  return isRecord(value) && typeof value.hasReviewItem === 'boolean' && typeof value.pipelineVersion === 'number';
}

function decodeReviewState(value: unknown): ReviewStateMap {
  if (isWorkspaceReviewState(value)) return { ...seededReviewState, studio: value };
  if (!isRecord(value)) return seededReviewState;
  const result: ReviewStateMap = { ...seededReviewState };
  for (const [workspaceId, review] of Object.entries(value)) {
    if (isWorkspaceReviewState(review)) result[workspaceId] = review;
  }
  return result;
}

class MockStudioDataSource implements StudioDataSource, StudioControlPlane {
  readonly source = 'mock' as const;
  readonly capabilities = mockCapabilities;
  private state = initialState();
  private reviewState: ReviewStateMap = seededReviewState;
  private ready = false;
  private initialized = false;
  private listeners = new Set<() => void>();
  private snapshot: StudioSnapshot;

  constructor() {
    this.snapshot = this.createSnapshot();
  }

  initialize = () => {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        try {
          this.state = decodeAuthState(JSON.parse(stored));
        } catch { window.localStorage.removeItem(storageKey); }
      }
      const storedReview = window.localStorage.getItem(reviewStateKey);
      if (storedReview) {
        try {
          this.reviewState = decodeReviewState(JSON.parse(storedReview));
        } catch { window.localStorage.removeItem(reviewStateKey); }
      }
      this.ready = true;
      this.publish();
    }, 0);
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private publish() {
    this.snapshot = this.createSnapshot();
    if (this.ready && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(this.state));
      window.localStorage.setItem(reviewStateKey, JSON.stringify(this.reviewState));
    }
    this.listeners.forEach((listener) => listener());
  }

  private commit(updater: (state: AuthState) => AuthState) {
    const next = updater(this.state);
    if (next === this.state) return;
    this.state = next;
    this.publish();
  }

  private createSnapshot(): StudioSnapshot {
    const state = this.state;
    const currentWorkspace = state.session
      ? state.workspaces.find((item) => item.id === state.session?.workspaceId) ?? null
      : null;
    const currentRole = state.session ? state.demoRole ?? state.session.role : null;
    const session = state.session && currentRole ? { ...state.session, role: currentRole } : null;
    const currentReview = this.reviewState[session?.workspaceId ?? 'studio'] ?? { hasReviewItem: false, pipelineVersion: 4 };
    const auth: AuthInterface = {
      ready: this.ready,
      session,
      currentUser: session?.user ?? null,
      currentRole,
      currentWorkspace,
      workspaces: state.workspaces,
      members: session ? state.membersByWorkspace[session.workspaceId] ?? [] : [],
      runs: session ? state.runsByWorkspace[session.workspaceId] ?? [] : [],
      datasets: session ? state.datasetsByWorkspace[session.workspaceId] ?? [] : [],
      apiKeys: session ? state.apiKeysByWorkspace[session.workspaceId] ?? [] : [],
      monitors: session ? state.monitorsByWorkspace[session.workspaceId] ?? [] : [],
      enrichments: session ? state.enrichmentsByWorkspace[session.workspaceId] ?? [] : [],
      sources: session ? state.sourcesByWorkspace[session.workspaceId] ?? [] : [],
      demoRole: state.demoRole,
      ...this.auth,
      ...this.controlPlane,
    };
    const humanReview = {
      hasReviewItem: currentReview.hasReviewItem,
      reviewCount: currentReview.hasReviewItem ? 1 : 0,
      pipelineVersion: currentReview.pipelineVersion,
      pipelineStatus: currentReview.hasReviewItem ? 'Needs review' as const : 'Healthy' as const,
      acceptReviewItem: this.acceptReviewItem,
      restoreReviewItem: this.restoreReviewItem,
      promotePipeline: this.promotePipeline,
    };
    const recentPipelines = (mockFixtures.homePipelinesByWorkspace[session?.workspaceId ?? ''] ?? []).map((pipeline) => pipeline.reviewLinked
      ? { ...pipeline, status: currentReview.hasReviewItem ? 'Needs review' : 'Healthy', tone: currentReview.hasReviewItem ? 'warning' as const : 'success' as const }
      : pipeline);
    return { auth, humanReview, execution: this.execution, controlPlane: this.controlPlane, capabilities: this.capabilities, fixtures: mockFixtures, recentPipelines };
  }

  signIn = (method: SignInMethod) => {
    this.commit((current) => {
      if (method.type === 'signup') {
        const user: AuthUser = { id: `user-${Date.now()}`, name: method.name.trim(), email: method.email.trim() };
        const id = `workspace-${Date.now()}`;
        const workspace: Workspace = { id, name: method.workspaceName.trim(), subtitle: 'New workspace', role: 'Owner', empty: true };
        return {
          ...current,
          session: { user, workspaceId: id, role: 'Owner' },
          workspaces: [...current.workspaces, workspace],
          membersByWorkspace: { ...current.membersByWorkspace, [id]: [{ id: user.id, name: user.name, email: user.email, role: 'Owner', lastActive: 'Now' }] },
          runsByWorkspace: { ...current.runsByWorkspace, [id]: [] },
          datasetsByWorkspace: { ...current.datasetsByWorkspace, [id]: [] },
          apiKeysByWorkspace: { ...current.apiKeysByWorkspace, [id]: [] },
          monitorsByWorkspace: { ...current.monitorsByWorkspace, [id]: [] },
          enrichmentsByWorkspace: { ...current.enrichmentsByWorkspace, [id]: [] },
          sourcesByWorkspace: { ...current.sourcesByWorkspace, [id]: [] },
        };
      }
      const user = method.type === 'email'
        ? { id: `email-${method.email.toLowerCase()}`, name: method.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), email: method.email }
        : jordan;
      return { ...current, session: { user, workspaceId: 'studio', role: 'Owner' }, demoRole: undefined };
    });
  };

  signOut = () => this.commit((current) => ({ ...current, session: null, demoRole: undefined }));

  switchWorkspace = (id: string) => this.commit((current) => {
    if (!current.session) return current;
    const workspace = current.workspaces.find((item) => item.id === id);
    if (!workspace) return current;
    return { ...current, session: { ...current.session, workspaceId: id, role: workspace.role }, demoRole: undefined };
  });

  createWorkspace = (name: string) => this.commit((current) => {
    if (!current.session || !name.trim()) return current;
    const id = `workspace-${Date.now()}`;
    const workspace: Workspace = { id, name: name.trim(), subtitle: 'Owner', role: 'Owner', empty: true };
    const owner: Member = { id: current.session.user.id, name: current.session.user.name, email: current.session.user.email, role: 'Owner', lastActive: 'Now' };
    return {
      ...current,
      session: { ...current.session, workspaceId: id, role: 'Owner' },
      workspaces: [...current.workspaces, workspace],
      membersByWorkspace: { ...current.membersByWorkspace, [id]: [owner] },
      runsByWorkspace: { ...current.runsByWorkspace, [id]: [] },
      datasetsByWorkspace: { ...current.datasetsByWorkspace, [id]: [] },
      apiKeysByWorkspace: { ...current.apiKeysByWorkspace, [id]: [] },
      monitorsByWorkspace: { ...current.monitorsByWorkspace, [id]: [] },
      enrichmentsByWorkspace: { ...current.enrichmentsByWorkspace, [id]: [] },
      sourcesByWorkspace: { ...current.sourcesByWorkspace, [id]: [] },
      demoRole: undefined,
    };
  });

  setDemoRole = (role?: Role) => this.commit((current) => ({ ...current, demoRole: role }));

  private updateMembers(updater: (members: Member[]) => Member[]) {
    this.commit((current) => {
    if (!current.session) return current;
    const id = current.session.workspaceId;
    return { ...current, membersByWorkspace: { ...current.membersByWorkspace, [id]: updater(current.membersByWorkspace[id] ?? []) } };
    });
  }

  inviteMembers = (emails: string[], role: Role) => this.updateMembers((members) => [...members, ...emails.map((email) => ({ id: `invite-${email}-${Date.now()}`, name: 'Pending invite', email, role, lastActive: 'Invited', status: 'Invited' as const }))]);
  resendInvite = (id: string) => this.updateMembers((members) => members.map((member) => member.id === id ? { ...member, lastActive: 'Invited · resent now' } : member));
  revokeInvite = (id: string) => this.updateMembers((members) => members.filter((member) => member.id !== id));

  changeMemberRole = (id: string, role: Role) => {
    if (!this.state.session) return { ok: false, message: 'Sign in to manage members.' };
    if ((this.state.demoRole ?? this.state.session.role) !== 'Owner' && role === 'Owner') return { ok: false, message: 'Only an Owner can assign the Owner role.' };
    const members = this.state.membersByWorkspace[this.state.session.workspaceId] ?? [];
    const target = members.find((member) => member.id === id);
    const owners = members.filter((member) => member.role === 'Owner' && member.status !== 'Invited');
    if (target?.role === 'Owner' && role !== 'Owner' && owners.length === 1) return { ok: false, message: 'At least one Owner must remain.' };
    this.updateMembers((current) => current.map((member) => member.id === id ? { ...member, role } : member));
    return { ok: true };
  };

  removeMember = (id: string) => {
    if (!this.state.session) return { ok: false, message: 'Sign in to manage members.' };
    const members = this.state.membersByWorkspace[this.state.session.workspaceId] ?? [];
    const target = members.find((member) => member.id === id);
    const owners = members.filter((member) => member.role === 'Owner' && member.status !== 'Invited');
    if (target?.role === 'Owner' && owners.length === 1) return { ok: false, message: 'The last Owner cannot be removed.' };
    this.updateMembers((current) => current.filter((member) => member.id !== id));
    return { ok: true };
  };

  private updateWorkspaceCollection<T>(
    read: (state: AuthState) => Record<string, T[]>,
    write: (state: AuthState, collections: Record<string, T[]>) => AuthState,
    updater: (items: T[]) => T[],
  ) {
    this.commit((current) => {
      if (!current.session) return current;
      const workspaceId = current.session.workspaceId;
      const collections = read(current);
      const nextItems = updater(collections[workspaceId] ?? []);
      const next = write(current, { ...collections, [workspaceId]: nextItems });
      return {
        ...next,
        workspaces: current.workspaces.map((workspace) => workspace.id === workspaceId ? { ...workspace, empty: false } : workspace),
      };
    });
  }

  addRun = (run: WorkspaceRun) => this.updateWorkspaceCollection((state) => state.runsByWorkspace, (state, runsByWorkspace) => ({ ...state, runsByWorkspace }), (runs) => [run, ...runs.filter((item) => item.id !== run.id)]);
  updateRun = (id: string, updates: Partial<WorkspaceRun>) => this.updateWorkspaceCollection((state) => state.runsByWorkspace, (state, runsByWorkspace) => ({ ...state, runsByWorkspace }), (runs) => runs.map((run) => run.id === id ? { ...run, ...updates } : run));
  addDataset = (dataset: WorkspaceDataset) => this.updateWorkspaceCollection((state) => state.datasetsByWorkspace, (state, datasetsByWorkspace) => ({ ...state, datasetsByWorkspace }), (datasets) => [dataset, ...datasets.filter((item) => item.id !== dataset.id)]);
  updateDatasetValue = (datasetId: string, recordId: string, field: string, value: string, reviewedBy?: string, note?: string) => this.updateWorkspaceCollection((state) => state.datasetsByWorkspace, (state, datasetsByWorkspace) => ({ ...state, datasetsByWorkspace }), (datasets) => datasets.map((dataset) => dataset.id !== datasetId ? dataset : {
    ...dataset,
    lastUpdated: 'Just now',
    updatedAt: Date.now(),
    records: dataset.records?.map((record) => {
      if (record.id !== recordId) return record;
      const nextReviewedBy = { ...record.reviewedBy };
      const nextReviewNotes = { ...record.reviewNotes };
      if (reviewedBy) nextReviewedBy[field] = reviewedBy;
      else delete nextReviewedBy[field];
      if (note) nextReviewNotes[field] = note;
      else delete nextReviewNotes[field];
      return {
        ...record,
        values: { ...record.values, [field]: value },
        reviewedBy: nextReviewedBy,
        reviewNotes: nextReviewNotes,
      };
    }),
  }));
  setDatasetReviewState = (datasetId: string, unresolvedCount: number) => this.updateWorkspaceCollection((state) => state.datasetsByWorkspace, (state, datasetsByWorkspace) => ({ ...state, datasetsByWorkspace }), (datasets) => datasets.map((dataset) => {
    if (dataset.id !== datasetId) return dataset;
    const status = unresolvedCount > 0 ? 'Needs review' as const : 'Validated' as const;
    const tone = unresolvedCount > 0 ? 'warning' as const : 'success' as const;
    if (dataset.unresolvedCount === unresolvedCount && dataset.status === status) return dataset;
    const baseDetail = dataset.detail.replace(/\s·\s(?:\d+\s+unresolved|fully validated)$/, '');
    return {
      ...dataset,
      unresolvedCount,
      status,
      tone,
      detail: `${baseDetail} · ${unresolvedCount > 0 ? `${unresolvedCount} unresolved` : 'fully validated'}`,
      lastUpdated: 'Just now',
      updatedAt: Date.now(),
    };
  }));
  createApiKey = (key: WorkspaceApiKey) => this.updateWorkspaceCollection((state) => state.apiKeysByWorkspace, (state, apiKeysByWorkspace) => ({ ...state, apiKeysByWorkspace }), (keys) => [...keys, key]);
  revokeApiKey = (id: string) => this.updateWorkspaceCollection((state) => state.apiKeysByWorkspace, (state, apiKeysByWorkspace) => ({ ...state, apiKeysByWorkspace }), (keys) => keys.filter((key) => key.id !== id));
  addMonitor = (monitor: WorkspaceMonitor) => this.updateWorkspaceCollection((state) => state.monitorsByWorkspace, (state, monitorsByWorkspace) => ({ ...state, monitorsByWorkspace }), (monitors) => [monitor, ...monitors.filter((item) => item.id !== monitor.id)]);
  addEnrichment = (enrichment: WorkspaceEnrichment) => this.updateWorkspaceCollection((state) => state.enrichmentsByWorkspace, (state, enrichmentsByWorkspace) => ({ ...state, enrichmentsByWorkspace }), (enrichments) => [enrichment, ...enrichments.filter((item) => item.id !== enrichment.id)]);
  updateEnrichment = (id: string, updates: Partial<WorkspaceEnrichment>) => this.updateWorkspaceCollection((state) => state.enrichmentsByWorkspace, (state, enrichmentsByWorkspace) => ({ ...state, enrichmentsByWorkspace }), (enrichments) => enrichments.map((enrichment) => enrichment.id === id ? { ...enrichment, ...updates } : enrichment));
  addSource = (source: string) => this.updateWorkspaceCollection((state) => state.sourcesByWorkspace, (state, sourcesByWorkspace) => ({ ...state, sourcesByWorkspace }), (sources) => sources.includes(source) ? sources : [...sources, source]);
  removeSource = (source: string) => this.updateWorkspaceCollection((state) => state.sourcesByWorkspace, (state, sourcesByWorkspace) => ({ ...state, sourcesByWorkspace }), (sources) => sources.filter((item) => item !== source));

  private updateCurrentReview(updates: Partial<WorkspaceReviewState>) {
    const workspaceId = this.state.session?.workspaceId ?? 'studio';
    this.reviewState = {
      ...this.reviewState,
      [workspaceId]: {
        ...(this.reviewState[workspaceId] ?? { hasReviewItem: false, pipelineVersion: 4 }),
        ...updates,
      },
    };
    this.publish();
  }

  acceptReviewItem = () => this.updateCurrentReview({ hasReviewItem: false });
  restoreReviewItem = () => this.updateCurrentReview({ hasReviewItem: true });
  promotePipeline = () => this.updateCurrentReview({ pipelineVersion: 5 });

  readonly auth = {
    getSession: () => this.snapshot.auth.session,
    signIn: this.signIn,
    signOut: this.signOut,
    setDemoRole: this.setDemoRole,
  };

  readonly controlPlane: StudioControlPlane = {
    switchWorkspace: this.switchWorkspace,
    createWorkspace: this.createWorkspace,
    inviteMembers: this.inviteMembers,
    resendInvite: this.resendInvite,
    revokeInvite: this.revokeInvite,
    changeMemberRole: this.changeMemberRole,
    removeMember: this.removeMember,
    addRun: this.addRun,
    updateRun: this.updateRun,
    addDataset: this.addDataset,
    updateDatasetValue: this.updateDatasetValue,
    setDatasetReviewState: this.setDatasetReviewState,
    createApiKey: this.createApiKey,
    revokeApiKey: this.revokeApiKey,
    addMonitor: this.addMonitor,
    addEnrichment: this.addEnrichment,
    updateEnrichment: this.updateEnrichment,
    addSource: this.addSource,
    removeSource: this.removeSource,
    acceptReviewItem: this.acceptReviewItem,
    restoreReviewItem: this.restoreReviewItem,
    promotePipeline: this.promotePipeline,
  };

  readonly execution = createMockExecution(this.controlPlane, this.getSnapshot);
}

export function createMockStudioDataSource(): StudioDataSource {
  return new MockStudioDataSource();
}
