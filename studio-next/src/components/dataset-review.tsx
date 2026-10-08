'use client';

import { useState } from 'react';
import { Badge, Button, Tabs, TabsList, TabsTrigger } from '@/components/design-system';

const records = [
  { retailer: 'Northwind Outdoors', product: 'Trailhead 2P Tent', price: '€249.00', availability: 'In stock', evidence: 'Supported · product page' },
  { retailer: 'Summit Supply', product: 'Trailhead Two-Person Tent', price: '€239.00', availability: 'Low stock', evidence: 'Supported · product card' },
  { retailer: 'Trail Shop', product: 'Trailhead 2 Person', price: '€259.00', availability: 'Unknown', evidence: 'Price supported · review field' },
];

export function DatasetReview() {
  const [tab, setTab] = useState('table');
  const [selected, setSelected] = useState(0);
  const record = records[selected];
  return <section className="panel dataset-review"><div className="review-summary"><span>PREVIEW COMPLETE · RUN_7F3A</span><strong>3 retailers checked. 1 field needs review.</strong></div><div className="review-warning">Availability for Trail Shop is unresolved—not rejected. The record remains in the dataset.</div><Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="table">Table</TabsTrigger><TabsTrigger value="json">JSON</TabsTrigger><TabsTrigger value="screens">Evidence screens</TabsTrigger></TabsList></Tabs>{tab === 'table' ? <><div className="table-scroll"><table className="data-table review-table"><thead><tr><th>Retailer</th><th>Product</th><th>Price</th><th>Availability</th><th>Evidence</th></tr></thead><tbody>{records.map((item,index) => <tr className={selected === index ? 'selected' : ''} onClick={() => setSelected(index)} key={item.retailer}><td>{item.retailer}</td><td>{item.product}</td><td>{item.price}</td><td>{item.availability === 'Unknown' ? <Badge tone="warning">Unknown</Badge> : item.availability}</td><td><button className="text-link button-reset">{item.evidence}</button></td></tr>)}</tbody></table></div><aside className="field-evidence"><div><span>FIELD EVIDENCE</span><strong>{record.retailer} · {record.product}</strong></div><blockquote>“{record.product} — {record.price}{record.availability !== 'Unknown' ? ` — ${record.availability}` : ''}.”</blockquote><dl><div><dt>Source</dt><dd>{record.retailer.toLowerCase().replaceAll(' ','-')}.example</dd></div><div><dt>Verdict</dt><dd>{record.evidence}</dd></div></dl></aside></> : tab === 'json' ? <pre className="code-block dataset-json">{JSON.stringify(records,null,2)}</pre> : <div className="evidence-screen-grid">{records.map((item,index) => <button onClick={() => { setSelected(index); setTab('table'); }} key={item.retailer}><span>{item.retailer}</span><div className="mini-product-page"><div className="mini-browser-head"><b>{item.retailer}</b><small>Product</small></div><div className="mini-card-row"><i/><i className="observed"><label>Reading product card</label></i><i/></div><strong>{item.product}</strong><small>{item.price} · {item.availability}</small></div><em>{item.evidence}</em></button>)}</div>}<footer className="review-footer"><span>Preview only · review before saving</span><Button variant="secondary">Export JSON</Button><Button variant="primary">Save dataset</Button></footer></section>;
}
