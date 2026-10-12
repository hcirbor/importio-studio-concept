import { RunDetail, type RunDetailData } from '@/components/run-detail';

const runs: Record<string, RunDetailData> = {
  run_7f3a: { title: 'Competitor prices', description: 'Completed run · 3 retailers · one field needs review', status: 'completed', badge: 'Completed · Partial', tone: 'success', metrics: ['3','3','1','3'], actionHref: '/datasets/competitor-prices', actionLabel: 'Review data' },
  run_batch_91af: { title: 'SaaS pricing research', description: 'Running across 3 approved SaaS pricing domains · 2 supported records', status: 'running', badge: 'Running · Needs input', tone: 'info', metrics: ['3','2','1','2'] },
  run_7e91: { title: 'Outdoor catalogue', description: 'Completed run · 1,284 pages · all records supported', status: 'completed', badge: 'Completed · Succeeded', tone: 'success', metrics: ['1,284','1,284','0','1,284'], actionHref: '/datasets', actionLabel: 'Open datasets' },
  run_failed_9d11: { title: 'Retail availability', description: 'Failed run · 2 of 3 sources completed · retained evidence available', status: 'failed', badge: 'Failed · Blocked', tone: 'danger', metrics: ['3','2','1','2'] },
  run_collect: { title: 'Northwind tent catalogue', description: 'Completed run · approved catalogue source · all records supported', status: 'completed', badge: 'Completed · Succeeded', tone: 'success', metrics: ['1','3','0','3'], actionHref: '/datasets', actionLabel: 'Open datasets' },
  run_discover: { title: 'Qualified supplier discovery', description: 'Completed run · approved discovery source · all records supported', status: 'completed', badge: 'Completed · Succeeded', tone: 'success', metrics: ['1','3','0','3'], actionHref: '/datasets', actionLabel: 'Open datasets' },
  run_extract: { title: 'Trailhead product extraction', description: 'Completed run · approved product source · all fields supported', status: 'completed', badge: 'Completed · Succeeded', tone: 'success', metrics: ['1','1','0','1'], actionHref: '/datasets', actionLabel: 'Open datasets' },
  run_monitor: { title: 'Trailhead baseline', description: 'Completed run · approved product source · baseline saved', status: 'completed', badge: 'Completed · Succeeded', tone: 'success', metrics: ['1','1','0','1'], actionHref: '/datasets', actionLabel: 'Open datasets' },
};

export function generateStaticParams() { return Object.keys(runs).map((id) => ({ id })); }

function runDetail(id: string) {
  return runs[id] ?? runs.run_7f3a;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: runDetail(id).title };
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = runDetail(id);
  return <RunDetail id={id} run={run} />;
}
