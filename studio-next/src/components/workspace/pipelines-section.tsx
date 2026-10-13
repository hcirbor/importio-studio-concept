'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/design-system';
import { can, pipelineVersionForRepair, useStudio, viewerTooltip } from '@/lib/data';
import {
  Feedback,
  PageHead,
  SelectField,
  Status,
  TablePanel,
  Toolbar,
  type TableRow,
  type Tone,
} from './shared';

export function PipelinesSection() {
  const session = useStudio((snapshot) => snapshot.auth.session);
  const pipelines = useStudio((snapshot) => snapshot.fixtures.pipelines);
  const repairs = useStudio((snapshot) => snapshot.pipelineRepairs);
  const mayRun = can(session, 'run');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [inspected, setInspected] = useState<string>();
  const currentPipelines = pipelines.map((pipeline) => {
    const repair = repairs.find((item) => item.pipelineId === pipeline.id);
    const fallbackVersion = Number(pipeline.version.replace(/^v/, ''));
    return repair ? {
      ...pipeline,
      version: `v${pipelineVersionForRepair(repair, fallbackVersion)}`,
      status: repair.status === 'Ready' || repair.status === 'Rolled back' ? 'Repair ready' : 'Healthy',
      tone: repair.status === 'Ready' || repair.status === 'Rolled back' ? 'warning' as Tone : 'success' as Tone,
    } : pipeline;
  });
  const visiblePipelines = currentPipelines.filter((pipeline) => {
    const matchesQuery = pipeline.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || pipeline.status === status;
    return matchesQuery && matchesStatus;
  });
  const rows: TableRow[] = visiblePipelines.map((pipeline) => {
    const pendingRepair = repairs.find((repair) => (
      repair.pipelineId === pipeline.id && repair.status !== 'Approved'
    ));
    return {
      id: pipeline.name,
      cells: [
      <span key="pipeline">
        <strong>{pipeline.name}</strong>
        <small>{pipeline.detail}</small>
      </span>,
      pipeline.version,
      pipeline.lastRun,
      pipeline.schedule,
      pendingRepair ? (
        <Link key="status" href={`/pipelines/${pendingRepair.pipelineId}/repair`}>
          <Status tone="warning">Repair ready</Status>
        </Link>
      ) : (
        <Status key="status" tone={pipeline.tone}>{pipeline.status}</Status>
      ),
      pipeline.href ? (
        <Button key="open" variant="ghost" size="sm" asChild>
          <Link href={pipeline.href}>Open</Link>
        </Button>
      ) : (
        <Button
          key="open"
          variant="ghost"
          size="sm"
          onClick={() => setInspected(pipeline.name)}
        >
          Open
        </Button>
      ),
      ],
    };
  });

  return (
    <>
      <PageHead
        group="Operate"
        title="Pipelines"
        description="Reusable pipelines with versioned schemas and execution rules."
        action={mayRun ? (
          <Button variant="primary" asChild>
            <Link href="/build?template=research">New pipeline</Link>
          </Button>
        ) : (
          <Button variant="primary" disabled title={viewerTooltip}>
            New pipeline
          </Button>
        )}
      />
      <Toolbar
        search="Search pipelines"
        value={query}
        onChange={setQuery}
      >
        <SelectField
          label="Pipeline status"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'Healthy', label: 'Healthy' },
            { value: 'Repair ready', label: 'Repair ready' },
          ]}
          className="filter-select"
        />
      </Toolbar>
      <Feedback tone="info">
        {inspected
          ? `${inspected} selected. This concept uses Competitor prices as the complete detail example.`
          : undefined}
      </Feedback>
      <TablePanel
        title="All pipelines"
        meta={`${rows.length} pipeline${rows.length === 1 ? '' : 's'}`}
        headings={['Pipeline', 'Version', 'Last run', 'Schedule', 'Status', '']}
        rows={rows}
      />
    </>
  );
}
