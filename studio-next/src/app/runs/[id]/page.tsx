import Link from 'next/link';
import { Badge, Eyebrow } from '@/components/design-system';
import { RunSession } from '@/components/run-session';
import { RunDetailAction } from '@/components/run-detail-action';

const runs = {
  run_7f3a: { title: 'Competitor prices', description: 'Completed run · 3 retailers · one field needs review', status: 'completed', badge: 'Completed · Partial', tone: 'success', metrics: ['3','3','1','3'], actionHref: '/datasets/competitor-prices', actionLabel: 'Review data' },
  run_batch_91af: { title: 'SaaS pricing research', description: 'Running across approved SaaS pricing domains', status: 'running', badge: 'Running', tone: 'info', metrics: ['20','12','6','12'] },
  run_7e91: { title: 'Outdoor catalogue', description: 'Completed run · 1,284 pages · all records supported', status: 'completed', badge: 'Completed · Succeeded', tone: 'success', metrics: ['1,284','1,284','0','1,284'], actionHref: '/datasets', actionLabel: 'Open datasets' },
  run_failed_9d11: { title: 'Retail availability', description: 'Failed run · 2 of 3 sources completed · retained evidence available', status: 'failed', badge: 'Failed · Blocked', tone: 'danger', metrics: ['3','2','1','2'] },
};

export function generateStaticParams() { return Object.keys(runs).map((id) => ({ id })); }

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = runs[id as keyof typeof runs] ?? runs.run_7f3a;
  return <div className="page"><Link href="/runs" className="back-link">← Runs</Link><header className="page-head run-detail-heading"><div><Eyebrow>Runs / {id}</Eyebrow><h1>{run.title}</h1><p>{run.description}</p></div><div><Badge tone={run.tone as 'success' | 'info' | 'danger'}>{run.badge}</Badge><RunDetailAction status={run.status as 'running' | 'completed' | 'failed'} href={'actionHref' in run ? run.actionHref : undefined} label={'actionLabel' in run ? run.actionLabel : undefined} /></div></header><section className="metric-grid run-detail-metrics"><article><small>Sources</small><b>{run.metrics[0]}</b></article><article><small>Complete</small><b>{run.metrics[1]}</b></article><article><small>{run.status === 'failed' ? 'Blocked' : run.status === 'completed' && run.metrics[2] === '0' ? 'Unresolved' : run.status === 'completed' ? 'Needs review' : 'Running'}</small><b>{run.metrics[2]}</b></article><article><small>Records</small><b>{run.metrics[3]}</b></article></section><RunSession runId={id}/></div>;
}
