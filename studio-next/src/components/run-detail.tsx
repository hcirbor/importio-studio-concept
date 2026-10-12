'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Badge, Eyebrow } from '@/components/design-system';
import { RunSession } from './run-session';
import { RunDetailAction } from './run-detail-action';
import { useAuth } from '@/lib/auth';

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

export function RunDetail({ id, run }: { id: string; run: RunDetailData }) {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const currentId = searchParams.get('run') ?? id;
  const workspaceRun = auth.runs.find((item) => item.id === currentId);
  const [researchState, setResearchState] = useState<'idle' | 'running' | 'complete'>('idle');
  const isResearch = currentId === 'run_batch_91af';
  const researchResolved = researchState === 'complete';
  const sourceTotal = workspaceRun?.coverage.match(/[\d,]+/g)?.at(-1) ?? '1';
  const workspaceDetail: RunDetailData | null = workspaceRun ? {
    title: workspaceRun.pipeline,
    description: `${workspaceRun.state} run · ${workspaceRun.coverage} · ${workspaceRun.records} ${workspaceRun.records === '1' ? 'record' : 'records'}`,
    status: workspaceRun.state.toLowerCase() as RunDetailData['status'],
    badge: `${workspaceRun.state} · ${workspaceRun.outcome}`,
    tone: workspaceRun.tone,
    metrics: [sourceTotal, workspaceRun.state === 'Completed' ? sourceTotal : workspaceRun.records, ['Partial','Blocked'].includes(workspaceRun.outcome) ? '1' : '0', workspaceRun.records],
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
  const scenarioKey = workspaceRun?.scenario === 'research'
    ? 'run_batch_91af'
    : workspaceRun?.scenario === 'compare'
      ? 'run_7f3a'
      : workspaceRun?.scenario
        ? `run_${workspaceRun.scenario}`
        : undefined;

  return (
    <div className="page">
      <Link href="/runs" className="back-link">← Runs</Link>
      <header className="page-head run-detail-heading">
        <div><Eyebrow>Runs / {currentId}</Eyebrow><h1>{displayRun.title}</h1><p>{displayRun.description}</p></div>
        <div><Badge tone={displayRun.tone}>{displayRun.badge}</Badge><RunDetailAction status={displayRun.status} href={displayRun.actionHref} label={displayRun.actionLabel} /></div>
      </header>
      <section className="metric-grid run-detail-metrics">
        <article><small>Sources</small><b>{displayRun.metrics[0]}</b></article>
        <article><small>Complete</small><b>{displayRun.metrics[1]}</b></article>
        <article><small>{displayRun.status === 'failed' ? 'Blocked' : displayRun.status === 'completed' && displayRun.metrics[2] === '0' ? 'Unresolved' : displayRun.status === 'completed' ? 'Needs review' : 'Needs input'}</small><b>{displayRun.metrics[2]}</b></article>
        <article><small>Supported records</small><b>{displayRun.metrics[3]}</b></article>
      </section>
      <RunSession
        runId={currentId}
        scenarioKey={scenarioKey}
        researchResolved={researchResolved}
        onResearchResolved={() => setResearchState('complete')}
        onResearchStateChange={(state) => setResearchState(state.toLowerCase() as 'running' | 'complete')}
      />
    </div>
  );
}
