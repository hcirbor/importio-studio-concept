import { Suspense } from 'react';
import { Eyebrow } from '@/components/design-system';
import { WorkflowComposer } from '@/components/workflow-composer';

export const metadata = { title: 'Research' };

export default function BuildPage() {
  return <div className="page"><header className="page-head"><Eyebrow>Build</Eyebrow><h1>Research</h1><p>Find and compare facts, with evidence from every source.</p></header><Suspense fallback={<div className="builder-loading" aria-label="Loading workflow builder" />}><WorkflowComposer /></Suspense></div>;
}
