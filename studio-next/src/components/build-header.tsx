'use client';

import { useSearchParams } from 'next/navigation';
import { Eyebrow } from '@/components/design-system';
import { resolveWorkflowTemplate, workflowTemplates } from './workflow-config';

export function BuildHeader() {
  const searchParams = useSearchParams();
  const template = workflowTemplates[resolveWorkflowTemplate(searchParams.get('template'))];

  return (
    <header className="page-head build-page-head">
      <Eyebrow>Build</Eyebrow>
      <h1>{template.title}</h1>
      <p>{template.description}</p>
    </header>
  );
}
