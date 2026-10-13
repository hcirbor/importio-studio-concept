import { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioDataProvider, useStudio } from '@/lib/data';
import { createMockStudioDataSource } from '@/lib/data/mock/mock-control-plane';
import type { StudioDataSource } from '@/lib/data/StudioDataSource';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

let storage: MemoryStorage;

function initialize(source = createMockStudioDataSource()) {
  source.initialize();
  vi.runAllTimers();
  return source;
}

function signedInSource() {
  const source = initialize();
  source.auth.signIn({ type: 'google' });
  return source;
}

beforeEach(() => {
  vi.useFakeTimers();
  storage = new MemoryStorage();
  vi.stubGlobal('window', { localStorage: storage, setTimeout });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('mock Studio data source', () => {
  it('keeps the snapshot reference stable until state changes', () => {
    const source = signedInSource();
    const before = source.getSnapshot();
    expect(source.getSnapshot()).toBe(before);
    source.controlPlane.addSource('https://source.example');
    expect(source.getSnapshot()).not.toBe(before);
    expect(source.getSnapshot()).toBe(source.getSnapshot());
  });

  const mutations: Array<[string, (source: StudioDataSource) => void]> = [
    ['switchWorkspace', (source) => source.controlPlane.switchWorkspace('northwind')],
    ['createWorkspace', (source) => source.controlPlane.createWorkspace('Test workspace')],
    ['inviteMembers', (source) => source.controlPlane.inviteMembers(['new@example.com'], 'Editor')],
    ['resendInvite', (source) => source.controlPlane.resendInvite('priya')],
    ['revokeInvite', (source) => source.controlPlane.revokeInvite('priya')],
    ['changeMemberRole', (source) => { source.controlPlane.changeMemberRole('maya', 'Admin'); }],
    ['removeMember', (source) => { source.controlPlane.removeMember('sam'); }],
    ['addRun', (source) => source.controlPlane.addRun({ id: 'run_test', href: '/runs/run_test', when: 'Just now', pipeline: 'Test', coverage: '1 / 1 sources', records: '1', queries: 1, state: 'Completed', outcome: 'Succeeded', tone: 'success', issueCount: 0 })],
    ['updateRun', (source) => source.controlPlane.updateRun('run_7f3a', { records: '4' })],
    ['addDataset', (source) => source.controlPlane.addDataset({ id: 'test', version: 'DATASET · V1', title: 'Test', detail: '0 records', status: 'Validated', tone: 'success' })],
    ['updateDatasetValue', (source) => source.controlPlane.updateDatasetValue('competitor-prices', 'northwind', 'Price', '€250')],
    ['setDatasetReviewState', (source) => source.controlPlane.setDatasetReviewState('competitor-prices', 0)],
    ['createApiKey', (source) => source.controlPlane.createApiKey({ id: 'key', name: 'Key', display: 'mcp_live_••••test', createdBy: 'Test' })],
    ['revokeApiKey', (source) => source.controlPlane.revokeApiKey('production')],
    ['addMonitor', (source) => source.controlPlane.addMonitor({ id: 'monitor', name: 'Monitor', detail: 'Any change', baselineDataset: 'Test', schedule: 'Daily', lastChange: 'Never', status: 'Scheduled', tone: 'info', fields: ['price'], alertRule: 'Any change' })],
    ['addEnrichment', (source) => source.controlPlane.addEnrichment({ id: 'enrichment', name: 'Enrichment', rowCount: 0, state: 'Validated', outcome: 'Ready', sourceFile: 'test.csv', inputFields: [], enrichedFields: [], rows: [] })],
    ['updateEnrichment', (source) => source.controlPlane.updateEnrichment('supplier-enrichment', { outcome: 'Succeeded' })],
    ['addSource', (source) => source.controlPlane.addSource('https://source.example')],
    ['removeSource', (source) => source.controlPlane.removeSource('https://source.example')],
    ['approvePipelineRepair', (source) => source.controlPlane.approvePipelineRepair('competitor-prices-card-layout')],
    ['rollbackPipelineRepair', (source) => source.controlPlane.rollbackPipelineRepair('competitor-prices-card-layout')],
    ['acceptMonitorBaseline', (source) => source.controlPlane.acceptMonitorBaseline('trailhead-availability-change')],
    ['muteMonitorField', (source) => source.controlPlane.muteMonitorField('trailhead-availability-change')],
    ['setNotificationPreference', (source) => source.controlPlane.setNotificationPreference('Repair ready', 'email', true)],
  ];

  it.each(mutations)('%s notifies subscribers exactly once', (_name, mutate) => {
    const source = signedInSource();
    let notifications = 0;
    const unsubscribe = source.subscribe(() => { notifications += 1; });
    mutate(source);
    expect(notifications).toBe(1);
    unsubscribe();
  });

  it('stops notifications after unsubscribe', () => {
    const source = signedInSource();
    let notifications = 0;
    const unsubscribe = source.subscribe(() => { notifications += 1; });
    unsubscribe();
    source.controlPlane.addSource('https://source.example');
    expect(notifications).toBe(0);
  });

  it('scopes recent pipelines to the workspace and updates review status', () => {
    const source = signedInSource();
    expect(source.getSnapshot().recentPipelines[0]?.status).toBe('Needs review');
    source.controlPlane.setDatasetReviewState('competitor-prices', 0);
    expect(source.getSnapshot().recentPipelines[0]?.status).toBe('Healthy');
    source.controlPlane.switchWorkspace('northwind');
    expect(source.getSnapshot().recentPipelines).toEqual([]);
  });

  it('stores run decisions, review state, issue counts, queues, repairs, and monitor events in the snapshot', () => {
    const snapshot = signedInSource().getSnapshot();
    const inputRun = snapshot.auth.runs.find((run) => run.needsInput);
    const queuedRun = snapshot.auth.runs.find((run) => run.domainQueue?.length);
    const reviewDataset = snapshot.auth.datasets.find((dataset) => dataset.review?.status === 'Open');

    expect(inputRun?.needsInput?.count).toBe(1);
    expect(queuedRun?.domainQueue?.[0]?.domain).toBe('northwind-outdoors.example');
    expect(reviewDataset?.review?.issueCount).toBe(1);
    expect(snapshot.pipelineRepairs[0]?.status).toBe('Ready');
    expect(snapshot.monitorEvents[0]?.status).toBe('New');
  });

  it('derives the human-review queue from each dataset review record', () => {
    const snapshot = signedInSource().getSnapshot();

    expect(snapshot.humanReview.reviewCount).toBe(1);
    expect(snapshot.humanReview.items.map((dataset) => dataset.id)).toEqual(['competitor-prices']);
    expect(snapshot.auth.datasets.find((dataset) => dataset.id === 'outdoor-catalogue')?.review?.status).toBe('Resolved');
    expect(snapshot.auth.runs.find((run) => run.id === 'run_7e91')?.issueCount).toBe(0);
  });

  it('counts review records rather than the number of fields in each decision', () => {
    const source = signedInSource();
    source.controlPlane.addDataset({
      id: 'second-review',
      version: 'DATASET · V1',
      title: 'Second review',
      detail: '1 record · 1 field · 1 unresolved',
      status: 'Needs review',
      tone: 'warning',
      href: '/datasets/second-review',
      recordCount: 1,
      fields: ['Value'],
      lastUpdated: 'Just now',
      unresolvedCount: 1,
      review: {
        title: 'Second review decision',
        status: 'Open',
        issueCount: 4,
        summary: 'A value needs review.',
        description: 'A value needs review.',
        itemDescription: 'Second source · value not found',
        recommendation: 'Accept unknown.',
        captureLabel: 'Second source capture',
        field: 'Value',
      },
      records: [{
        id: 'second-record',
        values: { Value: 'Unknown' },
        evidence: { Value: { sourceUrl: 'https://second-source.example', quote: 'Value not found.' } },
      }],
    });

    expect(source.getSnapshot().humanReview.reviewCount).toBe(2);
    expect(source.getSnapshot().humanReview.items).toHaveLength(2);
  });

  it('normalizes an invalid persisted review against unresolved dataset values', () => {
    const source = signedInSource();
    source.controlPlane.setDatasetReviewState('outdoor-catalogue', 1);
    expect(source.getSnapshot().humanReview.reviewCount).toBe(2);

    const restored = initialize();
    restored.auth.signIn({ type: 'google' });

    expect(restored.getSnapshot().humanReview.items.map((dataset) => dataset.id)).toEqual(['competitor-prices']);
    expect(restored.getSnapshot().auth.datasets.find((dataset) => dataset.id === 'outdoor-catalogue')?.review?.status).toBe('Resolved');
  });

  it('records control-plane demo actions in the audit log', () => {
    const source = signedInSource();
    source.controlPlane.createApiKey({ id: 'audit-key', name: 'Audit key', display: 'mcp_live_••••audit', createdBy: 'Test' });
    source.controlPlane.inviteMembers(['audit@example.com'], 'Editor');
    source.controlPlane.approvePipelineRepair('competitor-prices-card-layout');

    expect(source.getSnapshot().auditEntries.slice(0, 3).map((entry) => entry.action)).toEqual([
      'approved repair for “Competitor prices” and created v5',
      'invited 1 member as Editor',
      'created API key “Audit key”',
    ]);
  });

  it('does not re-render a narrow consumer after an unrelated mutation', async () => {
    const source = signedInSource();
    let renders = 0;
    function SourceCount() {
      renders += 1;
      const sourceCount = useStudio((snapshot) => snapshot.auth.sources.length);
      return createElement('span', null, sourceCount);
    }

    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(createElement(StudioDataProvider, { source }, createElement(SourceCount)));
    });
    expect(renders).toBe(1);

    await act(async () => {
      source.controlPlane.addRun({ id: 'run_unrelated', href: '/runs/run_unrelated', when: 'Just now', pipeline: 'Unrelated', coverage: '1 / 1 sources', records: '1', queries: 1, state: 'Completed', outcome: 'Succeeded', tone: 'success', issueCount: 0 });
    });
    expect(renders).toBe(1);
    renderer?.unmount();
  });

  it('round-trips persisted state and accepts the legacy review shape', () => {
    const first = signedInSource();
    first.controlPlane.addSource('https://persisted.example');
    first.controlPlane.setDatasetReviewState('competitor-prices', 0);

    const restored = initialize();
    expect(restored.getSnapshot().auth.sources).toContain('https://persisted.example');
    expect(restored.getSnapshot().humanReview.reviewCount).toBe(0);

    storage.setItem('importio-studio-review-state', JSON.stringify({ hasReviewItem: true, pipelineVersion: 8 }));
    const legacy = initialize();
    expect(legacy.getSnapshot().humanReview.reviewCount).toBe(0);
    expect(storage.getItem('importio-studio-review-state')).toBeNull();
    expect(storage.getItem('importio-studio-demo-schema')).toBe('phase-3b-review-v3');
  });

  it('resets stale demo content at a schema boundary while preserving the session', () => {
    const first = signedInSource();
    first.controlPlane.setDatasetReviewState('competitor-prices', 0);
    storage.setItem('importio-studio-demo-schema', 'phase-3b-review-v2');

    const restored = initialize();
    const snapshot = restored.getSnapshot();

    expect(snapshot.auth.currentUser?.name).toBe('Jordan Davis');
    expect(snapshot.humanReview.reviewCount).toBe(1);
    expect(snapshot.auth.datasets.find((dataset) => dataset.id === 'outdoor-catalogue')?.recordCount).toBe(1284);
    expect(snapshot.auth.runs.find((run) => run.id === 'run_7e91')?.issueCount).toBe(0);
  });

  it('decodes invalid persisted values and falls back to seeded data', () => {
    storage.setItem('importio-studio-demo-auth', JSON.stringify({
      session: { user: { id: 'jordan', name: 'Jordan Davis', email: 'jordan@example.com' }, workspaceId: 'studio', role: 'Owner' },
      workspaces: [{ id: 42 }],
      sourcesByWorkspace: { studio: ['https://valid.example', 42] },
      runsByWorkspace: { studio: [{ id: 'broken' }] },
      demoRole: 'Superuser',
    }));
    storage.setItem('importio-studio-review-state', JSON.stringify({ studio: { hasReviewItem: 'yes', pipelineVersion: 'five' } }));

    const source = initialize();
    const snapshot = source.getSnapshot();
    expect(snapshot.auth.currentWorkspace?.name).toBe('Northwind Research');
    expect(snapshot.auth.sources).toEqual([]);
    expect(snapshot.auth.runs[0]?.id).toBe('run_batch_91af');
    expect(snapshot.auth.currentRole).toBe('Owner');
    expect(snapshot.pipelineRepairs[0]?.baseVersion).toBe(4);
  });

  it('emits mock run events in order and cancellation ends progression', async () => {
    const source = signedInSource();
    const plan = await source.execution.plan({ prompt: 'Research pricing', sources: ['cloudharbor.example', 'letterloop.example', 'brightsend.example'], fields: ['price'] });
    const runId = await source.execution.startRun({ ...plan, name: 'Pricing research', scenario: 'research', completed: false });
    const events: string[] = [];
    const unsubscribe = source.execution.subscribeRunEvents(runId, (event) => events.push(`${event.state}:${event.decisionState ?? 'initial'}`));
    await source.execution.resolveRunDecision(runId);
    await source.execution.cancelRun(runId);
    vi.runAllTimers();
    expect(events).toEqual(['Running:initial', 'Running:Running', 'Failed:initial']);
    expect((await source.execution.getRun(runId))?.state).toBe('Failed');
    unsubscribe();
  });
});
