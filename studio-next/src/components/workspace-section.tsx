import Link from 'next/link';
import { Badge, Button, Eyebrow } from '@/components/design-system';

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

function Toolbar({ search, children }: { search: string; children?: React.ReactNode }) {
  return <section className="panel ops-toolbar"><input aria-label={search} placeholder={search} />{children}</section>;
}

function TablePanel({ title, meta, action, headings, rows }: { title?: string; meta?: string; action?: React.ReactNode; headings: string[]; rows: React.ReactNode[][] }) {
  return <section className="panel table-panel">{title ? <PanelHead title={title} meta={meta} action={action} /> : null}<div className="table-scroll"><table className="data-table compact-table"><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function Pipelines() {
  return <><PageHead group="Operate" title="Pipelines" description="Reusable pipelines with versioned schemas and execution rules." action={<Button variant="primary" asChild><Link href="/build?template=research">New pipeline</Link></Button>} /><Toolbar search="Search pipelines"><select aria-label="Pipeline status"><option>All statuses</option><option>Healthy</option><option>Needs review</option></select></Toolbar><TablePanel title="All pipelines" meta="3 pipelines" headings={['Pipeline','Version','Last run','Schedule','Status','']} rows={[
    [<span key="p"><strong>Competitor prices</strong><small>3 sources · 5 fields</small></span>,'v4','2 min ago','On demand',<Status key="s" tone="warning">Needs review</Status>,<Link key="l" className="text-link" href="/pipelines/competitor-prices">Open</Link>],
    [<span key="p"><strong>Outdoor catalogue</strong><small>12 categories · 8 fields</small></span>,'v7','1 hr ago','Daily',<Status key="s">Healthy</Status>,<button key="l" className="text-link button-reset">Open</button>],
    [<span key="p"><strong>Qualified suppliers</strong><small>EU region · 9 fields</small></span>,'v2','Yesterday','Weekly',<Status key="s">Healthy</Status>,<button key="l" className="text-link button-reset">Open</button>],
  ]} /></>;
}

function Runs() {
  return <><PageHead group="Operate" title="Runs" description="Every execution, with scope, status, usage and actionable exceptions." /><section className="metric-grid"><article><small>Running</small><b>1</b></article><article><small>Partial</small><b>1</b></article><article><small>Completed today</small><b>42</b></article><article><small>Usage today</small><b>Not yet measured</b></article></section><section className="panel run-filters"><label>WORKFLOW<select><option>All workflows</option><option>SaaS pricing research</option><option>Competitor prices</option></select></label><label>STATE<select><option>All states</option><option>Running</option><option>Completed</option><option>Failed</option></select></label><label>OUTCOME<select><option>All outcomes</option><option>Succeeded</option><option>Partial</option><option>Blocked</option></select></label><label className="open-run">OPEN A RUN BY ID<input defaultValue="run_7f3a" /></label><Button variant="secondary">Open</Button></section><TablePanel headings={['Run','Pipeline','Coverage','Records','Usage','State → outcome','']} rows={[
    [<span key="r"><strong>run_batch_91af</strong><small>Running now</small></span>,'SaaS pricing research','12 / 20 domains','12','Not yet measured',<Status key="s" tone="info">Running</Status>,<button key="b" className="text-link button-reset">Open</button>],
    [<span key="r"><strong>run_7f3a</strong><small>2 minutes ago</small></span>,'Competitor prices','3 / 3 sources','3','Not yet measured',<Status key="s" tone="warning">Completed · Partial</Status>,<button key="b" className="text-link button-reset">Open</button>],
    [<span key="r"><strong>run_7e91</strong><small>1 hour ago</small></span>,'Outdoor catalogue','1,284 / 1,284 pages','1,284','Not yet measured',<Status key="s">Completed · Succeeded</Status>,<button key="b" className="text-link button-reset">Open</button>],
    [<span key="r"><strong>run_failed_9d11</strong><small>Yesterday</small></span>,'Retail availability','2 / 3 sources','2','$0.18',<Status key="s" tone="danger">Failed</Status>,<button key="b" className="text-link button-reset">Open</button>],
  ]} /></>;
}

function Datasets() {
  const datasets = [
    ['DATASET · V4','Competitor prices','3 records · 5 fields · 1 unresolved','Needs review','warning'],
    ['DATASET · V7','Outdoor catalogue','1,284 records · 8 fields · fully validated','Validated','success'],
    ['DATASET · V2','Qualified suppliers','74 records · 9 fields · 6 unresolved','Partial','warning'],
  ] as const;
  return <><PageHead group="Operate" title="Datasets" description="Versioned structured outputs ready for review, export and delivery." /><Toolbar search="Search datasets"><select aria-label="Dataset validation"><option>All validation states</option><option>Validated</option><option>Needs review</option></select><Button variant="secondary">Export</Button></Toolbar><section className="dataset-cards">{datasets.map(([eyebrow,title,detail,status,tone]) => <article className="panel dataset-card" key={title}><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2><p>{detail}</p><footer><Status tone={tone}>{status}</Status>{title === 'Competitor prices' ? <Link href="/pipelines/competitor-prices" className="text-link">Review data</Link> : <button className="text-link button-reset">Open</button>}</footer></article>)}</section></>;
}

function Monitors() {
  return <><PageHead group="Operate" title="Monitors" description="Keep successful pipelines current and review meaningful changes." action={<Button variant="primary">Choose a pipeline to monitor</Button>} /><section className="panel monitor-note"><div><strong>Monitoring starts after a workflow has a trusted baseline.</strong><p>Choose a saved pipeline, select the fields that matter, then set its schedule and alert rules.</p></div><Status>2 active</Status></section><TablePanel title="Active monitors" meta="Next check · 14:00 UTC" headings={['Monitor','Pipeline','Schedule','Last change','Status']} rows={[
    [<span key="m"><strong>MAP watch</strong><small>Price and seller availability</small></span>,'Marketplace sellers','Daily','Yesterday · 12 changes',<Status key="s">Healthy</Status>],
    [<span key="m"><strong>Trailhead availability</strong><small>Price and stock status</small></span>,'Competitor prices','Every 6 hours','3 days ago · low stock',<Status key="s">Healthy</Status>],
    [<span key="m"><strong>Supplier terms</strong><small>Minimum order and lead time</small></span>,'Qualified suppliers','Paused','12 days ago',<Status key="s" tone="warning">Paused</Status>],
  ]} /></>;
}

function Memories() {
  return <><PageHead group="Library" title="Memories" description="Remembered runs available as labelled prior research." /><TablePanel title="Remembered runs" meta="2 memories" headings={['Label','Run','Retention','State → outcome','']} rows={[
    ['Competitor price review','run_7f3a','Saved until 5 Nov 2026',<Status key="s" tone="warning">Completed · Partial</Status>,<button key="b" className="text-link button-reset">Use in new workflow</button>],
    ['Supplier market scan','run_supplier_2b81','Saved until 18 Nov 2026',<Status key="s">Completed · Succeeded</Status>,<button key="b" className="text-link button-reset">Use in new workflow</button>],
  ]} /></>;
}

function Groups() {
  return <><PageHead group="Library" title="Groups" description="Bounded batches of 2–10 items with per-item status." /><TablePanel title="Groups" meta="2 groups" headings={['Group','Items','State → outcome','']} rows={[
    ['EU supplier discovery','8 items',<Status key="s" tone="warning">Completed · Partial</Status>,<Button key="b" variant="secondary">Retry failed only</Button>],
    ['SaaS pricing sample','10 items',<Status key="s">Completed · Succeeded</Status>,<Button key="b" variant="secondary">Retry failed only</Button>],
  ]} /></>;
}

function Enrich() {
  return <><PageHead group="Library" title="Enrich" description="CSV enrichment with a verdict and evidence per cell." /><TablePanel title="Enrichments" action={<Button variant="primary">Create from CSV</Button>} headings={['Enrichment','Rows','State → outcome','']} rows={[
    ['Supplier enrichment','248 rows',<Status key="s" tone="warning">Completed → Partial</Status>,<button key="b" className="text-link button-reset">Open</button>],
    ['Retailer domain match','74 rows',<Status key="s">Completed → Succeeded</Status>,<button key="b" className="text-link button-reset">Open</button>],
  ]} /></>;
}

function SearchPage() {
  const results = [
    ['northwind-outdoors.example','Trailhead 2P Tent — Northwind Outdoors','Product page with current EUR price, stock status and delivery guidance.'],
    ['summit-supply.example','Trailhead Two-Person Tent — Summit Supply','Retail listing with price, low-stock notice and product specifications.'],
    ['trail-shop.example','Trailhead 2 Person — Trail Shop','Product detail page with price and availability requiring review.'],
  ];
  return <><PageHead group="Discovery" title="Search" description="Ranked sources to inspect, not verified answers." /><section className="panel search-bar"><input defaultValue="Trailhead 2P Tent price Europe" aria-label="Search query"/><select aria-label="Results limit"><option>3 results</option><option>5 results</option></select><input defaultValue="English" aria-label="Language"/><Button variant="primary">Search</Button></section><section className="search-results">{results.map(([domain,title,snippet],index) => <article className="panel search-result" key={domain}><div><Eyebrow>{String(index + 1).padStart(2,'0')} · {domain}</Eyebrow><h2>{title}</h2><p>{snippet}</p></div><div><Button variant="secondary">Add to sources</Button><Button variant="primary">Extract from this page</Button></div></article>)}</section></>;
}

function Candidates() {
  return <><PageHead group="Discovery" title="Candidates" description="Discover first; qualify selected candidates separately." /><section className="panel candidate-builder"><div className="form-grid"><label>ENTITY TYPE<select><option>Supplier</option><option>Company</option><option>Product</option></select></label><label>QUERY<input defaultValue="European outdoor equipment suppliers"/></label><label>LIMIT<input type="number" defaultValue="6"/></label></div><div><Eyebrow>Match conditions</Eyebrow><div className="condition-row"><Status tone="info">EU presence ×</Status><Status tone="info">Wholesale ×</Status><input placeholder="Add condition"/></div></div><div className="panel-actions"><span><strong>36</strong> estimated matches</span><Button variant="secondary">Preview count</Button><Button variant="primary">Discover</Button></div></section><section className="candidate-grid">{[['Northwind Trade','northwind.example','Outdoor equipment supplier · Rotterdam'],['Summit Supply Europe','summit.example','Wholesale distributor · Lyon'],['Alpine Trade','alpine.example','Outdoor catalogue · Innsbruck']].map(([name,domain,detail]) => <article className="panel candidate-card" key={name}><input type="checkbox" defaultChecked aria-label={`Select ${name}`}/><div><Eyebrow>Unqualified candidate</Eyebrow><h2>{name}</h2><p>{domain} · {detail}</p></div><button className="text-link button-reset">Evidence</button></article>)}</section><div className="page-action-row"><span>3 unqualified candidates selected</span><Button variant="primary" asChild><Link href="/qualify">Qualify selected</Link></Button></div></>;
}

function Qualify() {
  return <><PageHead group="Discovery" title="Qualifications" description="Criterion verdicts with evidence; unresolved is never rejection." /><TablePanel title="Selected candidates" headings={['Candidate','EU presence','Wholesale','Contact published']} rows={[
    ['Northwind Trade',<Status key="a">Supported</Status>,<Status key="b">Supported</Status>,<Status key="c">Supported</Status>],
    ['Summit Supply Europe',<Status key="a">Supported</Status>,<Status key="b">Supported</Status>,<Status key="c" tone="warning">Unresolved</Status>],
    ['Alpine Trade',<Status key="a">Supported</Status>,<Status key="b" tone="danger">Not supported</Status>,<Status key="c" tone="warning">Unresolved</Status>],
  ]} /></>;
}

function Developers() {
  return <><PageHead group="Reference" title="Developers" description="The same task model through API and MCP." /><section className="developer-grid"><article className="panel"><PanelHead title="Task API" meta="POST /v1/tasks"/><div className="panel-body"><p>Submit a task, keep its ID, and retrieve the result when it is ready.</p><pre className="code-block">{`curl -X POST https://api.import.io/v1/tasks \\\n+  -H 'Authorization: Bearer $IMPORTIO_API_KEY' \\\n+  -H 'Content-Type: application/json' \\\n+  -d '{"workflow":"compare","sources":[...]}'`}</pre><Button variant="secondary">Copy cURL</Button></div></article><article className="panel"><PanelHead title="MCP quickstart" meta="Free developer entry"/><div className="panel-body"><p>Search public pages from an MCP client, then move proven workflows into your workspace.</p><pre className="code-block">{`npx -y @importio/mcp-server\n# no account required for Search preview`}</pre><Button variant="primary">View MCP setup</Button></div></article></section></>;
}

function Webhooks() {
  return <><PageHead group="Reference" title="Webhooks" description="Deliver completed runs and meaningful monitor changes to your systems." /><section className="panel"><PanelHead title="Add an endpoint" meta="HMAC-SHA256"/><div className="form-grid webhook-form"><label>ENDPOINT URL<input defaultValue="https://api.example.com/importio/events"/></label><label>EVENTS<select><option>Run completed</option><option>Monitor changed</option><option>Input required</option></select></label><label>SIGNING SECRET<input disabled defaultValue="Generated after save"/></label></div><div className="panel-actions"><span>Eight bounded retries from 1 minute to 24 hours.</span><Button variant="primary">Add webhook</Button></div></section><TablePanel title="Endpoints and recent deliveries" meta="Live delivery log" headings={['Endpoint','Events','Health','']} rows={[[<span key="e"><strong>https://data.example.com/importio</strong><small>Run completed · Monitor changed</small></span>,'2 events',<Status key="s">Healthy</Status>,<Button key="b" variant="secondary">Test</Button>]]}/></>;
}

function Usage() {
  return <><PageHead group="Reference" title="Usage" description="Understand activity, limits and estimated cost before workflows become production dependencies." /><section className="metric-grid"><article><small>Runs · 30 days</small><b>1,284</b></article><article><small>Browser minutes</small><b>418</b></article><article><small>Records returned</small><b>92.6k</b></article><article><small>Estimated cost</small><b>$84.20</b></article></section><TablePanel title="Usage by workflow" headings={['Workflow','Runs','Records','Browser time','Estimated cost']} rows={[["Outdoor catalogue","742","81,412","246 min","$42.18"],["Competitor prices","422","8,996","130 min","$29.62"],["Qualified suppliers","120","2,204","42 min","$12.40"]]}/></>;
}

function Settings() {
  return <><PageHead group="Reference" title="Settings" description="Workspace configuration, limits and operational preferences." /><section className="settings-grid"><article className="panel"><PanelHead title="API keys" action={<Button variant="primary">Create key</Button>}/><div className="settings-row"><span><strong>Production</strong><small>sk_live_••••9f2a · created 14 Sep</small></span><Button variant="secondary">Revoke</Button></div></article><article className="panel"><PanelHead title="Team" meta="View only"/><div className="settings-row"><span><strong>Jordan Davis</strong><small>jordan@example.com</small></span><span>Owner</span></div><div className="settings-row"><span><strong>Maya Chen</strong><small>maya@example.com</small></span><span>Editor</span></div></article><article className="panel"><PanelHead title="Data handling"/><div className="panel-body"><label>DEFAULT RETENTION<select><option>30 days</option><option>90 days</option><option>1 year</option></select></label><p>Encrypted in transit and at rest · zero-retention processing available.</p></div></article><article className="panel"><PanelHead title="Trust and security"/><div className="panel-body"><dl className="security-list"><div><dt>Compliance</dt><dd>SOC 2 Type 2</dd></div><div><dt>Training</dt><dd>Customer data excluded</dd></div><div><dt>Region</dt><dd>EU workspace</dd></div></dl></div></article><article className="panel"><PanelHead title="Plan and limits" meta="Studio"/><div className="panel-body"><div className="usage-meter"><span /></div><p>42 of 100 monthly runs · 10 records per task · 30 steps</p></div></article></section></>;
}

const sections: Record<string, () => React.ReactNode> = { pipelines: Pipelines, runs: Runs, datasets: Datasets, monitors: Monitors, memories: Memories, groups: Groups, enrich: Enrich, search: SearchPage, candidates: Candidates, qualify: Qualify, developers: Developers, webhooks: Webhooks, usage: Usage, settings: Settings };

export const sectionSlugs = Object.keys(sections);

export function WorkspaceSection({ section }: { section: string }) {
  const Section = sections[section] ?? Pipelines;
  return <div className="page"><Section /></div>;
}
