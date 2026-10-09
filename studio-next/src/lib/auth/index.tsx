'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Role = 'Owner' | 'Admin' | 'Editor' | 'Viewer';
export type PermissionAction = 'run' | 'review' | 'promote' | 'create_monitor' | 'create_dataset' | 'manage_members' | 'assign_owner' | 'manage_api_keys' | 'manage_webhooks' | 'manage_billing' | 'delete_workspace';

export type AuthUser = { id: string; name: string; email: string };
export type Workspace = { id: string; name: string; subtitle: string; role: Role; empty?: boolean };
export type Member = { id: string; name: string; email: string; role: Role; lastActive: string; status?: 'Invited' };
export type WorkspaceRun = {
  id: string;
  when: string;
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
  sourceWorkflow?: string;
  sourceRunId?: string;
  records?: DatasetRecord[];
};
export type DatasetEvidence = { sourceUrl: string; quote: string };
export type DatasetRecord = {
  id: string;
  values: Record<string, string>;
  evidence: Record<string, DatasetEvidence>;
  reviewedBy?: Record<string, string>;
  reviewNotes?: Record<string, string>;
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
export type Session = { user: AuthUser; workspaceId: string; role: Role };
export type SignInMethod =
  | { type: 'google' | 'microsoft' | 'sso' }
  | { type: 'email'; email: string }
  | { type: 'signup'; email: string; name: string; workspaceName: string };

export const viewerTooltip = "Viewers can't run workflows. Ask an Admin for Editor access.";

const permissions: Record<Role, Set<PermissionAction>> = {
  Owner: new Set(['run','review','promote','create_monitor','create_dataset','manage_members','assign_owner','manage_api_keys','manage_webhooks','manage_billing','delete_workspace']),
  Admin: new Set(['run','review','promote','create_monitor','create_dataset','manage_members','manage_api_keys','manage_webhooks']),
  Editor: new Set(['run','review','promote','create_monitor','create_dataset']),
  Viewer: new Set(),
};

export function can(user: { role: Role } | null | undefined, action: PermissionAction) {
  return Boolean(user && permissions[user.role].has(action));
}

type AuthState = {
  session: Session | null;
  workspaces: Workspace[];
  membersByWorkspace: Record<string, Member[]>;
  runsByWorkspace: Record<string, WorkspaceRun[]>;
  datasetsByWorkspace: Record<string, WorkspaceDataset[]>;
  apiKeysByWorkspace: Record<string, WorkspaceApiKey[]>;
  monitorsByWorkspace: Record<string, WorkspaceMonitor[]>;
  sourcesByWorkspace: Record<string, string[]>;
  demoRole?: Role;
};

export type AuthInterface = {
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
  sources: string[];
  demoRole?: Role;
  getSession: () => Session | null;
  signIn: (method: SignInMethod) => void;
  signOut: () => void;
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string) => void;
  setDemoRole: (role?: Role) => void;
  inviteMembers: (emails: string[], role: Role) => void;
  resendInvite: (id: string) => void;
  revokeInvite: (id: string) => void;
  changeMemberRole: (id: string, role: Role) => { ok: boolean; message?: string };
  removeMember: (id: string) => { ok: boolean; message?: string };
  addRun: (run: WorkspaceRun) => void;
  updateRun: (id: string, updates: Partial<WorkspaceRun>) => void;
  addDataset: (dataset: WorkspaceDataset) => void;
  updateDatasetValue: (datasetId: string, recordId: string, field: string, value: string, reviewedBy?: string, note?: string) => void;
  createApiKey: (key: WorkspaceApiKey) => void;
  revokeApiKey: (id: string) => void;
  addMonitor: (monitor: WorkspaceMonitor) => void;
  addSource: (source: string) => void;
  removeSource: (source: string) => void;
};

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
const seededRuns: Record<string, WorkspaceRun[]> = {
  studio: [
    { id: 'run_batch_91af', when: 'Running now', pipeline: 'SaaS pricing research', coverage: '2 / 3 sources', records: '2', queries: 3, state: 'Running', outcome: 'Running', tone: 'info', badge: true, scenario: 'research' },
    { id: 'run_7f3a', when: '2 minutes ago', pipeline: 'Competitor prices', coverage: '3 / 3 sources', records: '3', queries: 3, state: 'Completed', outcome: 'Partial', tone: 'warning', badge: true, scenario: 'compare' },
    { id: 'run_7e91', when: '1 hour ago', pipeline: 'Outdoor catalogue', coverage: '1,284 / 1,284 pages', records: '1,284', queries: 1284, state: 'Completed', outcome: 'Succeeded', tone: 'success', badge: true, scenario: 'collect' },
    { id: 'run_failed_9d11', when: 'Yesterday', pipeline: 'Retail availability', coverage: '2 / 3 sources', records: '2', queries: 3, state: 'Failed', outcome: 'Blocked', tone: 'danger', scenario: 'extract' },
  ],
  northwind: [],
};
const seededDatasets: Record<string, WorkspaceDataset[]> = {
  studio: [
    {
      id: 'competitor-prices', version: 'DATASET · V4', title: 'Competitor prices', detail: '3 records · 5 fields · 1 unresolved', status: 'Needs review', tone: 'warning', href: '/datasets/competitor-prices', recordCount: 3,
      fields: ['Retailer','Product','Price','Availability'], lastUpdated: '2 minutes ago', sourceWorkflow: 'Competitor prices', sourceRunId: 'run_7f3a',
      records: [
        { id: 'northwind', values: { Retailer:'Northwind Outdoors',Product:'Trailhead 2P Tent',Price:'€249.00',Availability:'In stock' }, evidence: { Retailer:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Northwind Outdoors — Trailhead 2P Tent.'}, Product:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249.00 · In stock.'}, Price:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249.00 · In stock.'}, Availability:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249.00 · In stock.'} } },
        { id: 'summit', values: { Retailer:'Summit Supply',Product:'Trailhead Two-Person Tent',Price:'€239.00',Availability:'Low stock' }, evidence: { Retailer:{sourceUrl:'https://summit-supply.example/camping/trailhead-two-person',quote:'Summit Supply — Trailhead Two-Person Tent.'}, Product:{sourceUrl:'https://summit-supply.example/camping/trailhead-two-person',quote:'Trailhead Two-Person Tent — €239.00 · Low stock.'}, Price:{sourceUrl:'https://summit-supply.example/camping/trailhead-two-person',quote:'Trailhead Two-Person Tent — €239.00 · Low stock.'}, Availability:{sourceUrl:'https://summit-supply.example/camping/trailhead-two-person',quote:'Trailhead Two-Person Tent — €239.00 · Low stock.'} } },
        { id: 'trail-shop', values: { Retailer:'Trail Shop',Product:'Trailhead 2 Person',Price:'€259.00',Availability:'Unknown' }, evidence: { Retailer:{sourceUrl:'https://trail-shop.example/search?q=trailhead',quote:'Trail Shop — Trailhead 2 Person.'}, Product:{sourceUrl:'https://trail-shop.example/search?q=trailhead',quote:'Trailhead 2 Person — €259.00.'}, Price:{sourceUrl:'https://trail-shop.example/search?q=trailhead',quote:'Trailhead 2 Person — €259.00.'}, Availability:{sourceUrl:'https://trail-shop.example/search?q=trailhead',quote:'No availability statement appears on the captured page.'} } },
      ],
    },
    { id: 'outdoor-catalogue', version: 'DATASET · V7', title: 'Outdoor catalogue', detail: '1,284 records · 8 fields · fully validated', status: 'Validated', tone: 'success', href: '/datasets/outdoor-catalogue', recordCount: 1284, fields: ['Product','Price','Availability','URL'], lastUpdated:'1 hour ago', sourceWorkflow:'Outdoor catalogue', sourceRunId:'run_7e91', records: [{ id:'summit-solo', values:{Product:'Summit Solo Tent',Price:'€179',Availability:'In stock',URL:'northwind-outdoors.example/tents/summit-solo'}, evidence:{Product:{sourceUrl:'https://northwind-outdoors.example/tents/summit-solo',quote:'Summit Solo Tent — €179 · In stock.'},Price:{sourceUrl:'https://northwind-outdoors.example/tents/summit-solo',quote:'Summit Solo Tent — €179 · In stock.'},Availability:{sourceUrl:'https://northwind-outdoors.example/tents/summit-solo',quote:'Summit Solo Tent — €179 · In stock.'},URL:{sourceUrl:'https://northwind-outdoors.example/tents/summit-solo',quote:'Summit Solo Tent product page.'}}}] },
    { id: 'qualified-suppliers', version: 'DATASET · V2', title: 'Qualified suppliers', detail: '74 records · 9 fields · 6 unresolved', status: 'Partial', tone: 'warning', href: '/datasets/qualified-suppliers', recordCount:74, fields:['Company','Location','Categories','Minimum order'], lastUpdated:'Yesterday', sourceWorkflow:'Qualified supplier discovery', sourceRunId:'run_supplier_2b81', records:[{id:'northwind-trade',values:{Company:'Northwind Trade',Location:'Rotterdam',Categories:'Tents, packs','Minimum order':'€500'},evidence:{Company:{sourceUrl:'https://worthington-directory.example/northwind-trade',quote:'Northwind Trade — wholesale outdoor equipment.'},Location:{sourceUrl:'https://worthington-directory.example/northwind-trade',quote:'Based in Rotterdam, Netherlands.'},Categories:{sourceUrl:'https://worthington-directory.example/northwind-trade',quote:'Categories: tents and packs.'},'Minimum order':{sourceUrl:'https://worthington-directory.example/northwind-trade',quote:'Minimum order €500.'}}}] },
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
const seededSources: Record<string, string[]> = { studio: [], northwind: [] };
const legacyFixedRunIds = new Set(['run_collect', 'run_discover', 'run_extract', 'run_monitor']);

function normalizeRuns(collections: Record<string, WorkspaceRun[]> | undefined) {
  if (!collections) return {};
  return Object.fromEntries(Object.entries(collections).map(([workspaceId, runs]) => [
    workspaceId,
    runs.filter((run) => !legacyFixedRunIds.has(run.id)),
  ]));
}

function normalizeDatasets(collections: Record<string, WorkspaceDataset[]> | undefined) {
  if (!collections) return {};
  return Object.fromEntries(Object.entries(collections).map(([workspaceId, datasets]) => {
    const seen = new Set<string>();
    const normalized = datasets.flatMap((dataset) => {
      if (seen.has(dataset.title)) return [];
      seen.add(dataset.title);
      const stableIds: Record<string,string> = {
        'SaaS pricing research': 'saas-pricing-research',
        'Extract': 'extract',
        'Build a dataset': 'build-a-dataset',
        'Qualified supplier discovery': 'supplier-discovery',
        'Trailhead baseline': 'trailhead-baseline',
        'Competitor prices': 'competitor-prices',
      };
      const stableId = stableIds[dataset.title] ?? dataset.id;
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
        href: `/datasets/${stableId}`,
        detail: recordCount === null
          ? dataset.detail
          : dataset.detail.replace(/^\d+ records?/, `${recordCount} ${recordCount === 1 ? 'record' : 'records'}`),
      }];
    });
    return [workspaceId, normalized];
  }));
}

const storageKey = 'importio-studio-demo-auth';
const AuthContext = createContext<AuthInterface | null>(null);

export function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    workspaces: seededWorkspaces,
    membersByWorkspace: seededMembers,
    runsByWorkspace: seededRuns,
    datasetsByWorkspace: seededDatasets,
    apiKeysByWorkspace: seededApiKeys,
    monitorsByWorkspace: seededMonitors,
    sourcesByWorkspace: seededSources,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<AuthState>;
          setState({
            session: parsed.session ?? null,
            workspaces: parsed.workspaces ?? seededWorkspaces,
            membersByWorkspace: { ...seededMembers, ...parsed.membersByWorkspace },
            runsByWorkspace: { ...seededRuns, ...normalizeRuns(parsed.runsByWorkspace) },
            datasetsByWorkspace: { ...seededDatasets, ...normalizeDatasets(parsed.datasetsByWorkspace) },
            apiKeysByWorkspace: { ...seededApiKeys, ...parsed.apiKeysByWorkspace },
            monitorsByWorkspace: { ...seededMonitors, ...parsed.monitorsByWorkspace },
            sourcesByWorkspace: { ...seededSources, ...parsed.sourcesByWorkspace },
            demoRole: parsed.demoRole,
          });
        } catch { window.localStorage.removeItem(storageKey); }
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (ready) window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [ready, state]);

  const signIn = useCallback((method: SignInMethod) => {
    setState((current) => {
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
          sourcesByWorkspace: { ...current.sourcesByWorkspace, [id]: [] },
        };
      }
      const user = method.type === 'email'
        ? { id: `email-${method.email.toLowerCase()}`, name: method.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), email: method.email }
        : jordan;
      return { ...current, session: { user, workspaceId: 'studio', role: 'Owner' }, demoRole: undefined };
    });
  }, []);
  const signOut = useCallback(() => setState((current) => ({ ...current, session: null, demoRole: undefined })), []);
  const switchWorkspace = useCallback((id: string) => setState((current) => {
    if (!current.session) return current;
    const workspace = current.workspaces.find((item) => item.id === id);
    if (!workspace) return current;
    return { ...current, session: { ...current.session, workspaceId: id, role: workspace.role }, demoRole: undefined };
  }), []);
  const createWorkspace = useCallback((name: string) => setState((current) => {
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
      sourcesByWorkspace: { ...current.sourcesByWorkspace, [id]: [] },
      demoRole: undefined,
    };
  }), []);
  const setDemoRole = useCallback((role?: Role) => setState((current) => ({ ...current, demoRole: role })), []);
  const updateMembers = useCallback((updater: (members: Member[]) => Member[]) => setState((current) => {
    if (!current.session) return current;
    const id = current.session.workspaceId;
    return { ...current, membersByWorkspace: { ...current.membersByWorkspace, [id]: updater(current.membersByWorkspace[id] ?? []) } };
  }), []);
  const inviteMembers = useCallback((emails: string[], role: Role) => updateMembers((members) => [...members, ...emails.map((email) => ({ id: `invite-${email}-${Date.now()}`, name: 'Pending invite', email, role, lastActive: 'Invited', status: 'Invited' as const }))]), [updateMembers]);
  const resendInvite = useCallback((id: string) => updateMembers((members) => members.map((member) => member.id === id ? { ...member, lastActive: 'Invited · resent now' } : member)), [updateMembers]);
  const revokeInvite = useCallback((id: string) => updateMembers((members) => members.filter((member) => member.id !== id)), [updateMembers]);
  const changeMemberRole = useCallback((id: string, role: Role) => {
    if (!state.session) return { ok: false, message: 'Sign in to manage members.' };
    if ((state.demoRole ?? state.session.role) !== 'Owner' && role === 'Owner') return { ok: false, message: 'Only an Owner can assign the Owner role.' };
    const members = state.membersByWorkspace[state.session.workspaceId] ?? [];
    const target = members.find((member) => member.id === id);
    const owners = members.filter((member) => member.role === 'Owner' && member.status !== 'Invited');
    if (target?.role === 'Owner' && role !== 'Owner' && owners.length === 1) return { ok: false, message: 'At least one Owner must remain.' };
    updateMembers((current) => current.map((member) => member.id === id ? { ...member, role } : member));
    return { ok: true };
  }, [state.demoRole, state.membersByWorkspace, state.session, updateMembers]);
  const removeMember = useCallback((id: string) => {
    if (!state.session) return { ok: false, message: 'Sign in to manage members.' };
    const members = state.membersByWorkspace[state.session.workspaceId] ?? [];
    const target = members.find((member) => member.id === id);
    const owners = members.filter((member) => member.role === 'Owner' && member.status !== 'Invited');
    if (target?.role === 'Owner' && owners.length === 1) return { ok: false, message: 'The last Owner cannot be removed.' };
    updateMembers((current) => current.filter((member) => member.id !== id));
    return { ok: true };
  }, [state.membersByWorkspace, state.session, updateMembers]);
  const updateWorkspaceCollection = useCallback(<T,>(key: 'runsByWorkspace' | 'datasetsByWorkspace' | 'apiKeysByWorkspace' | 'monitorsByWorkspace' | 'sourcesByWorkspace', updater: (items: T[]) => T[]) => {
    setState((current) => {
      if (!current.session) return current;
      const workspaceId = current.session.workspaceId;
      const collections = current[key] as Record<string, T[]>;
      const nextItems = updater(collections[workspaceId] ?? []);
      return {
        ...current,
        [key]: { ...collections, [workspaceId]: nextItems },
        workspaces: current.workspaces.map((workspace) => workspace.id === workspaceId ? { ...workspace, empty: false } : workspace),
      } as AuthState;
    });
  }, []);
  const addRun = useCallback((run: WorkspaceRun) => updateWorkspaceCollection<WorkspaceRun>('runsByWorkspace', (runs) => [run, ...runs.filter((item) => item.id !== run.id)]), [updateWorkspaceCollection]);
  const updateRun = useCallback((id: string, updates: Partial<WorkspaceRun>) => updateWorkspaceCollection<WorkspaceRun>('runsByWorkspace', (runs) => runs.map((run) => run.id === id ? { ...run, ...updates } : run)), [updateWorkspaceCollection]);
  const addDataset = useCallback((dataset: WorkspaceDataset) => updateWorkspaceCollection<WorkspaceDataset>('datasetsByWorkspace', (datasets) => [dataset, ...datasets.filter((item) => item.id !== dataset.id)]), [updateWorkspaceCollection]);
  const updateDatasetValue = useCallback((datasetId: string, recordId: string, field: string, value: string, reviewedBy?: string, note?: string) => updateWorkspaceCollection<WorkspaceDataset>('datasetsByWorkspace', (datasets) => datasets.map((dataset) => dataset.id !== datasetId ? dataset : {
    ...dataset,
    lastUpdated: 'Just now',
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
  })), [updateWorkspaceCollection]);
  const createApiKey = useCallback((key: WorkspaceApiKey) => updateWorkspaceCollection<WorkspaceApiKey>('apiKeysByWorkspace', (keys) => [...keys, key]), [updateWorkspaceCollection]);
  const revokeApiKey = useCallback((id: string) => updateWorkspaceCollection<WorkspaceApiKey>('apiKeysByWorkspace', (keys) => keys.filter((key) => key.id !== id)), [updateWorkspaceCollection]);
  const addMonitor = useCallback((monitor: WorkspaceMonitor) => updateWorkspaceCollection<WorkspaceMonitor>('monitorsByWorkspace', (monitors) => [monitor, ...monitors.filter((item) => item.id !== monitor.id)]), [updateWorkspaceCollection]);
  const addSource = useCallback((source: string) => updateWorkspaceCollection<string>('sourcesByWorkspace', (sources) => sources.includes(source) ? sources : [...sources, source]), [updateWorkspaceCollection]);
  const removeSource = useCallback((source: string) => updateWorkspaceCollection<string>('sourcesByWorkspace', (sources) => sources.filter((item) => item !== source)), [updateWorkspaceCollection]);

  const currentWorkspace = state.session ? state.workspaces.find((item) => item.id === state.session?.workspaceId) ?? null : null;
  const currentRole = state.session ? state.demoRole ?? state.session.role : null;
  const session = useMemo(() => state.session && currentRole ? { ...state.session, role: currentRole } : null, [currentRole, state.session]);
  const value = useMemo<AuthInterface>(() => ({
    ready, session, currentUser: session?.user ?? null, currentRole, currentWorkspace, workspaces: state.workspaces,
    members: session ? state.membersByWorkspace[session.workspaceId] ?? [] : [], demoRole: state.demoRole,
    runs: session ? state.runsByWorkspace[session.workspaceId] ?? [] : [],
    datasets: session ? state.datasetsByWorkspace[session.workspaceId] ?? [] : [],
    apiKeys: session ? state.apiKeysByWorkspace[session.workspaceId] ?? [] : [],
    monitors: session ? state.monitorsByWorkspace[session.workspaceId] ?? [] : [],
    sources: session ? state.sourcesByWorkspace[session.workspaceId] ?? [] : [],
    getSession: () => session, signIn, signOut, switchWorkspace, createWorkspace, setDemoRole, inviteMembers, resendInvite, revokeInvite, changeMemberRole, removeMember,
    addRun, updateRun, addDataset, updateDatasetValue, createApiKey, revokeApiKey, addMonitor, addSource, removeSource,
  }), [addDataset, addMonitor, addRun, addSource, changeMemberRole, createApiKey, createWorkspace, currentRole, currentWorkspace, inviteMembers, ready, removeMember, removeSource, resendInvite, revokeApiKey, revokeInvite, session, signIn, signOut, state.apiKeysByWorkspace, state.datasetsByWorkspace, state.demoRole, state.membersByWorkspace, state.monitorsByWorkspace, state.runsByWorkspace, state.sourcesByWorkspace, state.workspaces, switchWorkspace, setDemoRole, updateDatasetValue, updateRun]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within DemoAuthProvider');
  return value;
}
