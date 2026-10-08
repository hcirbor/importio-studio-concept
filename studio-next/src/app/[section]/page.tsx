import { WorkspaceSection } from '@/components/workspace-section';

const sectionSlugs = ['pipelines','runs','datasets','monitors','memories','groups','enrich','search','candidates','qualify','developers','webhooks','usage','settings'];

export function generateStaticParams() { return sectionSlugs.map((section) => ({ section })); }

export default async function WorkspacePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <WorkspaceSection section={section} />;
}
