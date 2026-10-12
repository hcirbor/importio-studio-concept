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
    ['addRun', (source) => source.controlPlane.addRun({ id: 'run_test', when: 'Just now', pipeline: 'Test', coverage: '1 / 1 sources', records: '1', queries: 1, state: 'Completed', outcome: 'Succeeded', tone: 'success' })],
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
    ['acceptReviewItem', (source) => source.controlPlane.acceptReviewItem()],
    ['restoreReviewItem', (source) => source.controlPlane.restoreReviewItem()],
    ['promotePipeline', (source) => source.controlPlane.promotePipeline()],
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
    source.controlPlane.acceptReviewItem();
    expect(source.getSnapshot().recentPipelines[0]?.status).toBe('Healthy');
    source.controlPlane.switchWorkspace('northwind');
    expect(source.getSnapshot().recentPipelines).toEqual([]);
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
      source.controlPlane.addRun({ id: 'run_unrelated', when: 'Just now', pipeline: 'Unrelated', coverage: '1 / 1 sources', records: '1', queries: 1, state: 'Completed', outcome: 'Succeeded', tone: 'success' });
    });
    expect(renders).toBe(1);
    renderer?.unmount();
  });

  it('round-trips persisted state and accepts the legacy review shape', () => {
    const first = signedInSource();
    first.controlPlane.addSource('https://persisted.example');
    first.controlPlane.acceptReviewItem();

    const restored = initialize();
    expect(restored.getSnapshot().auth.sources).toContain('https://persisted.example');
    expect(restored.getSnapshot().humanReview.hasReviewItem).toBe(false);

    storage.setItem('importio-studio-review-state', JSON.stringify({ hasReviewItem: true, pipelineVersion: 8 }));
    const legacy = initialize();
    expect(legacy.getSnapshot().humanReview.hasReviewItem).toBe(true);
    expect(legacy.getSnapshot().humanReview.pipelineVersion).toBe(8);
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
    expect(snapshot.auth.currentWorkspace?.name).toBe('Import.io Studio');
    expect(snapshot.auth.sources).toEqual([]);
    expect(snapshot.auth.runs[0]?.id).toBe('run_batch_91af');
    expect(snapshot.auth.currentRole).toBe('Owner');
    expect(snapshot.humanReview.pipelineVersion).toBe(4);
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
