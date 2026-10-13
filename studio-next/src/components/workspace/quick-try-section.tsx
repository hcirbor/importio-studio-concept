'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Input } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { PageHead } from './shared';

export function QuickTrySection() {
  const addDataset = useStudio((snapshot) => snapshot.auth.addDataset);
  const [url, setUrl] = useState('https://northwind-outdoors.example/tents/trailhead-2p');
  const [previewed, setPreviewed] = useState(false);
  const [saved, setSaved] = useState(false);

  function save() {
    addDataset({ id: 'quick-try-trailhead', version: 'DATASET · V1', title: 'Trailhead quick try', detail: '1 record · 3 fields · fully validated', status: 'Validated', tone: 'success', href: '/datasets/quick-try-trailhead', recordCount: 1, fields: ['Product', 'Price', 'Availability'], lastUpdated: 'Just now', updatedAt: Date.now(), unresolvedCount: 0, sourceWorkflow: 'Quick try', records: [{ id: 'trailhead', values: { Product: 'Trailhead 2P Tent', Price: '€249.00', Availability: 'In stock' }, evidence: { Product: { sourceUrl: url, quote: 'Trailhead 2P Tent' }, Price: { sourceUrl: url, quote: '€249.00' }, Availability: { sourceUrl: url, quote: 'In stock' } } }] });
    setSaved(true);
  }

  return <><PageHead group="Build" title="Quick try" description="Preview a single public page before saving anything to the workspace." /><section className="panel quick-try"><label htmlFor="quick-try-url">PUBLIC PAGE URL</label><div className="quick-try-form"><Input id="quick-try-url" value={url} onChange={(event) => { setUrl(event.target.value); setPreviewed(false); setSaved(false); }} /><Button variant="primary" onClick={() => setPreviewed(true)}>Preview extract</Button></div>{previewed ? <div className="quick-preview"><div className="section-head"><div><h2>Trailhead 2P Tent</h2><p>Single-page Extract preview</p></div><Badge tone="success">3 fields supported</Badge></div><dl className="detail-list"><div><dt>Product</dt><dd>Trailhead 2P Tent</dd></div><div><dt>Price</dt><dd>€249.00</dd></div><div><dt>Availability</dt><dd>In stock</dd></div></dl><div className="page-action-row"><span>Evidence retained from northwind-outdoors.example.</span>{saved ? <Button variant="secondary" asChild><Link href="/datasets">Open workspace datasets</Link></Button> : <Button variant="primary" onClick={save}>Save to workspace</Button>}</div></div> : null}</section></>;
}
