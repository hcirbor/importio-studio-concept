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
import { DatasetExportMenu } from '../dataset-export-menu';
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
import { can, useStudio, viewerTooltip } from '@/lib/data';
import { isTimestampToday, RelativeTime, useCurrentTime } from '../relative-time';

export function PipelinesSection() {
  const auth = useStudio((snapshot) => snapshot.auth);
  const pipelines = useStudio((snapshot) => snapshot.fixtures.pipelines);
  const { pipelineVersion, pipelineStatus } = useStudio((snapshot) => snapshot.humanReview);
  const mayRun = can(auth.session, 'run');
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
        action={mayRun ? <Button variant="primary" asChild><Link href="/build?template=research">New pipeline</Link></Button> : <Button variant="primary" disabled title={viewerTooltip}>New pipeline</Button>}
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
  const auth = useStudio((snapshot) => snapshot.auth);
  const router = useRouter();
  const now = useCurrentTime();
  const [workflow, setWorkflow] = useState('all');
  const [state, setState] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [runId, setRunId] = useState('run_7f3a');
  const [error, setError] = useState('');

  const visibleRuns = auth.runs.filter((run) => (
    (workflow === 'all' || run.pipeline === workflow)
    && (state === 'all' || run.state === state)
    && (outcome === 'all' || run.outcome === outcome)
  ));

  function openRun() {
    const run = auth.runs.find((item) => item.id === runId.trim());
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
      <span key="run"><strong>{run.id}</strong><small><RelativeTime timestamp={run.createdAt} fallback={run.when} /></small></span>,
      run.pipeline,
      run.coverage,
      run.records,
      `$${(run.queries * 0.007).toFixed(2)}`,
      <Status key="status" tone={run.tone}>
        {run.state}{run.outcome !== run.state ? ` · ${run.outcome}` : ''}
      </Status>,
      <Button key="open" variant="ghost" size="sm" asChild><Link href={['run_batch_91af','run_7f3a','run_7e91','run_failed_9d11'].includes(run.id) ? `/runs/${run.id}` : `/runs/run_7f3a?run=${encodeURIComponent(run.id)}`}>Open</Link></Button>,
    ],
  }));
  const runningCount = auth.runs.filter((run) => run.state === 'Running').length;
  const partialCount = auth.runs.filter((run) => run.outcome === 'Partial').length;
  const completedToday = auth.runs.filter((run) => run.state === 'Completed' && (now ? isTimestampToday(run.createdAt, now) : run.when !== 'Yesterday')).length;
  const usageToday = auth.runs.filter((run) => now ? isTimestampToday(run.createdAt, now) : run.when !== 'Yesterday').reduce((sum, run) => sum + run.queries * 0.007, 0);
  const workflowOptions = [...new Set(auth.runs.map((run) => run.pipeline))];

  return (
    <>
      {showHeader ? <PageHead group="Operate" title="All runs" description="Every execution, with scope, status, usage and actionable exceptions." /> : null}
      <section className="metric-grid">
        <article><small>Running</small><b>{runningCount}</b></article>
        <article><small>Partial</small><b>{partialCount}</b></article>
        <article><small>Completed today</small><b>{completedToday}</b></article>
        <article><small>Usage today</small><b>${usageToday.toFixed(2)}</b></article>
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
              ...workflowOptions.map((value) => ({ value, label: value })),
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
  const auth = useStudio((snapshot) => snapshot.auth);
  const searchParams = useSearchParams();
  const typeTabs = [
    { value: 'all', label: 'All' },
    { value: 'dataset', label: 'Datasets' },
    { value: 'enrichment', label: 'Enrichments' },
  ];
  const type = useSectionTab('type', typeTabs, 'all');
  const [query, setQuery] = useState('');
  const [validation, setValidation] = useState('all');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const description = type === 'enrichment'
    ? 'CSV enrichment with a verdict and evidence per cell.'
    : 'Versioned structured outputs ready for review, export and delivery.';
  const visibleDatasets = auth.datasets.filter((dataset) => (
    dataset.title.toLowerCase().includes(query.toLowerCase())
    && (validation === 'all' || dataset.status === validation)
  ));

  const selectedDataset = visibleDatasets.find((dataset) => dataset.id === selectedDatasetId) ?? visibleDatasets[0];

  return (
    <>
      <PageHead group="Operate" title="Datasets" description={description} />
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
        {selectedDataset ? <><SelectField label="Dataset to export" value={selectedDataset.id} onValueChange={setSelectedDatasetId} options={visibleDatasets.map((dataset)=>({value:dataset.id,label:dataset.title}))} className="filter-select" /><DatasetExportMenu dataset={selectedDataset} /></> : null}
      </Toolbar>
      <section className="dataset-cards">
        {visibleDatasets.map((dataset) => (
          <article className="panel dataset-card" key={dataset.id}>
            <Eyebrow>{dataset.version}</Eyebrow>
            <h2>{dataset.title}</h2>
            <p>{dataset.detail}</p>
            <footer>
              <Status tone={dataset.tone}>{dataset.status}</Status>
              <Button variant="ghost" size="sm" asChild><Link href={`/datasets/${dataset.id}`}>Open</Link></Button>
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
  const { auth, execution, fixtures } = useStudio((snapshot) => snapshot);
  const pipelines = fixtures.pipelines;
  const mayCreateMonitor = can(auth.session, 'create_monitor');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pipeline, setPipeline] = useState('Competitor prices');
  const [schedule, setSchedule] = useState('Daily');
  const [watchedFields, setWatchedFields] = useState(['Price', 'Availability']);
  const [alertWhen, setAlertWhen] = useState('Any change');
  const [priceThreshold, setPriceThreshold] = useState('€230');
  const [notifyVia, setNotifyVia] = useState<'Email' | 'Slack' | 'Webhook'>('Email');
  const [message, setMessage] = useState('');
  const fieldsByPipeline: Record<string, string[]> = {
    'Competitor prices': ['Price', 'Availability'],
    'Outdoor catalogue': ['Product', 'Price', 'Availability', 'URL'],
    'Qualified suppliers': ['Company', 'Location', 'Minimum order', 'Lead time'],
  };

  const alertRule = alertWhen === 'Price falls below' ? `Price falls below ${priceThreshold}` : alertWhen;

  async function createMonitor() {
    await execution.createMonitor({
      name: `${pipeline} monitor`,
      detail: `${alertRule} · ${notifyVia}`,
      workflowName: pipeline,
      sources: [],
      schedule,
      lastChange: 'Not checked yet',
      status: 'Scheduled',
      tone: 'info',
      fields: watchedFields,
      alertRule,
      notifyVia,
    });
    setDialogOpen(false);
    setMessage(`${pipeline} will be checked ${schedule.toLowerCase()}.`);
  }

  const rows: TableRow[] = auth.monitors.map((monitor) => ({
    id: monitor.id,
    cells: [
      <span key="name"><strong>{monitor.name}</strong><small>{monitor.detail}</small></span>,
      monitor.baselineDataset,
      monitor.schedule,
      monitor.lastChange,
      <Status key="status" tone={monitor.tone}>{monitor.status}</Status>,
    ],
  }));
  const activeCount = auth.monitors.filter((monitor) => monitor.status !== 'Paused').length;

  return (
    <>
      <PageHead
        group="Operate"
        title="Monitors"
        description="Keep successful pipelines current and review meaningful changes."
        action={<Button variant="primary" disabled={!mayCreateMonitor} title={!mayCreateMonitor ? viewerTooltip : undefined} onClick={() => setDialogOpen(true)}>Choose a pipeline to monitor</Button>}
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
                onValueChange={(value)=>{setPipeline(value);setWatchedFields(fieldsByPipeline[value] ?? []);}}
                options={pipelines.map((item) => ({ value: item.name, label: item.name }))}
              />
            </label>
            <fieldset className="monitor-fields"><legend>FIELDS TO WATCH</legend>{(fieldsByPipeline[pipeline] ?? []).map((field)=><label key={field}><input type="checkbox" checked={watchedFields.includes(field)} onChange={(event)=>setWatchedFields((current)=>event.target.checked?[...current,field]:current.filter((item)=>item!==field))} /> {field}</label>)}</fieldset>
            <label>ALERT WHEN<SelectField label="Alert when" value={alertWhen} onValueChange={setAlertWhen} options={['Any change','Price falls below','Goes out of stock'].map((value)=>({value,label:value}))} /></label>
            {alertWhen === 'Price falls below' ? <label>VALUE<Input value={priceThreshold} onChange={(event)=>setPriceThreshold(event.target.value)} placeholder="€230" /></label> : null}
            <label>NOTIFY VIA<SelectField label="Notify via" value={notifyVia} onValueChange={(value)=>setNotifyVia(value as 'Email'|'Slack'|'Webhook')} options={[{value:'Email',label:`Email · ${auth.currentUser?.email ?? 'current user'}`},{value:'Slack',label:'Slack'},{value:'Webhook',label:'Webhook'}]} /></label>
            <label>SCHEDULE<SelectField label="Schedule" value={schedule} onValueChange={setSchedule} options={['Hourly', 'Daily'].map((value) => ({ value, label: value }))} /></label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!mayCreateMonitor || watchedFields.length === 0} title={!mayCreateMonitor ? viewerTooltip : undefined} onClick={() => void createMonitor()}>Create monitor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Feedback>{message}</Feedback>
      <section className="panel monitor-note">
        <div>
          <strong>Monitoring starts after a workflow has a trusted baseline.</strong>
          <p>Choose a saved pipeline, select the fields that matter, then set its schedule and alert rules.</p>
        </div>
        <Status>{activeCount} active</Status>
      </section>
      <TablePanel
        title="Active monitors"
        meta={`${auth.monitors.length} monitor${auth.monitors.length === 1 ? '' : 's'} · Next check · 14:00 UTC`}
        headings={['Monitor', 'Pipeline', 'Schedule', 'Last change', 'Status']}
        rows={rows}
      />
    </>
  );
}
