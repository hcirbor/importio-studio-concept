'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Eyebrow } from '@/components/design-system';
import { RunSession } from './run-session';
import { RunDetailAction } from './run-detail-action';

export type RunDetailData = {
  title: string;
  description: string;
  status: 'running' | 'completed' | 'failed';
  badge: string;
  tone: 'success' | 'info' | 'danger';
  metrics: string[];
  actionHref?: string;
  actionLabel?: string;
};

export function RunDetail({ id, run }: { id: string; run: RunDetailData }) {
  const [researchState, setResearchState] = useState<'idle' | 'running' | 'complete'>('idle');
  const isResearch = id === 'run_batch_91af';
  const researchResolved = researchState === 'complete';
  const displayRun = isResearch && researchResolved
    ? {
        ...run,
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
          ...run,
          badge: 'Running',
          metrics: ['3', '2', '0', '2'],
        }
    : run;

  return (
    <div className="page">
      <Link href="/runs" className="back-link">← Runs</Link>
      <header className="page-head run-detail-heading">
        <div><Eyebrow>Runs / {id}</Eyebrow><h1>{displayRun.title}</h1><p>{displayRun.description}</p></div>
        <div><Badge tone={displayRun.tone}>{displayRun.badge}</Badge><RunDetailAction status={displayRun.status} href={displayRun.actionHref} label={displayRun.actionLabel} /></div>
      </header>
      <section className="metric-grid run-detail-metrics">
        <article><small>Sources</small><b>{displayRun.metrics[0]}</b></article>
        <article><small>Complete</small><b>{displayRun.metrics[1]}</b></article>
        <article><small>{displayRun.status === 'failed' ? 'Blocked' : displayRun.status === 'completed' && displayRun.metrics[2] === '0' ? 'Unresolved' : displayRun.status === 'completed' ? 'Needs review' : 'Needs input'}</small><b>{displayRun.metrics[2]}</b></article>
        <article><small>Supported records</small><b>{displayRun.metrics[3]}</b></article>
      </section>
      <RunSession
        runId={id}
        researchResolved={researchResolved}
        onResearchResolved={() => setResearchState('complete')}
        onResearchStateChange={(state) => setResearchState(state.toLowerCase() as 'running' | 'complete')}
      />
    </div>
  );
}
