import type {
  ExecutionEngine,
  RunEvent,
  SearchResult,
  StudioControlPlane,
  StudioSnapshot,
  WorkflowPlan,
  WorkflowRequest,
  WorkspaceRun,
} from '@/lib/data/StudioDataSource';
import { domainLabel, mockDomainRecord, mockDomainRecords } from '@/lib/data/mock/mock-web-data';

export function createMockExecution(
  controlPlane: StudioControlPlane,
  getSnapshot: () => StudioSnapshot,
): ExecutionEngine {
  const runListeners = new Map<string, Set<(event: RunEvent) => void>>();

  const emitRun = (run: WorkspaceRun) => {
    const event: RunEvent = { runId: run.id, state: run.state, outcome: run.outcome };
    runListeners.get(run.id)?.forEach((listener) => listener(event));
  };

  const plan = (request: WorkflowRequest): WorkflowPlan => ({
    ...request,
    name: request.prompt.trim() || 'New workflow',
    queries: Math.max(1, request.sources.length),
  });

  return {
    suggest: plan,
    plan,
    validate: (workflow) => ({
      valid: Boolean(workflow.prompt.trim() && workflow.sources.length && workflow.fields.length),
      messages: workflow.prompt.trim() && workflow.sources.length && workflow.fields.length
        ? []
        : ['A prompt, source and field are required.'],
    }),
    startRun: (run) => {
      controlPlane.addRun(run);
      emitRun(run);
    },
    getRun: (runId) => getSnapshot().auth.runs.find((run) => run.id === runId),
    cancelRun: (runId) => {
      controlPlane.updateRun(runId, { state: 'Failed', outcome: 'Partial', tone: 'warning' });
      const run = getSnapshot().auth.runs.find((item) => item.id === runId);
      if (run) emitRun(run);
    },
    subscribeRunEvents: (runId, listener) => {
      const listeners = runListeners.get(runId) ?? new Set<(event: RunEvent) => void>();
      listeners.add(listener);
      runListeners.set(runId, listeners);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) runListeners.delete(runId);
      };
    },
    evidence: (datasetId) => getSnapshot().auth.datasets.find((dataset) => dataset.id === datasetId)?.records ?? [],
    search: (query): SearchResult[] => query.trim() ? [] : [],
    domainLabel,
    recordForDomain: mockDomainRecord,
    recordsForDomains: mockDomainRecords,
    startEnrichment: controlPlane.addEnrichment,
    createMonitor: controlPlane.addMonitor,
  };
}
