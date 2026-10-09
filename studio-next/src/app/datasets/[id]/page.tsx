import { WorkspaceDatasetDetail } from '@/components/workspace-dataset-detail';

export const metadata = { title: 'Dataset' };

export function generateStaticParams() {
  const seeded = [
    'outdoor-catalogue','qualified-suppliers','saas-pricing-research','extract','build-a-dataset','trailhead-baseline','supplier-discovery',
  ];
  const saved = Array.from({ length: 50 }, (_, index) => `saved-dataset-${index + 1}`);
  return [...seeded, ...saved].map((id) => ({ id }));
}

export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceDatasetDetail datasetId={id} />;
}
