import { Suspense } from 'react';
import { WorkspaceSection } from '@/components/workspace-section';
import { isWorkspaceSectionSlug, workspaceSectionSlugs, workspaceSectionTitles } from '@/components/workspace/registry';

export function generateStaticParams() {
  return workspaceSectionSlugs.map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: isWorkspaceSectionSlug(section) ? workspaceSectionTitles[section] : 'Pipelines' };
}

export default async function WorkspacePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return (
    <Suspense fallback={<div className="page"><div className="section-loading" aria-label="Loading section" /></div>}>
      <WorkspaceSection section={section} />
    </Suspense>
  );
}
