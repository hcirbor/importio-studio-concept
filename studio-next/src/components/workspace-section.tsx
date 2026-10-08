'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Eyebrow,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/design-system';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

function PageHead({ group, title, description, action }: { group: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-head operation-page-head"><div><Eyebrow>{group}</Eyebrow><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

function PanelHead({ title, meta, action }: { title: string; meta?: string; action?: React.ReactNode }) {
  return <div className="section-head compact-section-head"><h2>{title}</h2>{action ?? (meta ? <Eyebrow>{meta}</Eyebrow> : null)}</div>;
}

function Status({ children, tone = 'success' }: { children: React.ReactNode; tone?: Tone }) {
  return <Badge tone={tone}>{children}</Badge>;
}

function Toolbar({ search, value, onChange, children }: { search: string; value?: string; onChange?: (value: string) => void; children?: React.ReactNode }) {
  return <section className="panel ops-toolbar"><Input aria-label={search} placeholder={search} value={value} onChange={(event) => onChange?.(event.target.value)} />{children}</section>;
}

function DSSelect({ label, value, onValueChange, options, className }: { label: string; value: string; onValueChange: (value: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return <Select value={value} onValueChange={onValueChange}><SelectTrigger aria-label={label} className={className}><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

function Feedback({ children, tone = 'success' }: { children?: React.ReactNode; tone?: 'success' | 'warning' | 'info' }) {
  if (!children) return null;
  return <p className={`inline-feedback ${tone}`} role="status" aria-live="polite">{children}</p>;
}

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function TablePanel({ title, meta, action, headings, rows }: { title?: string; meta?: string; action?: React.ReactNode; headings: string[]; rows: React.ReactNode[][] }) {
  return <section className="panel table-panel">{title ? <PanelHead title={title} meta={meta} action={action} /> : null}<div className="table-scroll"><table className="data-table compact-table"><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function Pipelines() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [inspected, setInspected] = useState<string>();
  const pipelines = [
    { name: 'Competitor prices', detail: '3 sources · 5 fields', version: 'v4', last: '2 min ago', schedule: 'On demand', status: 'Needs review', tone: 'warning' as Tone, href: '/pipelines/competitor-prices' },
    { name: 'Outdoor catalogue', detail: '12 categories · 8 fields', version: 'v7', last: '1 hr ago', schedule: 'Daily', status: 'Healthy', tone: 'success' as Tone },
    { name: 'Qualified suppliers', detail: 'EU region · 9 fields', version: 'v2', last: 'Yesterday', schedule: 'Weekly', status: 'Healthy', tone: 'success' as Tone },
  ];
  const visible = pipelines.filter((pipeline) => pipeline.name.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || pipeline.status === status));
  return <><PageHead group="Operate" title="Pipelines" description="Reusable pipelines with versioned schemas and execution rules." action={<Button variant="primary" asChild><Link href="/build?template=research">New pipeline</Link></Button>} /><Toolbar search="Search pipelines" value={query} onChange={setQuery}><DSSelect label="Pipeline status" value={status} onValueChange={setStatus} options={[{value:'all',label:'All statuses'},{value:'Healthy',label:'Healthy'},{value:'Needs review',label:'Needs review'}]} className="filter-select" /></Toolbar><Feedback tone="info">{inspected ? `${inspected} selected. This concept uses Competitor prices as the complete detail example.` : undefined}</Feedback><TablePanel title="All pipelines" meta={`${visible.length} pipeline${visible.length === 1 ? '' : 's'}`} headings={['Pipeline','Version','Last run','Schedule','Status','']} rows={visible.map((pipeline) => [
    <span key="p"><strong>{pipeline.name}</strong><small>{pipeline.detail}</small></span>, pipeline.version, pipeline.last, pipeline.schedule, <Status key="s" tone={pipeline.tone}>{pipeline.status}</Status>, pipeline.href ? <Button key="l" variant="ghost" size="sm" asChild><Link href={pipeline.href}>Open</Link></Button> : <Button key="l" variant="ghost" size="sm" onClick={() => setInspected(pipeline.name)}>Open</Button>,
  ])} /></>;
}

function Runs() {
  const router = useRouter();
  const [workflow, setWorkflow] = useState('all');
  const [state, setState] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [runId, setRunId] = useState('run_7f3a');
  const [error, setError] = useState('');
  const runs = [
    { id:'run_batch_91af', when:'Running now', pipeline:'SaaS pricing research', coverage:'12 / 20 domains', records:'12', usage:'Not yet measured', state:'Running', outcome:'Running', tone:'info' as Tone, href:'/runs/run_batch_91af' },
    { id:'run_7f3a', when:'2 minutes ago', pipeline:'Competitor prices', coverage:'3 / 3 sources', records:'3', usage:'Not yet measured', state:'Completed', outcome:'Partial', tone:'warning' as Tone, href:'/runs/run_7f3a' },
    { id:'run_7e91', when:'1 hour ago', pipeline:'Outdoor catalogue', coverage:'1,284 / 1,284 pages', records:'1,284', usage:'Not yet measured', state:'Completed', outcome:'Succeeded', tone:'success' as Tone, href:'/runs/run_7e91' },
    { id:'run_failed_9d11', when:'Yesterday', pipeline:'Retail availability', coverage:'2 / 3 sources', records:'2', usage:'$0.18', state:'Failed', outcome:'Blocked', tone:'danger' as Tone, href:'/runs/run_failed_9d11' },
  ];
  const visible = runs.filter((run) => (workflow === 'all' || run.pipeline === workflow) && (state === 'all' || run.state === state) && (outcome === 'all' || run.outcome === outcome));
  const openRun = () => { const run = runs.find((item) => item.id === runId.trim()); if (!run) { setError('Run ID not found in this interactive demo.'); return; } setError(''); router.push(run.href); };
  return <><PageHead group="Operate" title="Runs" description="Every execution, with scope, status, usage and actionable exceptions." /><section className="metric-grid"><article><small>Running</small><b>1</b></article><article><small>Partial</small><b>1</b></article><article><small>Completed today</small><b>42</b></article><article><small>Usage today</small><b>Not yet measured</b></article></section><section className="panel run-filters"><label>WORKFLOW<DSSelect label="Workflow" value={workflow} onValueChange={setWorkflow} options={[{value:'all',label:'All workflows'},{value:'SaaS pricing research',label:'SaaS pricing research'},{value:'Competitor prices',label:'Competitor prices'},{value:'Outdoor catalogue',label:'Outdoor catalogue'}]} /></label><label>STATE<DSSelect label="State" value={state} onValueChange={setState} options={[{value:'all',label:'All states'},{value:'Running',label:'Running'},{value:'Completed',label:'Completed'},{value:'Failed',label:'Failed'}]} /></label><label>OUTCOME<DSSelect label="Outcome" value={outcome} onValueChange={setOutcome} options={[{value:'all',label:'All outcomes'},{value:'Succeeded',label:'Succeeded'},{value:'Partial',label:'Partial'},{value:'Blocked',label:'Blocked'}]} /></label><label className="open-run">OPEN A RUN BY ID<Input value={runId} onChange={(event) => setRunId(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && openRun()} aria-invalid={Boolean(error)} /></label><Button variant="secondary" onClick={openRun}>Open</Button></section><Feedback tone="warning">{error}</Feedback><TablePanel headings={['Run','Pipeline','Coverage','Records','Usage','State → outcome','']} rows={visible.map((run) => [
    <span key="r"><strong>{run.id}</strong><small>{run.when}</small></span>, run.pipeline, run.coverage, run.records, run.usage, <Status key="s" tone={run.tone}>{run.state}{run.outcome !== run.state ? ` · ${run.outcome}` : ''}</Status>, <Button key="b" variant="ghost" size="sm" asChild><Link href={run.href}>Open</Link></Button>,
  ])} /></>;
}

function Datasets() {
  const [query, setQuery] = useState('');
  const [validation, setValidation] = useState('all');
  const [message, setMessage] = useState('');
  const datasets = [
    ['DATASET · V4','Competitor prices','3 records · 5 fields · 1 unresolved','Needs review','warning'],
    ['DATASET · V7','Outdoor catalogue','1,284 records · 8 fields · fully validated','Validated','success'],
    ['DATASET · V2','Qualified suppliers','74 records · 9 fields · 6 unresolved','Partial','warning'],
  ] as const;
  const visible = datasets.filter(([,title,,status]) => title.toLowerCase().includes(query.toLowerCase()) && (validation === 'all' || status === validation));
  const exportDatasets = () => { downloadJson('importio-datasets.json', visible.map(([,title,detail,status]) => ({ title, detail, status }))); setMessage(`${visible.length} dataset${visible.length === 1 ? '' : 's'} exported as JSON.`); };
  return <><PageHead group="Operate" title="Datasets" description="Versioned structured outputs ready for review, export and delivery." /><Toolbar search="Search datasets" value={query} onChange={setQuery}><DSSelect label="Dataset validation" value={validation} onValueChange={setValidation} options={[{value:'all',label:'All validation states'},{value:'Validated',label:'Validated'},{value:'Needs review',label:'Needs review'},{value:'Partial',label:'Partial'}]} className="filter-select" /><Button variant="secondary" onClick={exportDatasets}>Export</Button></Toolbar><Feedback>{message}</Feedback><section className="dataset-cards">{visible.map(([eyebrow,title,detail,status,tone]) => <article className="panel dataset-card" key={title}><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2><p>{detail}</p><footer><Status tone={tone}>{status}</Status>{title === 'Competitor prices' ? <Button variant="ghost" size="sm" asChild><Link href="/datasets/competitor-prices">Review data</Link></Button> : <Button variant="ghost" size="sm" onClick={() => setMessage(`${title} selected. Its complete detail screen is not part of this bounded demo.`)}>Open</Button>}</footer></article>)}</section></>;
}

function Monitors() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pipeline, setPipeline] = useState('Competitor prices');
  const [schedule, setSchedule] = useState('Every 6 hours');
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState(false);
  const createMonitor = () => { setCreated(true); setDialogOpen(false); setMessage(`${pipeline} will be checked ${schedule.toLowerCase()}.`); };
  return <><PageHead group="Operate" title="Monitors" description="Keep successful pipelines current and review meaningful changes." action={<Button variant="primary" onClick={() => setDialogOpen(true)}>Choose a pipeline to monitor</Button>} /><Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Create a monitor</DialogTitle><DialogDescription>Choose a trusted pipeline and how often Import.io should check for meaningful changes.</DialogDescription></DialogHeader><div className="dialog-form"><label>PIPELINE<DSSelect label="Pipeline" value={pipeline} onValueChange={setPipeline} options={[{value:'Competitor prices',label:'Competitor prices'},{value:'Outdoor catalogue',label:'Outdoor catalogue'},{value:'Qualified suppliers',label:'Qualified suppliers'}]} /></label><label>SCHEDULE<DSSelect label="Schedule" value={schedule} onValueChange={setSchedule} options={[{value:'Every 6 hours',label:'Every 6 hours'},{value:'Daily',label:'Daily'},{value:'Weekly',label:'Weekly'}]} /></label></div><DialogFooter><Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="primary" onClick={createMonitor}>Create monitor</Button></DialogFooter></DialogContent></Dialog><Feedback>{message}</Feedback><section className="panel monitor-note"><div><strong>Monitoring starts after a workflow has a trusted baseline.</strong><p>Choose a saved pipeline, select the fields that matter, then set its schedule and alert rules.</p></div><Status>{created ? '3 active' : '2 active'}</Status></section><TablePanel title="Active monitors" meta="Next check · 14:00 UTC" headings={['Monitor','Pipeline','Schedule','Last change','Status']} rows={[
    [<span key="m"><strong>MAP watch</strong><small>Price and seller availability</small></span>,'Marketplace sellers','Daily','Yesterday · 12 changes',<Status key="s">Healthy</Status>],
    [<span key="m"><strong>Trailhead availability</strong><small>Price and stock status</small></span>,'Competitor prices','Every 6 hours','3 days ago · low stock',<Status key="s">Healthy</Status>],
    [<span key="m"><strong>Supplier terms</strong><small>Minimum order and lead time</small></span>,'Qualified suppliers','Paused','12 days ago',<Status key="s" tone="warning">Paused</Status>],
    ...(created ? [[<span key="m"><strong>{pipeline} monitor</strong><small>New baseline watch</small></span>,pipeline,schedule,'Not checked yet',<Status key="s" tone="info">Scheduled</Status>]] : []),
  ]} /></>;
}

function Memories() {
  return <><PageHead group="Library" title="Memories" description="Remembered runs available as labelled prior research." /><TablePanel title="Remembered runs" meta="2 memories" headings={['Label','Run','Retention','State → outcome','']} rows={[
    ['Competitor price review','run_7f3a','Saved until 5 Nov 2026',<Status key="s" tone="warning">Completed · Partial</Status>,<Button key="b" variant="ghost" size="sm" asChild><Link href="/build?template=compare&input=prior">Use in new workflow</Link></Button>],
    ['Supplier market scan','run_supplier_2b81','Saved until 18 Nov 2026',<Status key="s">Completed · Succeeded</Status>,<Button key="b" variant="ghost" size="sm" asChild><Link href="/build?template=discover&input=prior">Use in new workflow</Link></Button>],
  ]} /></>;
}

function Groups() {
  const [retrying, setRetrying] = useState<string>();
  const retry = (name: string) => { setRetrying(`${name}: retry queued for failed items only.`); };
  return <><PageHead group="Library" title="Groups" description="Bounded batches of 2–10 items with per-item status." /><Feedback tone="info">{retrying}</Feedback><TablePanel title="Groups" meta="2 groups" headings={['Group','Items','State → outcome','']} rows={[
    ['EU supplier discovery','8 items',<Status key="s" tone="warning">Completed · Partial</Status>,<Button key="b" variant="secondary" onClick={() => retry('EU supplier discovery')}>Retry failed only</Button>],
    ['SaaS pricing sample','10 items',<Status key="s">Completed · Succeeded</Status>,<Button key="b" variant="secondary" onClick={() => retry('SaaS pricing sample')}>Retry failed only</Button>],
  ]} /></>;
}

function Enrich() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('New supplier enrichment');
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const create = () => { setDialogOpen(false); setMessage(`${name} created from ${fileName}. Upload validation is ready.`); };
  return <><PageHead group="Library" title="Enrich" description="CSV enrichment with a verdict and evidence per cell." /><Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Create an enrichment</DialogTitle><DialogDescription>Choose a CSV and name the enrichment. This demo validates the file locally without uploading data.</DialogDescription></DialogHeader><div className="dialog-form"><label>NAME<Input value={name} onChange={(event) => setName(event.target.value)} /></label><label>CSV FILE<Input type="file" accept=".csv,text/csv" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')} /></label>{fileName ? <p className="dialog-file-note">Ready to validate · {fileName}</p> : null}</div><DialogFooter><Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="primary" onClick={create} disabled={!name.trim() || !fileName}>Create enrichment</Button></DialogFooter></DialogContent></Dialog><Feedback>{message}</Feedback><TablePanel title="Enrichments" action={<Button variant="primary" onClick={() => setDialogOpen(true)}>Create from CSV</Button>} headings={['Enrichment','Rows','State → outcome','']} rows={[
    ['Supplier enrichment','248 rows',<Status key="s" tone="warning">Completed → Partial</Status>,<Button key="b" variant="ghost" size="sm" onClick={() => setMessage('Supplier enrichment selected · 248 rows · 17 unresolved cells.')}>Open</Button>],
    ['Retailer domain match','74 rows',<Status key="s">Completed → Succeeded</Status>,<Button key="b" variant="ghost" size="sm" onClick={() => setMessage('Retailer domain match selected · all 74 rows supported.')}>Open</Button>],
  ]} /></>;
}

function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('Trailhead 2P Tent price Europe');
  const [limit, setLimit] = useState('3');
  const [searched, setSearched] = useState(query);
  const [added, setAdded] = useState<string[]>([]);
  const results = [
    ['northwind-outdoors.example','Trailhead 2P Tent — Northwind Outdoors','Product page with current EUR price, stock status and delivery guidance.'],
    ['summit-supply.example','Trailhead Two-Person Tent — Summit Supply','Retail listing with price, low-stock notice and product specifications.'],
    ['trail-shop.example','Trailhead 2 Person — Trail Shop','Product detail page with price and availability requiring review.'],
  ];
  return <><PageHead group="Discovery" title="Search" description="Ranked sources to inspect, not verified answers." /><section className="panel search-bar"><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search query"/><DSSelect label="Results limit" value={limit} onValueChange={setLimit} options={[{value:'3',label:'3 results'},{value:'5',label:'5 results'}]} /><Input defaultValue="English" aria-label="Language"/><Button variant="primary" onClick={() => setSearched(query)}>Search</Button></section><Feedback tone="info">{searched !== 'Trailhead 2P Tent price Europe' ? `Showing ranked demo sources for “${searched}”.` : added.length ? `${added.length} source${added.length === 1 ? '' : 's'} added to the next workflow.` : undefined}</Feedback><section className="search-results">{results.slice(0, Number(limit)).map(([domain,title,snippet],index) => <article className="panel search-result" key={domain}><div><Eyebrow>{String(index + 1).padStart(2,'0')} · {domain}</Eyebrow><h2>{title}</h2><p>{snippet}</p></div><div><Button variant="secondary" onClick={() => setAdded((current) => current.includes(domain) ? current : [...current, domain])}>{added.includes(domain) ? 'Added' : 'Add to sources'}</Button><Button variant="primary" onClick={() => router.push('/build?template=extract')}>Extract from this page</Button></div></article>)}</section></>;
}

function Candidates() {
  const [entity, setEntity] = useState('Supplier');
  const [query, setQuery] = useState('European outdoor equipment suppliers');
  const [limit, setLimit] = useState('6');
  const [conditions, setConditions] = useState(['EU presence', 'Wholesale']);
  const [newCondition, setNewCondition] = useState('');
  const [selected, setSelected] = useState(['Northwind Trade','Summit Supply Europe','Alpine Trade']);
  const [evidence, setEvidence] = useState<string>();
  const [message, setMessage] = useState('');
  const candidates = [['Northwind Trade','northwind.example','Outdoor equipment supplier · Rotterdam'],['Summit Supply Europe','summit.example','Wholesale distributor · Lyon'],['Alpine Trade','alpine.example','Outdoor catalogue · Innsbruck']];
  const addCondition = () => { if (!newCondition.trim()) return; setConditions((current) => [...current, newCondition.trim()]); setNewCondition(''); };
  return <><PageHead group="Discovery" title="Candidates" description="Discover first; qualify selected candidates separately." /><section className="panel candidate-builder"><div className="form-grid"><label>ENTITY TYPE<DSSelect label="Entity type" value={entity} onValueChange={setEntity} options={[{value:'Supplier',label:'Supplier'},{value:'Company',label:'Company'},{value:'Product',label:'Product'}]} /></label><label>QUERY<Input value={query} onChange={(event) => setQuery(event.target.value)}/></label><label>LIMIT<Input type="number" value={limit} onChange={(event) => setLimit(event.target.value)}/></label></div><div><Eyebrow>Match conditions</Eyebrow><div className="condition-row">{conditions.map((condition) => <Button key={condition} className="chip-button" variant="ghost" size="sm" onClick={() => setConditions((current) => current.filter((item) => item !== condition))} aria-label={`Remove ${condition}`}>{condition} ×</Button>)}<Input value={newCondition} onChange={(event) => setNewCondition(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addCondition()} placeholder="Add condition"/><Button variant="secondary" size="sm" onClick={addCondition}>Add</Button></div></div><div className="panel-actions"><span><strong>{Math.max(6, conditions.length * 18)}</strong> estimated matches</span><Button variant="secondary" onClick={() => setMessage(`Preview: ${Math.max(6, conditions.length * 18)} ${entity.toLowerCase()} matches for “${query}”.`)}>Preview count</Button><Button variant="primary" onClick={() => setMessage(`Discovery complete. Showing the top ${Math.min(Number(limit) || 6, 3)} bounded demo candidates.`)}>Discover</Button></div></section><Feedback tone="info">{message}</Feedback><section className="candidate-grid">{candidates.map(([name,domain,detail]) => <article className="panel candidate-card" key={name}><input type="checkbox" checked={selected.includes(name)} onChange={() => setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current,name])} aria-label={`Select ${name}`}/><div><Eyebrow>Unqualified candidate</Eyebrow><h2>{name}</h2><p>{domain} · {detail}</p>{evidence === name ? <p className="candidate-evidence">Directory profile, business address and wholesale catalogue retained.</p> : null}</div><Button variant="ghost" size="sm" onClick={() => setEvidence(evidence === name ? undefined : name)}>Evidence</Button></article>)}</section><div className="page-action-row"><span>{selected.length} unqualified candidate{selected.length === 1 ? '' : 's'} selected</span>{selected.length > 0 ? <Button variant="primary" asChild><Link href="/qualify">Qualify selected</Link></Button> : <Button variant="primary" disabled>Qualify selected</Button>}</div></>;
}

function Qualify() {
  return <><PageHead group="Discovery" title="Qualifications" description="Criterion verdicts with evidence; unresolved is never rejection." /><TablePanel title="Selected candidates" headings={['Candidate','EU presence','Wholesale','Contact published']} rows={[
    ['Northwind Trade',<Status key="a">Supported</Status>,<Status key="b">Supported</Status>,<Status key="c">Supported</Status>],
    ['Summit Supply Europe',<Status key="a">Supported</Status>,<Status key="b">Supported</Status>,<Status key="c" tone="warning">Unresolved</Status>],
    ['Alpine Trade',<Status key="a">Supported</Status>,<Status key="b" tone="danger">Not supported</Status>,<Status key="c" tone="warning">Unresolved</Status>],
  ]} /><div className="page-action-row"><span>2 candidates are ready for a follow-up workflow.</span><Button variant="secondary" asChild><Link href="/candidates">Back to candidates</Link></Button><Button variant="primary" asChild><Link href="/build?template=discover&input=prior">Use qualified candidates</Link></Button></div></>;
}

// Legacy static snapshots retained temporarily while parity fixtures are consolidated.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Developers() {
  return <><PageHead group="Reference" title="Developers" description="The same task model through API and MCP." /><section className="developer-grid"><article className="panel"><PanelHead title="Task API" meta="POST /v1/tasks"/><div className="panel-body"><p>Submit a task, keep its ID, and retrieve the result when it is ready.</p><pre className="code-block">{`curl -X POST https://api.import.io/v1/tasks \\\n+  -H 'Authorization: Bearer $IMPORTIO_API_KEY' \\\n+  -H 'Content-Type: application/json' \\\n+  -d '{"workflow":"compare","sources":[...]}'`}</pre><Button variant="secondary">Copy cURL</Button></div></article><article className="panel"><PanelHead title="MCP quickstart" meta="Free developer entry"/><div className="panel-body"><p>Search public pages from an MCP client, then move proven workflows into your workspace.</p><pre className="code-block">{`npx -y @importio/mcp-server\n# no account required for Search preview`}</pre><Button variant="primary">View MCP setup</Button></div></article></section></>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Webhooks() {
  return <><PageHead group="Reference" title="Webhooks" description="Deliver completed runs and meaningful monitor changes to your systems." /><section className="panel"><PanelHead title="Add an endpoint" meta="HMAC-SHA256"/><div className="form-grid webhook-form"><label>ENDPOINT URL<input defaultValue="https://api.example.com/importio/events"/></label><label>EVENTS<select><option>Run completed</option><option>Monitor changed</option><option>Input required</option></select></label><label>SIGNING SECRET<input disabled defaultValue="Generated after save"/></label></div><div className="panel-actions"><span>Eight bounded retries from 1 minute to 24 hours.</span><Button variant="primary">Add webhook</Button></div></section><TablePanel title="Endpoints and recent deliveries" meta="Live delivery log" headings={['Endpoint','Events','Health','']} rows={[[<span key="e"><strong>https://data.example.com/importio</strong><small>Run completed · Monitor changed</small></span>,'2 events',<Status key="s">Healthy</Status>,<Button key="b" variant="secondary">Test</Button>]]}/></>;
}

function Usage() {
  return <><PageHead group="Reference" title="Usage" description="Understand activity, limits and estimated cost before workflows become production dependencies." /><section className="metric-grid"><article><small>Runs · 30 days</small><b>1,284</b></article><article><small>Browser minutes</small><b>418</b></article><article><small>Records returned</small><b>92.6k</b></article><article><small>Estimated cost</small><b>$84.20</b></article></section><TablePanel title="Usage by workflow" headings={['Workflow','Runs','Records','Browser time','Estimated cost']} rows={[["Outdoor catalogue","742","81,412","246 min","$42.18"],["Competitor prices","422","8,996","130 min","$29.62"],["Qualified suppliers","120","2,204","42 min","$12.40"]]}/></>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Settings() {
  return <><PageHead group="Reference" title="Settings" description="Workspace configuration, limits and operational preferences." /><section className="settings-grid"><article className="panel"><PanelHead title="API keys" action={<Button variant="primary">Create key</Button>}/><div className="settings-row"><span><strong>Production</strong><small>sk_live_••••9f2a · created 14 Sep</small></span><Button variant="secondary">Revoke</Button></div></article><article className="panel"><PanelHead title="Team" meta="View only"/><div className="settings-row"><span><strong>Jordan Davis</strong><small>jordan@example.com</small></span><span>Owner</span></div><div className="settings-row"><span><strong>Maya Chen</strong><small>maya@example.com</small></span><span>Editor</span></div></article><article className="panel"><PanelHead title="Data handling"/><div className="panel-body"><label>DEFAULT RETENTION<select><option>30 days</option><option>90 days</option><option>1 year</option></select></label><p>Encrypted in transit and at rest · zero-retention processing available.</p></div></article><article className="panel"><PanelHead title="Trust and security"/><div className="panel-body"><dl className="security-list"><div><dt>Compliance</dt><dd>SOC 2 Type 2</dd></div><div><dt>Training</dt><dd>Customer data excluded</dd></div><div><dt>Region</dt><dd>EU workspace</dd></div></dl></div></article><article className="panel"><PanelHead title="Plan and limits" meta="Studio"/><div className="panel-body"><div className="usage-meter"><span /></div><p>42 of 100 monthly runs · 10 records per task · 30 steps</p></div></article></section></>;
}

function DevelopersLive() {
  const [message, setMessage] = useState('');
  const curl = "curl -X POST https://api.import.io/v1/tasks \\\n+  -H 'Authorization: Bearer $IMPORTIO_API_KEY' \\\n+  -H 'Content-Type: application/json' \\\n+  -d '{\"workflow\":\"compare\",\"sources\":[...]}'";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setMessage('cURL copied to clipboard.');
    } catch {
      setMessage('Clipboard access is unavailable here. Select the cURL command above to copy it.');
    }
  };
  return <><PageHead group="Reference" title="Developers" description="The same task model through API and MCP." /><Feedback>{message}</Feedback><section className="developer-grid"><article className="panel"><PanelHead title="Task API" meta="POST /v1/tasks"/><div className="panel-body"><p>Submit a task, keep its ID, and retrieve the result when it is ready.</p><pre className="code-block">{curl}</pre><Button variant="secondary" onClick={copy}>Copy cURL</Button></div></article><article className="panel"><PanelHead title="MCP quickstart" meta="Free developer entry"/><div className="panel-body"><p>Search public pages from an MCP client, then move proven workflows into your workspace.</p><pre className="code-block">npx -y @importio/mcp-server{`\n`}# no account required for Search preview</pre><Button variant="primary" onClick={() => setMessage('MCP setup: run the command above, then add the server to your MCP client.')}>View MCP setup</Button></div></article></section></>;
}

function WebhooksLive() {
  const [endpoint, setEndpoint] = useState('https://api.example.com/importio/events');
  const [eventName, setEventName] = useState('Run completed');
  const [secret, setSecret] = useState('Generated after save');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [endpoints, setEndpoints] = useState([{ url:'https://data.example.com/importio', events:'Run completed · Monitor changed', health:'Healthy' }]);
  const addWebhook = () => {
    try { const parsed = new URL(endpoint); if (parsed.protocol !== 'https:') throw new Error(); }
    catch { setError('Enter a valid public HTTPS endpoint.'); setMessage(''); return; }
    const generated = `whsec_demo_${Date.now().toString(36)}`;
    setSecret(generated);
    setEndpoints((current) => [{url:endpoint,events:eventName,health:'Validating'},...current]);
    setError('');
    setMessage('Webhook added. Copy the signing secret now; it is shown only for this demo session.');
  };
  const test = (url: string) => { setEndpoints((current) => current.map((item) => item.url === url ? {...item,health:'Healthy'} : item)); setMessage(`Test delivered to ${url} · 200 OK · signature verified.`); };
  return <><PageHead group="Reference" title="Webhooks" description="Deliver completed runs and meaningful monitor changes to your systems." /><Feedback>{message}</Feedback><section className="panel"><PanelHead title="Add an endpoint" meta="HMAC-SHA256"/><div className="form-grid webhook-form"><label>ENDPOINT URL<Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} aria-invalid={Boolean(error)} /></label><label>EVENTS<DSSelect label="Events" value={eventName} onValueChange={setEventName} options={[{value:'Run completed',label:'Run completed'},{value:'Monitor changed',label:'Monitor changed'},{value:'Input required',label:'Input required'}]} /></label><label>SIGNING SECRET<Input readOnly value={secret}/></label></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="panel-actions webhook-actions"><span>Eight bounded retries from 1 minute to 24 hours.</span><Button variant="primary" onClick={addWebhook}>Add webhook</Button></div></section><TablePanel title="Endpoints and recent deliveries" meta="Live delivery log" headings={['Endpoint','Events','Health','']} rows={endpoints.map((item) => [<span key="e"><strong>{item.url}</strong><small>{item.events}</small></span>,item.events.includes('·') ? '2 events' : '1 event',<Status key="s" tone={item.health === 'Healthy' ? 'success' : 'info'}>{item.health}</Status>,<Button key="b" variant="secondary" onClick={() => test(item.url)}>Test</Button>])}/></>;
}

function SettingsLive() {
  const [keys, setKeys] = useState([{name:'Production',display:'sk_live_••••9f2a · created 14 Sep'}]);
  const [newKey, setNewKey] = useState('');
  const [retention, setRetention] = useState('30 days');
  const [message, setMessage] = useState('');
  const createKey = () => {
    const value = `sk_live_demo_${Date.now().toString(36)}`;
    setKeys((current) => [...current,{name:'New key',display:`${value.slice(0,16)}•••• · created now`}]);
    setNewKey(value);
    setMessage('API key created. Copy it now; it will not be shown again.');
  };
  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setMessage('API key copied to clipboard.');
    } catch {
      setMessage('Clipboard access is unavailable here. Select the key above to copy it.');
    }
  };
  return <><PageHead group="Reference" title="Settings" description="Workspace configuration, limits and operational preferences." /><Feedback>{message}</Feedback>{newKey ? <div className="secret-reveal"><code>{newKey}</code><Button variant="secondary" size="sm" onClick={copyKey}>Copy key</Button></div> : null}<section className="settings-grid"><article className="panel"><PanelHead title="API keys" action={<Button variant="primary" onClick={createKey}>Create key</Button>}/>{keys.length ? keys.map((key) => <div className="settings-row" key={key.display}><span><strong>{key.name}</strong><small>{key.display}</small></span><Button variant="secondary" onClick={() => { setKeys((current) => current.filter((item) => item.display !== key.display)); if (key.name === 'New key') setNewKey(''); setMessage(`${key.name} revoked.`); }}>Revoke</Button></div>) : <div className="panel-body"><p>No active API keys.</p></div>}</article><article className="panel"><PanelHead title="Team" meta="View only"/><div className="settings-row"><span><strong>Jordan Davis</strong><small>jordan@example.com</small></span><span>Owner</span></div><div className="settings-row"><span><strong>Maya Chen</strong><small>maya@example.com</small></span><span>Editor</span></div></article><article className="panel"><PanelHead title="Data handling"/><div className="panel-body"><label>DEFAULT RETENTION<DSSelect label="Default retention" value={retention} onValueChange={(value) => { setRetention(value); setMessage(`Default retention updated to ${value}.`); }} options={[{value:'30 days',label:'30 days'},{value:'90 days',label:'90 days'},{value:'1 year',label:'1 year'}]} /></label><p>Encrypted in transit and at rest · zero-retention processing available.</p></div></article><article className="panel"><PanelHead title="Trust and security"/><div className="panel-body"><dl className="security-list"><div><dt>Compliance</dt><dd>SOC 2 Type 2</dd></div><div><dt>Training</dt><dd>Customer data excluded</dd></div><div><dt>Region</dt><dd>EU workspace</dd></div></dl></div></article><article className="panel"><PanelHead title="Plan and limits" meta="Studio"/><div className="panel-body"><div className="usage-meter"><span /></div><p>42 of 100 monthly runs · 10 records per task · 30 steps</p></div></article></section></>;
}

const sections: Record<string, () => React.ReactNode> = { pipelines: Pipelines, runs: Runs, datasets: Datasets, monitors: Monitors, memories: Memories, groups: Groups, enrich: Enrich, search: SearchPage, candidates: Candidates, qualify: Qualify, developers: DevelopersLive, webhooks: WebhooksLive, usage: Usage, settings: SettingsLive };

export function WorkspaceSection({ section }: { section: string }) {
  const Section = sections[section] ?? Pipelines;
  return <div className="page"><Section /></div>;
}
