import { sectionSlugs, WorkspaceSection } from '@/components/workspace-section';

export function generateStaticParams() { return sectionSlugs.map((section) => ({ section })); }

export default async function WorkspacePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <WorkspaceSection section={section} />;
}
