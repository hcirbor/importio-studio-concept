import { PipelineRepair } from '@/components/pipeline-repair';

export const metadata = { title: 'Pipeline repair' };

export function generateStaticParams() {
  return [{ id: 'competitor-prices' }];
}

export default async function PipelineRepairPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PipelineRepair pipelineId={id} />;
}
