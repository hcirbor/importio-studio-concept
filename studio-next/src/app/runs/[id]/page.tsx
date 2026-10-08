import Link from 'next/link';
import { Badge, Button, Eyebrow } from '@/components/design-system';
import { RunSession } from '@/components/run-session';

const runs = {
  run_7f3a: { title: 'Competitor prices', description: 'Completed run · 3 retailers · one field needs review', completed: true },
  run_batch_91af: { title: 'SaaS pricing research', description: 'Running across approved SaaS pricing domains', completed: false },
};

export function generateStaticParams() { return Object.keys(runs).map((id) => ({ id })); }

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = runs[id as keyof typeof runs] ?? runs.run_7f3a;
  return <div className="page"><Link href="/runs" className="back-link">← Runs</Link><header className="page-head run-detail-heading"><div><Eyebrow>Runs / {id}</Eyebrow><h1>{run.title}</h1><p>{run.description}</p></div><div><Badge tone={run.completed ? 'success' : 'info'}>{run.completed ? 'Completed · Partial' : 'Running'}</Badge>{run.completed ? <Button variant="primary" asChild><Link href="/datasets/competitor-prices">Review data</Link></Button> : <Button variant="secondary">Pause</Button>}</div></header><section className="metric-grid run-detail-metrics"><article><small>Sources</small><b>{run.completed ? '3' : '20'}</b></article><article><small>Complete</small><b>{run.completed ? '3' : '12'}</b></article><article><small>{run.completed ? 'Needs review' : 'Running'}</small><b>{run.completed ? '1' : '6'}</b></article><article><small>Records</small><b>{run.completed ? '3' : '12'}</b></article></section><RunSession runId={id}/></div>;
}
