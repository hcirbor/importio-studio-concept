import { RunDetail } from '@/components/run-detail';

const runIds = [
  'run_7f3a',
  'run_batch_91af',
  'run_7e91',
  'run_failed_9d11',
  'run_collect',
  'run_discover',
  'run_extract',
  'run_monitor',
  'run_archive_6c10',
];

export function generateStaticParams() {
  return runIds.map((id) => ({ id }));
}

export function generateMetadata() {
  return { title: 'Run detail' };
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RunDetail id={id} />
  );
}
