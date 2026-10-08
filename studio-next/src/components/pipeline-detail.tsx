'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Eyebrow } from '@/components/design-system';

const initialDestinations = [
  { name: 'Webhook', status: 'Last delivery · Healthy', action: 'Configure', connected: true },
  { name: 'Google Sheets', status: 'Not connected', action: 'Connect', connected: false },
  { name: 'Snowflake', status: 'Not connected', action: 'Connect', connected: false },
  { name: 'BigQuery', status: 'Not connected', action: 'Connect', connected: false },
  { name: 'S3', status: 'Not connected', action: 'Connect', connected: false },
];

export function PipelineDetail() {
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(4);
  const [destinations, setDestinations] = useState(initialDestinations);
  const [aperturePublished, setAperturePublished] = useState(false);
  const toggleDestination = (name: string) => {
    setDestinations((current) => current.map((item) => item.name === name ? { ...item, connected: true, status: item.connected ? item.status : 'Connected · Ready', action: 'Configure' } : item));
    setMessage(`${name} ${name === 'Webhook' ? 'configuration opened' : 'connected for this demo session'}.`);
  };
  return <div className="page"><header className="page-head"><Link href="/pipelines" className="text-link">← Pipelines</Link><Eyebrow style={{marginTop:20}}>Pipeline</Eyebrow><h1>Competitor prices</h1><p>Saved pipeline · version {version} · reusable through schedule, API or MCP.</p></header>
    {message ? <p className="inline-feedback success" role="status">{message}</p> : null}
    <div className="definition-grid"><section className="panel"><div className="section-head"><h2>Pipeline definition</h2><Badge tone="success">Active · v{version}</Badge></div><dl className="detail-list"><div><dt>Objective</dt><dd>Compare Trailhead 2P pricing and availability</dd></div><div><dt>Sources</dt><dd>3 approved domains</dd></div><div><dt>Schema</dt><dd>5 fields · version {version}</dd></div><div><dt>Success rule</dt><dd>≥ 90% sources, evidence required</dd></div><div><dt>Cost cap</dt><dd>$0.25 per run</dd></div></dl></section><aside className="panel"><div className="section-head"><h2>Operate</h2><Eyebrow>Last run · 2 min ago</Eyebrow></div><div className="button-grid"><Button variant="secondary" asChild><Link href="/build?template=compare">Edit pipeline</Link></Button><Button variant="secondary" onClick={() => { setVersion(5); setMessage('Version 5 promoted and set active.'); }}>Promote v5</Button><Button variant="primary" asChild><Link href="/runs/run_7f3a">Run now</Link></Button><Button variant="secondary" asChild><Link href="/monitors">Configure monitor</Link></Button><Button variant="secondary" onClick={() => setMessage('Schedule saved: daily at 14:00 UTC.')}>Schedule</Button><Button variant="secondary" asChild><Link href="/developers">API / MCP setup</Link></Button></div></aside></div>
    <section className="panel" style={{marginTop:18}}><div className="section-head"><h2>Recent versions</h2><Eyebrow>Current · v{version}</Eyebrow></div><table className="data-table"><thead><tr><th>Version</th><th>Change</th><th>Created</th><th>Validation</th></tr></thead><tbody>{version === 5 ? <tr><td>v5</td><td>Promoted from the reviewed v4 definition</td><td>Now</td><td><Badge tone="success">Validated</Badge></td></tr> : null}<tr><td>v4</td><td>Availability made nullable; evidence remains required</td><td>Today</td><td><Badge tone="success">Validated</Badge></td></tr><tr><td>v3</td><td>Added currency code</td><td>6 days ago</td><td><Badge tone="success">Validated</Badge></td></tr></tbody></table></section>
    <section className="panel destinations"><div className="section-head"><h2>Destinations</h2></div><div className="destination-grid">{destinations.map((item)=><article className="destination" key={item.name}><h3>{item.name}</h3><small>{item.status}</small><Button variant="secondary" onClick={() => toggleDestination(item.name)}>{item.action}</Button></article>)}<article className="destination aperture-row"><h3>Aperture</h3><div className="field-map"><code>product_id</code><code>seller_offer</code><code>map_price</code></div><small>{aperturePublished ? 'Published · Healthy' : 'Not published'}</small><Button variant="secondary" onClick={() => { setAperturePublished(true); setMessage('Published to Aperture with the reviewed field mapping.'); }}>{aperturePublished ? 'Configure Aperture' : 'Publish to Aperture'}</Button></article></div></section>
  </div>;
}
