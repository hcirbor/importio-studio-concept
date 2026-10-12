import { WorkspaceDatasetDetail } from '@/components/workspace-dataset-detail';
import { datasetTitleFromSlug, generatedDatasetRouteIds } from '@/lib/dataset-slug';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: datasetTitleFromSlug(id) };
}

export function generateStaticParams() {
  const seeded = [
    'outdoor-catalogue','qualified-suppliers','saas-pricing-research','extract','build-a-dataset','trailhead-baseline','supplier-discovery',
  ];
  const legacySaved = Array.from({ length: 50 }, (_, index) => `saved-dataset-${index + 1}`);
  return [...seeded, ...legacySaved, ...generatedDatasetRouteIds].map((id) => ({ id }));
}

export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceDatasetDetail datasetId={id} />;
}
