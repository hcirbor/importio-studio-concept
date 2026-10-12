'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { isTimestampToday, RelativeTime, useCurrentTime } from '../relative-time';
import { Feedback, PageHead, SelectField, Status, TablePanel, type TableRow } from './shared';

export function RunsSection({ showHeader = true }: { showHeader?: boolean }) {
  const runs = useStudio((snapshot) => snapshot.auth.runs);
  const router = useRouter();
  const now = useCurrentTime();
  const [workflow, setWorkflow] = useState('all');
  const [state, setState] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [runId, setRunId] = useState('run_7f3a');
  const [error, setError] = useState('');
  const visibleRuns = runs.filter((run) => (workflow === 'all' || run.pipeline === workflow) && (state === 'all' || run.state === state) && (outcome === 'all' || run.outcome === outcome));

  function openRun() {
    const run = runs.find((item) => item.id === runId.trim());
    if (!run) { setError('Run ID not found in this interactive demo.'); return; }
    setError('');
    router.push(`/runs/${run.id}`);
  }

  const rows: TableRow[] = visibleRuns.map((run) => ({ id: run.id, cells: [<span key="run"><strong>{run.id}</strong><small><RelativeTime timestamp={run.createdAt} fallback={run.when} /></small></span>, run.pipeline, run.coverage, run.records, `$${(run.queries * 0.007).toFixed(2)}`, <Status key="status" tone={run.tone}>{run.state}{run.outcome !== run.state ? ` · ${run.outcome}` : ''}</Status>, <Button key="open" variant="ghost" size="sm" asChild><Link href={['run_batch_91af','run_7f3a','run_7e91','run_failed_9d11'].includes(run.id) ? `/runs/${run.id}` : `/runs/run_7f3a?run=${encodeURIComponent(run.id)}`}>Open</Link></Button>] }));
  const runningCount = runs.filter((run) => run.state === 'Running').length;
  const partialCount = runs.filter((run) => run.outcome === 'Partial').length;
  const completedToday = runs.filter((run) => run.state === 'Completed' && (now ? isTimestampToday(run.createdAt, now) : run.when !== 'Yesterday')).length;
  const usageToday = runs.filter((run) => now ? isTimestampToday(run.createdAt, now) : run.when !== 'Yesterday').reduce((sum, run) => sum + run.queries * 0.007, 0);
  const workflowOptions = [...new Set(runs.map((run) => run.pipeline))];

  return <>{showHeader ? <PageHead group="Operate" title="All runs" description="Every execution, with scope, status, usage and actionable exceptions." /> : null}<section className="metric-grid"><article><small>Running</small><b>{runningCount}</b></article><article><small>Partial</small><b>{partialCount}</b></article><article><small>Completed today</small><b>{completedToday}</b></article><article><small>Usage today</small><b>${usageToday.toFixed(2)}</b></article></section><section className="panel run-filters"><label>WORKFLOW<SelectField label="Workflow" value={workflow} onValueChange={setWorkflow} options={[{ value: 'all', label: 'All workflows' }, ...workflowOptions.map((value) => ({ value, label: value }))]} /></label><label>STATE<SelectField label="State" value={state} onValueChange={setState} options={[{ value: 'all', label: 'All states' }, { value: 'Running', label: 'Running' }, { value: 'Completed', label: 'Completed' }, { value: 'Failed', label: 'Failed' }]} /></label><label>OUTCOME<SelectField label="Outcome" value={outcome} onValueChange={setOutcome} options={[{ value: 'all', label: 'All outcomes' }, { value: 'Succeeded', label: 'Succeeded' }, { value: 'Partial', label: 'Partial' }, { value: 'Blocked', label: 'Blocked' }]} /></label><label className="open-run">OPEN A RUN BY ID<Input value={runId} onChange={(event) => setRunId(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && openRun()} aria-invalid={Boolean(error)} /></label><Button variant="secondary" onClick={openRun}>Open</Button></section><Feedback tone="warning">{error}</Feedback><TablePanel headings={['Run', 'Pipeline', 'Coverage', 'Records', 'Usage', 'State → outcome', '']} rows={rows} /></>;
}
