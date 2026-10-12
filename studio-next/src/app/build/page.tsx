import { Suspense } from 'react';
import { WorkflowComposer } from '@/components/workflow-composer';

export const metadata = { title: 'Build' };

export default function BuildPage() {
  return <div className="page build-page"><Suspense fallback={<div className="builder-loading" aria-label="Loading workflow builder" />}><WorkflowComposer /></Suspense></div>;
}
