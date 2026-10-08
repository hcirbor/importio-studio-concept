import { Suspense } from 'react';
import { BuildHeader } from '@/components/build-header';
import { WorkflowComposer } from '@/components/workflow-composer';

export const metadata = { title: 'Build' };

export default function BuildPage() {
  return <div className="page build-page"><Suspense fallback={<header className="page-head build-page-head"><p className="mono-label">Build</p><h1>New workflow</h1><p>Describe the outcome you want from the web.</p></header>}><BuildHeader /></Suspense><Suspense fallback={<div className="builder-loading" aria-label="Loading workflow builder" />}><WorkflowComposer /></Suspense></div>;
}
