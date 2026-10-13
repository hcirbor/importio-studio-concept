'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Eyebrow,
} from '@/components/design-system';
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

const unavailableRun: RunDetailData = {
  title: 'Run unavailable',
  description: 'This run is not available in the current workspace.',
  status: 'failed',
  badge: 'Unavailable',
  tone: 'danger',
  metrics: ['0', '0', '0', '0'],
};

export function RunDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const currentId = searchParams.get('run') ?? id;
  const [apiOpen, setApiOpen] = useState(false);
  const state = useStudio((snapshot) => ({
    run: snapshot.auth.runs.find((item) => item.id === currentId),
    datasets: snapshot.auth.datasets,
    execution: snapshot.execution,
  }));
  const workspaceRun = state.run;
  const dataset = state.datasets.find((item) => item.id === workspaceRun?.datasetId);
  const sourceTotal = workspaceRun?.coverage.match(/[\d,]+/g)?.at(-1) ?? '1';
  const issueCount = dataset?.review?.issueCount ?? workspaceRun?.issueCount ?? 0;
  const actionHref = dataset?.href ?? (workspaceRun?.state === 'Completed' ? '/datasets' : undefined);
  const workspaceDetail: RunDetailData | null = workspaceRun ? {
    title: workspaceRun.pipeline,
    description: dataset?.review?.status === 'Resolved'
      ? `Completed run · ${workspaceRun.coverage} · review resolved`
      : `${workspaceRun.state} run · ${workspaceRun.coverage} · ${workspaceRun.records} ${workspaceRun.records === '1' ? 'record' : 'records'}`,
    status: detailStatus(workspaceRun.state),
    badge: `${workspaceRun.state} · ${workspaceRun.outcome}`,
    tone: workspaceRun.tone,
    metrics: [
      sourceTotal,
      workspaceRun.state === 'Completed' ? sourceTotal : workspaceRun.records,
      String(issueCount),
      workspaceRun.records,
    ],
    actionHref,
    actionLabel: workspaceRun.state === 'Completed' ? 'Review data' : undefined,
  } : null;
  const displayRun = workspaceDetail ?? unavailableRun;
  const fromReview = searchParams.get('from') === 'review';
  const needsInput = workspaceRun?.needsInput;
  const needsReview = dataset?.review?.status === 'Open' && issueCount > 0;

  function resolveInputs() {
    void state.execution.resolveRunDecision(currentId);
  }

  return (
    <div className="page">
      <Link href="/runs" className="back-link">
        ← Runs
      </Link>
      <header className="page-head run-detail-heading">
        <div>
          <Eyebrow>Runs / {currentId}</Eyebrow>
          <h1>{displayRun.title}</h1>
          <p>{displayRun.description}</p>
        </div>
        <div>
          <Badge tone={displayRun.tone}>{displayRun.badge}</Badge>
          <RunDetailAction
            status={displayRun.status}
            runId={currentId}
            href={displayRun.actionHref}
            label={displayRun.actionLabel}
          />
        </div>
      </header>
      {fromReview && needsReview ? (
        <section className="run-context-banner">
          <span>
            <strong>{dataset?.review?.field} needs review</strong>
            <small>Price supported; availability not found.</small>
          </span>
          <Button variant="secondary" asChild>
            <Link href="/review">Back to review</Link>
          </Button>
        </section>
      ) : null}
      <div className="run-control-row">
        <Button variant="secondary" onClick={() => setApiOpen(true)}>
          Get API code
        </Button>
        {needsInput ? (
          <Button variant="secondary" onClick={resolveInputs}>
            Resolve inputs ({needsInput.count})
          </Button>
        ) : null}
      </div>
      <Dialog open={apiOpen} onOpenChange={setApiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run with the API</DialogTitle>
            <DialogDescription>Use the same saved pipeline and bounded mock inputs.</DialogDescription>
          </DialogHeader>
          <pre className="api-code">
            <code>{`curl -X POST https://api.import.io/v1/runs \\\n+  -d '{"pipeline":"${displayRun.title}","run_id":"${currentId}"}'`}</code>
          </pre>
        </DialogContent>
      </Dialog>
      <section className="metric-grid run-detail-metrics">
        <article>
          <small>Sources</small>
          <b>{displayRun.metrics[0]}</b>
        </article>
        <article>
          <small>Complete</small>
          <b>{displayRun.metrics[1]}</b>
        </article>
        <article>
          <small>{displayRun.status === 'failed' ? 'Blocked' : displayRun.status === 'completed' ? 'Needs review' : 'Needs input'}</small>
          <b>{displayRun.metrics[2]}</b>
        </article>
        <article>
          <small>Supported records</small>
          <b>{displayRun.metrics[3]}</b>
        </article>
      </section>
      {workspaceRun?.domainQueue?.length ? (
        <section className="panel domain-queue">
          <div className="section-head">
            <div>
              <h2>Domain queue</h2>
              <p>Large runs stay bounded per domain.</p>
            </div>
            <Badge tone={workspaceRun.domainQueue.every((item) => item.status === 'Complete') ? 'success' : 'info'}>
              {workspaceRun.domainQueue.length} {workspaceRun.domainQueue.length === 1 ? 'domain' : 'domains'}
            </Badge>
          </div>
          {workspaceRun.domainQueue.map((item) => (
            <div className="domain-queue-row" key={item.domain}>
              <span>
                <strong>{item.domain}</strong>
                <small>{item.scope}</small>
              </span>
              <span>{item.progress}</span>
              <Badge tone={item.status === 'Complete' ? 'success' : 'info'}>{item.status}</Badge>
            </div>
          ))}
        </section>
      ) : null}
      <RunSession runId={currentId} />
      <section className={`run-sticky-actions${needsInput || needsReview ? ' warning' : ''}`}>
        <span>
          {needsInput ? (
            <>
              <strong>Input required</strong>
              <small>{needsInput.summary}</small>
            </>
          ) : needsReview ? (
            <>
              <strong>{dataset?.review?.field} needs review</strong>
              <small>{dataset?.review?.summary}</small>
            </>
          ) : (
            <>
              <strong>Run complete</strong>
              <small>Review the supported records and retained evidence.</small>
            </>
          )}
        </span>
        {needsInput ? (
          <Button variant="primary" onClick={resolveInputs}>
            Resolve inputs ({needsInput.count})
          </Button>
        ) : needsReview ? (
          <Button variant="primary" asChild>
            <Link href="/review">Open review item</Link>
          </Button>
        ) : (
          <Button variant="primary" asChild>
            <Link href={displayRun.actionHref ?? '/datasets'}>Review data</Link>
          </Button>
        )}
      </section>
    </div>
  );
}
