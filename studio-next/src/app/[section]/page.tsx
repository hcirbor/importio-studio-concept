import { WorkspaceSection } from '@/components/workspace-section';
import { workspaceSectionSlugs } from '@/components/workspace/registry';

export function generateStaticParams() {
  return workspaceSectionSlugs.map((section) => ({ section }));
}

export default async function WorkspacePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <WorkspaceSection section={section} />;
}
