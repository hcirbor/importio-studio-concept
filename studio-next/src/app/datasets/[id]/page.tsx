import { WorkspaceDatasetDetail } from '@/components/workspace-dataset-detail';

export const metadata = { title: 'Dataset' };

export function generateStaticParams() {
  return [
    'outdoor-catalogue','qualified-suppliers','saas-pricing-research','extract','build-a-dataset','trailhead-baseline','supplier-discovery',
  ].map((id) => ({ id }));
}

export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceDatasetDetail datasetId={id} />;
}
