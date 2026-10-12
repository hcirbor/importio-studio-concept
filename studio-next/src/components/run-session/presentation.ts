import type { RunPresentation as Scenario, RunWorker as Worker, RunWorkerState as WorkerState } from '@/lib/data';

export const pendingScenario: Scenario = { title: '', kind: 'research', completed: false, workers: [{ name: '', domain: '', state: 'Running' }] };
export const stepDefinitions = [
  { title: 'Opened approved source', detail: 'Final URL and capture retained.' },
  { title: 'Inspected navigation', detail: 'Observed links and requested language.' },
  { title: 'Read the requested card', detail: 'Captured the supported fields and evidence.' },
];

export function workerSteps(worker: Worker) {
  const offset = [...worker.domain].reduce((total, character) => total + character.charCodeAt(0), 0) % 8;
  const timings = [3.6, 8.4, 13.1].map((base, index) => `${(base + offset * 0.37 + index * 0.16).toFixed(1)}s`);
  return stepDefinitions.map((item, index) => ({ ...item, duration: timings[index] }));
}
export function workerStatusLabel(worker: Worker) { return worker.availability === 'Unresolved' ? '1 to review' : worker.state; }
export function statusTone(state: WorkerState) { if (state === 'Failed') return 'danger'; if (state === 'Needs input') return 'warning'; if (state === 'Running') return 'info'; return 'success'; }
