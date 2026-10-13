'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Eyebrow } from '@/components/design-system';
import { RunSession } from './run-session';
import { RunDetailAction } from './run-detail-action';
import { useStudio, type WorkspaceRun } from '@/lib/data';

export type RunDetailData = {
  title: string;
  description: string;
  status: 'running' | 'completed' | 'failed';
  badge: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  metrics: string[];
  actionHref?: string;
  actionLabel?: string;
};

function detailStatus(state: WorkspaceRun['state']): RunDetailData['status'] {
  if (state === 'Completed') return 'completed';
  if (state === 'Failed') return 'failed';
  return 'running';
}

function researchStatus(state: 'Running' | 'Complete'): 'running' | 'complete' {
  return state === 'Complete' ? 'complete' : 'running';
}

export function RunDetail({ id, run }: { id: string; run: RunDetailData }) {
  const runs = useStudio((snapshot) => snapshot.auth.runs);
  const reviewState = useStudio((snapshot) => ({ hasReviewItem: snapshot.humanReview.hasReviewItem, datasets: snapshot.auth.datasets }));
  const execution = useStudio((snapshot) => snapshot.execution);
  const searchParams = useSearchParams();
  const currentId = searchParams.get('run') ?? id;
  const [engineResult, setEngineResult] = useState<{ id: string; run?: WorkspaceRun }>();
  const engineRun = engineResult?.id === currentId ? engineResult.run : undefined;
  const workspaceRun = engineRun ?? runs.find((item) => item.id === currentId);
  useEffect(() => {
    let active = true;
    void execution.getRun(currentId).then((nextRun) => {
      if (active) setEngineResult({ id: currentId, run: nextRun });
    });
    return () => { active = false; };
  }, [currentId, execution]);
  const [researchState, setResearchState] = useState<'idle' | 'running' | 'complete'>('idle');
  const [apiOpen, setApiOpen] = useState(false);
  const isResearch = currentId === 'run_batch_91af';
  const researchResolved = researchState === 'complete';
  const sourceTotal = workspaceRun?.coverage.match(/[\d,]+/g)?.at(-1) ?? '1';
  const competitorUnresolved = reviewState.datasets.find((dataset) => dataset.id === 'competitor-prices')?.unresolvedCount ?? 0;
  const issueCount = currentId === 'run_7f3a' ? String(competitorUnresolved) : ['Partial','Blocked'].includes(workspaceRun?.outcome ?? 'Succeeded') ? '1' : '0';
  const workspaceDetail: RunDetailData | null = workspaceRun ? {
    title: workspaceRun.pipeline,
    description: currentId === 'run_7f3a' && competitorUnresolved === 0 ? 'Completed run · 3 / 3 sources · review resolved' : `${workspaceRun.state} run · ${workspaceRun.coverage} · ${workspaceRun.records} ${workspaceRun.records === '1' ? 'record' : 'records'}`,
    status: detailStatus(workspaceRun.state),
    badge: `${workspaceRun.state} · ${workspaceRun.outcome}`,
    tone: workspaceRun.tone,
    metrics: [sourceTotal, workspaceRun.state === 'Completed' ? sourceTotal : workspaceRun.records, issueCount, workspaceRun.records],
    actionHref: workspaceRun.state === 'Completed' ? '/datasets' : undefined,
    actionLabel: workspaceRun.state === 'Completed' ? 'Open datasets' : undefined,
  } : null;
  const baseDisplayRun = workspaceDetail ?? run;
  const displayRun = isResearch && researchResolved
    ? {
        ...baseDisplayRun,
        description: 'Completed run · 3 SaaS sources · all records supported',
        status: 'completed' as const,
        badge: 'Completed · Succeeded',
        tone: 'success' as const,
        metrics: ['3', '3', '0', '3'],
        actionHref: '/build?template=research',
        actionLabel: 'Review data',
      }
    : isResearch && researchState === 'running'
      ? {
          ...baseDisplayRun,
          badge: 'Running',
          metrics: ['3', '2', '0', '2'],
        }
    : baseDisplayRun;
  const fromReview = searchParams.get('from') === 'review';
  const unresolvedReview = competitorUnresolved;
  const needsInput = isResearch && !researchResolved;
  const needsReview = currentId === 'run_7f3a' && unresolvedReview > 0 && reviewState.hasReviewItem;
  return (
    <div className="page">
      <Link href="/runs" className="back-link">← Runs</Link>
      <header className="page-head run-detail-heading">
        <div><Eyebrow>Runs / {currentId}</Eyebrow><h1>{displayRun.title}</h1><p>{displayRun.description}</p></div>
        <div><Badge tone={displayRun.tone}>{displayRun.badge}</Badge><RunDetailAction status={displayRun.status} runId={currentId} href={displayRun.actionHref} label={displayRun.actionLabel} /></div>
      </header>
      {fromReview ? <section className="run-context-banner"><span><strong>Availability needs review</strong><small>Price supported; availability not found.</small></span><Button variant="secondary" asChild><Link href="/review">Back to review</Link></Button></section> : null}
      <div className="run-control-row"><Button variant="secondary" onClick={() => setApiOpen(true)}>Get API code</Button>{needsInput ? <Button variant="secondary" onClick={() => window.dispatchEvent(new Event('studio:resolve-run-input'))}>Resolve inputs (1)</Button> : null}</div>
      <Dialog open={apiOpen} onOpenChange={setApiOpen}><DialogContent><DialogHeader><DialogTitle>Run with the API</DialogTitle><DialogDescription>Use the same saved pipeline and bounded mock inputs.</DialogDescription></DialogHeader><pre className="api-code"><code>{`curl -X POST https://api.import.io/v1/runs \\\n  -d '{"pipeline":"${displayRun.title}","run_id":"${currentId}"}'`}</code></pre></DialogContent></Dialog>
      <section className="metric-grid run-detail-metrics">
        <article><small>Sources</small><b>{displayRun.metrics[0]}</b></article>
        <article><small>Complete</small><b>{displayRun.metrics[1]}</b></article>
        <article><small>{displayRun.status === 'failed' ? 'Blocked' : displayRun.status === 'completed' ? 'Needs review' : 'Needs input'}</small><b>{displayRun.metrics[2]}</b></article>
        <article><small>Supported records</small><b>{displayRun.metrics[3]}</b></article>
      </section>
      {currentId === 'run_7e91' ? <section className="panel domain-queue"><div className="section-head"><div><h2>Domain queue</h2><p>Large runs stay bounded per domain.</p></div><Badge tone="success">1,284 complete</Badge></div><div className="domain-queue-row"><span><strong>northwind-outdoors.example</strong><small>Catalogue pages 1–1,284</small></span><span>1,284 / 1,284</span><Badge tone="success">Complete</Badge></div></section> : null}
      <RunSession
        runId={currentId}
        onResearchResolved={() => setResearchState('complete')}
        onResearchStateChange={(state) => setResearchState(researchStatus(state))}
      />
      <section className={`run-sticky-actions${needsInput || needsReview ? ' warning' : ''}`}><span>{needsInput ? <><strong>BrightSend needs input</strong><small>Resolve 1 input to review data.</small></> : needsReview ? <><strong>Availability needs review</strong><small>Trail Shop availability was not found.</small></> : <><strong>Run complete</strong><small>Review the supported records and retained evidence.</small></>}</span>{needsInput ? <Button variant="primary" onClick={() => window.dispatchEvent(new Event('studio:resolve-run-input'))}>Resolve input</Button> : needsReview ? <Button variant="primary" asChild><Link href="/review">Open review item</Link></Button> : <Button variant="primary" asChild><Link href={displayRun.actionHref ?? '/datasets'}>Review data</Link></Button>}</section>
    </div>
  );
}
