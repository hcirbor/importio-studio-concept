import Link from 'next/link';
import { Badge, Button, Eyebrow } from '@/components/design-system';

const destinations = [
  ['Webhook', 'Last delivery · Healthy', 'Configure'],
  ['Google Sheets', 'Not connected', 'Connect'],
  ['Snowflake', 'Not connected', 'Connect'],
  ['BigQuery', 'Not connected', 'Connect'],
  ['S3', 'Not connected', 'Connect'],
];

export const metadata = { title: 'Competitor prices' };
export default function PipelinePage() {
  return <div className="page"><header className="page-head"><Link href="/pipelines" className="text-link">← Pipelines</Link><Eyebrow style={{marginTop:20}}>Pipeline</Eyebrow><h1>Competitor prices</h1><p>Saved pipeline · version 4 · reusable through schedule, API or MCP.</p></header>
    <div className="definition-grid"><section className="panel"><div className="section-head"><h2>Pipeline definition</h2><Badge tone="success">Active · v4</Badge></div><dl className="detail-list"><div><dt>Objective</dt><dd>Compare Trailhead 2P pricing and availability</dd></div><div><dt>Sources</dt><dd>3 approved domains</dd></div><div><dt>Schema</dt><dd>5 fields · version 4</dd></div><div><dt>Success rule</dt><dd>≥ 90% sources, evidence required</dd></div><div><dt>Cost cap</dt><dd>$0.25 per run</dd></div></dl></section><aside className="panel"><div className="section-head"><h2>Operate</h2><Eyebrow>Last run · 2 min ago</Eyebrow></div><div className="button-grid"><Button variant="secondary">Edit pipeline</Button><Button variant="secondary">Promote v5</Button><Button variant="primary">Run now</Button><Button variant="secondary">Configure monitor</Button><Button variant="secondary">Schedule</Button><Button variant="secondary">API / MCP setup</Button></div></aside></div>
    <section className="panel" style={{marginTop:18}}><div className="section-head"><h2>Recent versions</h2><Eyebrow>Current · v4</Eyebrow></div><table className="data-table"><thead><tr><th>Version</th><th>Change</th><th>Created</th><th>Validation</th></tr></thead><tbody><tr><td>v4</td><td>Availability made nullable; evidence remains required</td><td>Today</td><td><Badge tone="success">Validated</Badge></td></tr><tr><td>v3</td><td>Added currency code</td><td>6 days ago</td><td><Badge tone="success">Validated</Badge></td></tr></tbody></table></section>
    <section className="panel destinations"><div className="section-head"><h2>Destinations</h2></div><div className="destination-grid">{destinations.map(([name,status,action])=><article className="destination" key={name}><h3>{name}</h3><small>{status}</small><Button variant="secondary">{action}</Button></article>)}<article className="destination aperture-row"><h3>Aperture</h3><div className="field-map"><code>product_id</code><code>seller_offer</code><code>map_price</code></div><small>Not published</small><Button variant="secondary">Publish to Aperture</Button></article></div></section>
  </div>;
}
