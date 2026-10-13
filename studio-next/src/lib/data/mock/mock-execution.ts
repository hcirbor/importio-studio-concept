import { uniqueDatasetIdentity } from '@/lib/dataset-slug';
import type {
  EnrichmentCell, ExecutionEngine, MonitorRequest, RunEvent, RunPresentation, RunWorker,
  StudioControlPlane, StudioSnapshot, WorkflowPlan, WorkflowRequest, WorkspaceRun,
} from '@/lib/data/StudioDataSource';
import { mockDomainRecord } from '@/lib/data/mock/mock-web-data';
import { mockFixtures } from '@/lib/data/mock/mock-fixtures';
import { normalizeFieldName } from '@/lib/workflow/fields';
import { sourceDisplayLabel, sourceDomain } from '@/lib/web/source-domain';

const seededPresentations: Record<string, RunPresentation> = {
  run_7f3a: { title: 'Competitor prices', kind: 'compare', completed: true, workers: [
    { name: 'Northwind Outdoors', domain: 'northwind-outdoors.example', state: 'Complete', price: '€249', availability: 'In stock' },
    { name: 'Summit Supply', domain: 'summit-supply.example', state: 'Complete', price: '€239', availability: 'Low stock' },
    { name: 'Trail Shop', domain: 'trail-shop.example', state: 'Complete', price: '€259', availability: 'Unresolved' },
  ] },
  run_batch_91af: { title: 'SaaS pricing research', kind: 'research', completed: false, workers: [
    { name: 'CloudHarbor', domain: 'cloudharbor.example', state: 'Complete', price: '$18 / month', planDetails: '3 seats · core automation' },
    { name: 'Letterloop', domain: 'letterloop.example', state: 'Complete', price: '$12 / month', planDetails: '500 contacts · email support' },
    { name: 'BrightSend', domain: 'brightsend.example', state: 'Needs input', price: 'Cookie choice', planDetails: '2,000 emails · basic reports' },
  ] },
  run_7e91: { title: 'Outdoor catalogue', kind: 'collect', completed: true, workers: [{ name: 'Northwind catalogue', domain: 'northwind-outdoors.example', state: 'Complete', price: '1,284 products', availability: 'Complete' }] },
  run_failed_9d11: { title: 'Retail availability', kind: 'extract', completed: true, workers: [{ name: 'Trail Shop', domain: 'trail-shop.example', state: 'Failed', price: '€259', availability: 'Blocked' }] },
  run_collect: { title: 'Northwind tent catalogue', kind: 'collect', completed: true, workers: [{ name: 'Northwind catalogue', domain: 'northwind-outdoors.example', state: 'Complete', price: '3 products', availability: '2 pages' }] },
  run_discover: { title: 'Qualified supplier discovery', kind: 'discover', completed: true, workers: [{ name: 'Worthington directory', domain: 'worthington-directory.example', state: 'Complete', price: '3 qualified', availability: '74 candidates' }] },
  run_extract: { title: 'Trailhead product extraction', kind: 'extract', completed: true, workers: [{ name: 'Northwind Outdoors', domain: 'northwind-outdoors.example', state: 'Complete', price: '€249', availability: 'In stock' }] },
  run_monitor: { title: 'Trailhead baseline', kind: 'monitor', completed: true, workers: [{ name: 'Northwind Outdoors', domain: 'northwind-outdoors.example', state: 'Complete', price: '€249', availability: 'Baseline saved' }] },
};

function uniqueRunId(existingIds: Set<string>) {
  let id = '';
  do {
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replaceAll('-', '').slice(0, 6)
      : Math.random().toString(36).slice(2, 8).padEnd(6, '0');
    id = `run_${random}`;
  } while (existingIds.has(id));
  return id;
}

function presentationForPlan(plan: WorkflowPlan): RunPresentation {
  const kind = plan.scenario ?? 'research';
  const domains = plan.sources.map(sourceDomain);
  const seededKey = kind === 'research' ? 'run_batch_91af' : kind === 'compare' ? 'run_7f3a' : `run_${kind}`;
  const seeded = seededPresentations[seededKey];
  if (seeded && seeded.workers.map((worker) => worker.domain).join('|') === domains.join('|')) return seeded;
  const workers: RunWorker[] = plan.sources.map((source) => {
    const domain = sourceDomain(source);
    const record = mockDomainRecord(domain, plan.fields);
    const stated = Object.values(record.values).filter((value): value is string => value !== null);
    return {
      name: sourceDisplayLabel(domain), domain, state: 'Complete',
      price: record.values.starting_price ?? record.values.price ?? stated[0],
      planDetails: record.values.free_trial ? `${record.values.free_trial} free trial` : stated[1],
      availability: record.values.availability ?? record.values.stock ?? undefined,
    };
  });
  return { title: plan.name, kind, completed: plan.completed ?? true, workers };
}

function enrichmentSourceUrl(values: Record<string, string>) {
  const raw = Object.entries(values).find(([field]) => /(?:website|domain|url|source)/i.test(field))?.[1] ?? '';
  return raw && !raw.includes('://') ? `https://${raw}` : raw;
}

function enrichedValue(field: string, rowIndex: number, values: Record<string, string>): EnrichmentCell {
  const source = enrichmentSourceUrl(values);
  const names = ['Industrial tools', 'Business software', 'Outdoor equipment', 'Wholesale distribution', 'Retail'];
  const locations = ['Birmingham, UK', 'Amsterdam, Netherlands', 'Rotterdam, Netherlands', 'Lyon, France', 'Innsbruck, Austria'];
  const value = field === 'category' ? names[rowIndex % names.length] : locations[rowIndex % locations.length];
  const subject = Object.values(values)[0] || `Row ${rowIndex + 1}`;
  return { value, verdict: 'Supported', evidence: { sourceUrl: source || `https://source-${rowIndex + 1}.example`, quote: field === 'category' ? `${subject} describes its business as ${value.toLowerCase()}.` : `${subject} lists ${value} as its main office.` } };
}

export function createMockExecution(controlPlane: StudioControlPlane, getSnapshot: () => StudioSnapshot): ExecutionEngine {
  const listeners = new Map<string, Set<(event: RunEvent) => void>>();
  const presentations = new Map<string, RunPresentation>(Object.entries(seededPresentations));
  const runResults = new Map<string, ReturnType<typeof mockDomainRecord>[]>();
  const events = new Map<string, RunEvent>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const currentRun = (runId: string) => getSnapshot().auth.runs.find((run) => run.id === runId);
  const presentationForRun = (runId: string) => presentations.get(runId) ?? seededPresentations.run_7f3a;
  const emit = (runId: string, decisionState?: RunEvent['decisionState']) => {
    const run = currentRun(runId);
    if (!run) return;
    const event: RunEvent = { runId, state: run.state, outcome: run.outcome, presentation: presentationForRun(runId), ...(decisionState ? { decisionState } : {}) };
    events.set(runId, event);
    listeners.get(runId)?.forEach((listener) => listener(event));
  };
  const suggest = (request: WorkflowRequest): WorkflowPlan => ({ ...request, name: request.prompt.trim() || 'New workflow', queries: Math.max(1, request.sources.length) });

  return {
    suggest,
    plan: async (request) => suggest(request),
    validate: async (workflow) => ({ valid: Boolean(workflow.prompt.trim() && workflow.sources.length && workflow.fields.length), messages: workflow.prompt.trim() && workflow.sources.length && workflow.fields.length ? [] : ['A prompt, source and field are required.'] }),
    startRun: async (plan) => {
      const runId = uniqueRunId(new Set(getSnapshot().auth.runs.map((run) => run.id)));
      const sourceCount = Math.max(1, plan.sources.length);
      const completed = plan.completed ?? true;
      const needsReview = plan.needsReview ?? false;
      const recordCount = plan.recordCount ?? sourceCount;
      const run: WorkspaceRun = {
        id: runId, href: `/runs/run_7f3a?run=${encodeURIComponent(runId)}`, when: completed ? 'Just now' : 'Running now', createdAt: Date.now(), pipeline: plan.name,
        coverage: completed ? `${sourceCount} / ${sourceCount} sources` : `${Math.max(0, sourceCount - 1)} / ${sourceCount} sources`,
        records: completed ? String(recordCount) : String(Math.max(0, recordCount - 1)), queries: plan.queries,
        state: completed ? 'Completed' : 'Running', outcome: completed ? (needsReview ? 'Partial' : 'Succeeded') : 'Running',
        tone: completed ? (needsReview ? 'warning' : 'success') : 'info', badge: true, scenario: plan.scenario,
        issueCount: needsReview ? 1 : 0,
      };
      presentations.set(runId, presentationForPlan(plan));
      runResults.set(runId, plan.sources.map((source) => mockDomainRecord(sourceDomain(source), plan.fields)));
      controlPlane.addRun(run);
      emit(runId);
      return runId;
    },
    getRun: async (runId) => currentRun(runId),
    cancelRun: async (runId) => {
      const timer = timers.get(runId);
      if (timer) clearTimeout(timer);
      timers.delete(runId);
      controlPlane.updateRun(runId, { state: 'Failed', outcome: 'Partial', tone: 'warning' });
      emit(runId);
    },
    subscribeRunEvents: (runId, listener) => {
      const runListeners = listeners.get(runId) ?? new Set<(event: RunEvent) => void>();
      runListeners.add(listener);
      listeners.set(runId, runListeners);
      const existing = events.get(runId);
      if (existing) listener(existing);
      else if (currentRun(runId)) emit(runId);
      return () => { runListeners.delete(listener); if (!runListeners.size) listeners.delete(runId); };
    },
    resolveRunDecision: async (runId) => {
      const presentation = presentationForRun(runId);
      const running: RunPresentation = { ...presentation, workers: presentation.workers.map((worker, index) => index === 2 ? { ...worker, state: 'Running', price: 'Reading plan…' } : worker) };
      presentations.set(runId, running);
      emit(runId, 'Running');
      const timer = setTimeout(() => {
        const complete: RunPresentation = { ...running, completed: true, workers: running.workers.map((worker, index) => index === 2 ? { ...worker, state: 'Complete', price: '$9 / month' } : worker) };
        presentations.set(runId, complete);
        const count = complete.workers.length;
        controlPlane.updateRun(runId, { when: 'Just now', coverage: `${count} / ${count} sources`, records: String(count), state: 'Completed', outcome: 'Succeeded', tone: 'success', issueCount: 0, needsInput: undefined });
        timers.delete(runId);
        emit(runId, 'Complete');
      }, 900);
      timers.set(runId, timer);
    },
    evidence: async (datasetId) => runResults.get(datasetId) ?? getSnapshot().auth.datasets.find((dataset) => dataset.id === datasetId)?.records ?? [],
    search: async (query) => query.trim() ? mockFixtures.searchResults : [],
    startEnrichment: async ({ enrichmentId }) => {
      const enrichment = getSnapshot().auth.enrichments.find((item) => item.id === enrichmentId);
      if (!enrichment) return;
      const runId = uniqueRunId(new Set(getSnapshot().auth.runs.map((run) => run.id)));
      controlPlane.updateEnrichment(enrichment.id, { state: 'Running', runId });
      const plan = suggest({ prompt: enrichment.name, sources: enrichment.rows.map((row) => enrichmentSourceUrl(row.values)).filter(Boolean), fields: enrichment.enrichedFields });
      presentations.set(runId, presentationForPlan({ ...plan, scenario: 'extract', completed: false }));
      const runHref = `/runs/run_7f3a?run=${encodeURIComponent(runId)}`;
      controlPlane.addRun({ id: runId, href: runHref, when: 'Running now', createdAt: Date.now(), pipeline: enrichment.name, coverage: `0 / ${enrichment.rowCount} rows`, records: '0', queries: enrichment.rowCount, state: 'Running', outcome: 'Running', tone: 'info', badge: true, scenario: 'extract', issueCount: 0 });
      controlPlane.updateEnrichment(enrichment.id, { runHref });
      emit(runId);
      const timer = setTimeout(() => {
        const rows = enrichment.rows.map((row, rowIndex) => ({ ...row, enriched: Object.fromEntries(enrichment.enrichedFields.map((field) => [field, enrichedValue(field, rowIndex, row.values)])) }));
        controlPlane.updateEnrichment(enrichment.id, { rows, state: 'Completed', outcome: 'Succeeded', runId });
        controlPlane.updateRun(runId, { coverage: `${enrichment.rowCount} / ${enrichment.rowCount} rows`, records: String(enrichment.rowCount), state: 'Completed', outcome: 'Succeeded', tone: 'success', when: 'Just now' });
        const presentation = presentationForRun(runId);
        presentations.set(runId, { ...presentation, completed: true, workers: presentation.workers.map((worker) => ({ ...worker, state: 'Complete' })) });
        timers.delete(runId);
        emit(runId);
      }, 1200);
      timers.set(runId, timer);
    },
    createMonitor: async (request: MonitorRequest) => {
      const identity = uniqueDatasetIdentity(request.workflowName, getSnapshot().auth.datasets.map((item) => item.id));
      const source = request.sources[0] || 'northwind-outdoors.example';
      const domain = sourceDomain(source);
      const records = [0, 1].map((_, index) => ({
        id: `baseline-${index + 1}`,
        values: Object.fromEntries(request.fields.map((field) => {
          const key = normalizeFieldName(field);
          if (key === 'price' || key === 'starting_price') return [field, '€249'];
          if (key === 'availability' || key === 'stock' || key === 'status') return [field, 'In stock'];
          return [field, null];
        })),
        evidence: Object.fromEntries(request.fields.map((field) => {
          const key = normalizeFieldName(field);
          const known = ['price', 'starting_price', 'availability', 'stock', 'status'].includes(key);
          return [field, { sourceUrl: `https://${domain}`, quote: known ? 'Trailhead 2P Tent — €249 · In stock.' : 'Not stated · unknown' }];
        })),
      }));
      const dataset = {
        id: identity.id, version: 'DATASET · V1', title: identity.title,
        detail: `2 records · ${request.fields.length} ${request.fields.length === 1 ? 'field' : 'fields'} · fully validated`,
        status: 'Validated' as const, tone: 'success' as const, href: `/datasets/${identity.id}`, recordCount: 2,
        fields: request.fields, lastUpdated: 'Just now', updatedAt: Date.now(), unresolvedCount: 0,
        sourceWorkflow: request.workflowName, sourceRunId: request.runId,
        sourceRunHref: request.runId ? getSnapshot().auth.runs.find((run) => run.id === request.runId)?.href : undefined,
        records,
      };
      const fullMonitor = { ...request, id: `monitor-${request.runId ?? Date.now()}`, baselineDataset: dataset.title };
      const { workflowName: _workflowName, sources: _sources, runId: _runId, ...monitor } = fullMonitor;
      controlPlane.addDataset(dataset);
      controlPlane.addMonitor(monitor);
      return { dataset, monitor };
    },
  };
}
