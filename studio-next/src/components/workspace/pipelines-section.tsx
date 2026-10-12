'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/design-system';
import { can, useStudio, viewerTooltip } from '@/lib/data';
import { Feedback, PageHead, SelectField, Status, TablePanel, Toolbar, type TableRow, type Tone } from './shared';

export function PipelinesSection() {
  const session = useStudio((snapshot) => snapshot.auth.session);
  const pipelines = useStudio((snapshot) => snapshot.fixtures.pipelines);
  const { pipelineVersion, pipelineStatus } = useStudio((snapshot) => ({ pipelineVersion: snapshot.humanReview.pipelineVersion, pipelineStatus: snapshot.humanReview.pipelineStatus }));
  const mayRun = can(session, 'run');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [inspected, setInspected] = useState<string>();
  const currentPipelines = pipelines.map((pipeline) => pipeline.name === 'Competitor prices'
    ? { ...pipeline, version: `v${pipelineVersion}`, status: pipelineStatus, tone: pipelineStatus === 'Healthy' ? 'success' as Tone : 'warning' as Tone }
    : pipeline);
  const visiblePipelines = currentPipelines.filter((pipeline) => {
    const matchesQuery = pipeline.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || pipeline.status === status;
    return matchesQuery && matchesStatus;
  });
  const rows: TableRow[] = visiblePipelines.map((pipeline) => ({ id: pipeline.name, cells: [<span key="pipeline"><strong>{pipeline.name}</strong><small>{pipeline.detail}</small></span>, pipeline.version, pipeline.lastRun, pipeline.schedule, <Status key="status" tone={pipeline.tone}>{pipeline.status}</Status>, pipeline.href ? <Button key="open" variant="ghost" size="sm" asChild><Link href={pipeline.href}>Open</Link></Button> : <Button key="open" variant="ghost" size="sm" onClick={() => setInspected(pipeline.name)}>Open</Button>] }));

  return <><PageHead group="Operate" title="Pipelines" description="Reusable pipelines with versioned schemas and execution rules." action={mayRun ? <Button variant="primary" asChild><Link href="/build?template=research">New pipeline</Link></Button> : <Button variant="primary" disabled title={viewerTooltip}>New pipeline</Button>} /><Toolbar search="Search pipelines" value={query} onChange={setQuery}><SelectField label="Pipeline status" value={status} onValueChange={setStatus} options={[{ value: 'all', label: 'All statuses' }, { value: 'Healthy', label: 'Healthy' }, { value: 'Needs review', label: 'Needs review' }]} className="filter-select" /></Toolbar><Feedback tone="info">{inspected ? `${inspected} selected. This concept uses Competitor prices as the complete detail example.` : undefined}</Feedback><TablePanel title="All pipelines" meta={`${rows.length} pipeline${rows.length === 1 ? '' : 's'}`} headings={['Pipeline', 'Version', 'Last run', 'Schedule', 'Status', '']} rows={rows} /></>;
}
