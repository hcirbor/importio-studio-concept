'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Eyebrow,
  Input,
} from '@/components/design-system';
import { downloadJson } from '@/lib/download-json';
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
import { EnrichmentsSection } from './library-sections';
import { SectionTabs, useSectionTab } from './section-tabs';

const pipelines = [
  {
    name: 'Competitor prices',
    detail: '3 sources · 5 fields',
    version: 'v4',
    lastRun: '2 min ago',
    schedule: 'On demand',
    status: 'Needs review',
    tone: 'warning' as Tone,
    href: '/pipelines/competitor-prices',
  },
  {
    name: 'Outdoor catalogue',
    detail: '12 categories · 8 fields',
    version: 'v7',
    lastRun: '1 hr ago',
    schedule: 'Daily',
    status: 'Healthy',
    tone: 'success' as Tone,
  },
  {
    name: 'Qualified suppliers',
    detail: 'EU region · 9 fields',
    version: 'v2',
    lastRun: 'Yesterday',
    schedule: 'Weekly',
    status: 'Healthy',
    tone: 'success' as Tone,
  },
];

const runs = [
  {
    id: 'run_batch_91af',
    when: 'Running now',
    pipeline: 'SaaS pricing research',
    coverage: '12 / 20 domains',
    records: '12',
    usage: 'Not yet measured',
    state: 'Running',
    outcome: 'Running',
    tone: 'info' as Tone,
  },
  {
    id: 'run_7f3a',
    when: '2 minutes ago',
    pipeline: 'Competitor prices',
    coverage: '3 / 3 sources',
    records: '3',
    usage: 'Not yet measured',
    state: 'Completed',
    outcome: 'Partial',
    tone: 'warning' as Tone,
  },
  {
    id: 'run_7e91',
    when: '1 hour ago',
    pipeline: 'Outdoor catalogue',
    coverage: '1,284 / 1,284 pages',
    records: '1,284',
    usage: 'Not yet measured',
    state: 'Completed',
    outcome: 'Succeeded',
    tone: 'success' as Tone,
  },
  {
    id: 'run_failed_9d11',
    when: 'Yesterday',
    pipeline: 'Retail availability',
    coverage: '2 / 3 sources',
    records: '2',
    usage: '$0.18',
    state: 'Failed',
    outcome: 'Blocked',
    tone: 'danger' as Tone,
  },
];

const datasets = [
  {
    version: 'DATASET · V4',
    title: 'Competitor prices',
    detail: '3 records · 5 fields · 1 unresolved',
    status: 'Needs review',
    tone: 'warning' as Tone,
  },
  {
    version: 'DATASET · V7',
    title: 'Outdoor catalogue',
    detail: '1,284 records · 8 fields · fully validated',
    status: 'Validated',
    tone: 'success' as Tone,
  },
  {
    version: 'DATASET · V2',
    title: 'Qualified suppliers',
    detail: '74 records · 9 fields · 6 unresolved',
    status: 'Partial',
    tone: 'warning' as Tone,
  },
];

const baseMonitorRows: TableRow[] = [
  {
    id: 'map-watch',
    cells: [
      <span key="name"><strong>MAP watch</strong><small>Price and seller availability</small></span>,
      'Marketplace sellers',
      'Daily',
      'Yesterday · 12 changes',
      <Status key="status">Healthy</Status>,
    ],
  },
  {
    id: 'trailhead-availability',
    cells: [
      <span key="name"><strong>Trailhead availability</strong><small>Price and stock status</small></span>,
      'Competitor prices',
      'Every 6 hours',
      '3 days ago · low stock',
      <Status key="status">Healthy</Status>,
    ],
  },
  {
    id: 'supplier-terms',
    cells: [
      <span key="name"><strong>Supplier terms</strong><small>Minimum order and lead time</small></span>,
      'Qualified suppliers',
      'Paused',
      '12 days ago',
      <Status key="status" tone="warning">Paused</Status>,
    ],
  },
];

export function PipelinesSection() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [inspected, setInspected] = useState<string>();
  const visiblePipelines = pipelines.filter((pipeline) => {
    const matchesQuery = pipeline.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || pipeline.status === status;
    return matchesQuery && matchesStatus;
  });

  const rows: TableRow[] = visiblePipelines.map((pipeline) => ({
    id: pipeline.name,
    cells: [
      <span key="pipeline"><strong>{pipeline.name}</strong><small>{pipeline.detail}</small></span>,
      pipeline.version,
      pipeline.lastRun,
      pipeline.schedule,
      <Status key="status" tone={pipeline.tone}>{pipeline.status}</Status>,
      pipeline.href ? (
        <Button key="open" variant="ghost" size="sm" asChild>
          <Link href={pipeline.href}>Open</Link>
        </Button>
      ) : (
        <Button key="open" variant="ghost" size="sm" onClick={() => setInspected(pipeline.name)}>
          Open
        </Button>
      ),
    ],
  }));

  return (
    <>
      <PageHead
        group="Operate"
        title="Pipelines"
        description="Reusable pipelines with versioned schemas and execution rules."
        action={<Button variant="primary" asChild><Link href="/build?template=research">New pipeline</Link></Button>}
      />
      <Toolbar search="Search pipelines" value={query} onChange={setQuery}>
        <SelectField
          label="Pipeline status"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'Healthy', label: 'Healthy' },
            { value: 'Needs review', label: 'Needs review' },
          ]}
          className="filter-select"
        />
      </Toolbar>
      <Feedback tone="info">
        {inspected ? `${inspected} selected. This concept uses Competitor prices as the complete detail example.` : undefined}
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

export function RunsSection({ showHeader = true }: { showHeader?: boolean }) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState('all');
  const [state, setState] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [runId, setRunId] = useState('run_7f3a');
  const [error, setError] = useState('');

  const visibleRuns = runs.filter((run) => (
    (workflow === 'all' || run.pipeline === workflow)
    && (state === 'all' || run.state === state)
    && (outcome === 'all' || run.outcome === outcome)
  ));

  function openRun() {
    const run = runs.find((item) => item.id === runId.trim());
    if (!run) {
      setError('Run ID not found in this interactive demo.');
      return;
    }
    setError('');
    router.push(`/runs/${run.id}`);
  }

  const rows: TableRow[] = visibleRuns.map((run) => ({
    id: run.id,
    cells: [
      <span key="run"><strong>{run.id}</strong><small>{run.when}</small></span>,
      run.pipeline,
      run.coverage,
      run.records,
      run.usage,
      <Status key="status" tone={run.tone}>
        {run.state}{run.outcome !== run.state ? ` · ${run.outcome}` : ''}
      </Status>,
      <Button key="open" variant="ghost" size="sm" asChild><Link href={`/runs/${run.id}`}>Open</Link></Button>,
    ],
  }));

  return (
    <>
      {showHeader ? <PageHead group="Operate" title="All runs" description="Every execution, with scope, status, usage and actionable exceptions." /> : null}
      <section className="metric-grid">
        <article><small>Running</small><b>1</b></article>
        <article><small>Partial</small><b>1</b></article>
        <article><small>Completed today</small><b>42</b></article>
        <article><small>Usage today</small><b>Not yet measured</b></article>
      </section>
      <section className="panel run-filters">
        <label>
          WORKFLOW
          <SelectField
            label="Workflow"
            value={workflow}
            onValueChange={setWorkflow}
            options={[
              { value: 'all', label: 'All workflows' },
              { value: 'SaaS pricing research', label: 'SaaS pricing research' },
              { value: 'Competitor prices', label: 'Competitor prices' },
              { value: 'Outdoor catalogue', label: 'Outdoor catalogue' },
            ]}
          />
        </label>
        <label>
          STATE
          <SelectField
            label="State"
            value={state}
            onValueChange={setState}
            options={[
              { value: 'all', label: 'All states' },
              { value: 'Running', label: 'Running' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Failed', label: 'Failed' },
            ]}
          />
        </label>
        <label>
          OUTCOME
          <SelectField
            label="Outcome"
            value={outcome}
            onValueChange={setOutcome}
            options={[
              { value: 'all', label: 'All outcomes' },
              { value: 'Succeeded', label: 'Succeeded' },
              { value: 'Partial', label: 'Partial' },
              { value: 'Blocked', label: 'Blocked' },
            ]}
          />
        </label>
        <label className="open-run">
          OPEN A RUN BY ID
          <Input
            value={runId}
            onChange={(event) => setRunId(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && openRun()}
            aria-invalid={Boolean(error)}
          />
        </label>
        <Button variant="secondary" onClick={openRun}>Open</Button>
      </section>
      <Feedback tone="warning">{error}</Feedback>
      <TablePanel
        headings={['Run', 'Pipeline', 'Coverage', 'Records', 'Usage', 'State → outcome', '']}
        rows={rows}
      />
    </>
  );
}

export function DatasetsSection() {
  const searchParams = useSearchParams();
  const typeTabs = [
    { value: 'all', label: 'All' },
    { value: 'dataset', label: 'Datasets' },
    { value: 'enrichment', label: 'Enrichments' },
  ];
  const type = useSectionTab('type', typeTabs, 'all');
  const [query, setQuery] = useState('');
  const [validation, setValidation] = useState('all');
  const [message, setMessage] = useState('');
  const heading = type === 'enrichment' ? 'Enrichments' : type === 'dataset' ? 'Datasets' : 'All';
  const description = type === 'enrichment'
    ? 'CSV enrichment with a verdict and evidence per cell.'
    : 'Versioned structured outputs ready for review, export and delivery.';
  const visibleDatasets = datasets.filter((dataset) => (
    dataset.title.toLowerCase().includes(query.toLowerCase())
    && (validation === 'all' || dataset.status === validation)
  ));

  function exportDatasets() {
    downloadJson('importio-datasets.json', visibleDatasets.map(({ title, detail, status }) => ({ title, detail, status })));
    setMessage(`${visibleDatasets.length} dataset${visibleDatasets.length === 1 ? '' : 's'} exported as JSON.`);
  }

  return (
    <>
      <PageHead group="Operate" title={heading} description={description} />
      <SectionTabs value={type} tabs={typeTabs} param="type" fallback="all" />
      {type !== 'enrichment' ? <><Toolbar search="Search datasets" value={query} onChange={setQuery}>
        <SelectField
          label="Dataset validation"
          value={validation}
          onValueChange={setValidation}
          options={[
            { value: 'all', label: 'All validation states' },
            { value: 'Validated', label: 'Validated' },
            { value: 'Needs review', label: 'Needs review' },
            { value: 'Partial', label: 'Partial' },
          ]}
          className="filter-select"
        />
        <Button variant="secondary" onClick={exportDatasets}>Export</Button>
      </Toolbar>
      <Feedback>{message}</Feedback>
      <section className="dataset-cards">
        {visibleDatasets.map((dataset) => (
          <article className="panel dataset-card" key={dataset.title}>
            <Eyebrow>{dataset.version}</Eyebrow>
            <h2>{dataset.title}</h2>
            <p>{dataset.detail}</p>
            <footer>
              <Status tone={dataset.tone}>{dataset.status}</Status>
              {dataset.title === 'Competitor prices' ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/datasets/competitor-prices">Review data</Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessage(`${dataset.title} selected. Its complete detail screen is not part of this bounded demo.`)}
                >
                  Open
                </Button>
              )}
            </footer>
          </article>
        ))}
      </section></> : null}
      {type !== 'dataset' ? (
        <EnrichmentsSection showHeader={false} openCreateOnMount={searchParams.get('create') === 'csv'} />
      ) : null}
    </>
  );
}

export function MonitorsSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pipeline, setPipeline] = useState('Competitor prices');
  const [schedule, setSchedule] = useState('Every 6 hours');
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState(false);

  function createMonitor() {
    setCreated(true);
    setDialogOpen(false);
    setMessage(`${pipeline} will be checked ${schedule.toLowerCase()}.`);
  }

  const rows = created
    ? [
        ...baseMonitorRows,
        {
          id: 'new-monitor',
          cells: [
            <span key="name"><strong>{pipeline} monitor</strong><small>New baseline watch</small></span>,
            pipeline,
            schedule,
            'Not checked yet',
            <Status key="status" tone="info">Scheduled</Status>,
          ],
        },
      ]
    : baseMonitorRows;

  return (
    <>
      <PageHead
        group="Operate"
        title="Monitors"
        description="Keep successful pipelines current and review meaningful changes."
        action={<Button variant="primary" onClick={() => setDialogOpen(true)}>Choose a pipeline to monitor</Button>}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a monitor</DialogTitle>
            <DialogDescription>Choose a trusted pipeline and how often Import.io should check for meaningful changes.</DialogDescription>
          </DialogHeader>
          <div className="dialog-form">
            <label>
              PIPELINE
              <SelectField
                label="Pipeline"
                value={pipeline}
                onValueChange={setPipeline}
                options={pipelines.map((item) => ({ value: item.name, label: item.name }))}
              />
            </label>
            <label>
              SCHEDULE
              <SelectField
                label="Schedule"
                value={schedule}
                onValueChange={setSchedule}
                options={['Every 6 hours', 'Daily', 'Weekly'].map((value) => ({ value, label: value }))}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createMonitor}>Create monitor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Feedback>{message}</Feedback>
      <section className="panel monitor-note">
        <div>
          <strong>Monitoring starts after a workflow has a trusted baseline.</strong>
          <p>Choose a saved pipeline, select the fields that matter, then set its schedule and alert rules.</p>
        </div>
        <Status>{created ? '3 active' : '2 active'}</Status>
      </section>
      <TablePanel
        title="Active monitors"
        meta="Next check · 14:00 UTC"
        headings={['Monitor', 'Pipeline', 'Schedule', 'Last change', 'Status']}
        rows={rows}
      />
    </>
  );
}
