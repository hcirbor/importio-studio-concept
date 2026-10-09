'use client';

import { useState } from 'react';
import { Badge, Button, Tabs, TabsList, TabsTrigger } from '@/components/design-system';
import { downloadJson } from '@/lib/download-json';
import { EvidencePanel, type EvidenceDetail } from './evidence-panel';

const records = [
  {
    retailer: 'Northwind Outdoors',
    product: 'Trailhead 2P Tent',
    price: '€249.00',
    availability: 'In stock',
    evidence: 'Supported · product page',
    sourceUrl: 'https://northwind-outdoors.example/tents/trailhead-2p',
  },
  {
    retailer: 'Summit Supply',
    product: 'Trailhead Two-Person Tent',
    price: '€239.00',
    availability: 'Low stock',
    evidence: 'Supported · product card',
    sourceUrl: 'https://summit-supply.example/camping/trailhead-two-person',
  },
  {
    retailer: 'Trail Shop',
    product: 'Trailhead 2 Person',
    price: '€259.00',
    availability: 'Unknown',
    evidence: 'Price supported · review field',
    sourceUrl: 'https://trail-shop.example/search?q=trailhead',
  },
];

export function DatasetReview({ onSaved }: { onSaved?: () => void } = {}) {
  const [tab, setTab] = useState('table');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const selectedRecord = records[selectedIndex];

  function exportRecords() {
    downloadJson('competitor-prices.json', records);
    setFeedback('Dataset exported as JSON.');
  }

  function openEvidence(index: number, field: string, value: string) {
    const record = records[index];
    setSelectedIndex(index);
    setEvidence({
      field,
      record: `${record.retailer} · ${record.product}`,
      value,
      quote: value === 'Unknown'
        ? `${record.product} is listed at ${record.price}; no supported availability statement appears on the captured page.`
        : `${record.product} — ${field.toLowerCase()}: ${value}.`,
      sourceUrl: record.sourceUrl,
      captureLabel: `${record.retailer} product capture`,
      kind: 'product',
    });
  }

  function saveDataset() {
    setFeedback('Dataset saved as Competitor prices · v4.');
    onSaved?.();
  }

  return (
    <section className="panel dataset-review">
      <div className="review-summary">
        <span>PREVIEW COMPLETE · RUN_7F3A</span>
        <strong>3 retailers checked. 1 field needs review.</strong>
      </div>
      <div className="review-warning">
        Availability for Trail Shop is unresolved—not rejected. The record remains in the dataset.
      </div>
      {feedback ? <p className="review-feedback" role="status">{feedback}</p> : null}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="screens">Evidence screens</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'table' ? (
        <>
          <div className="table-scroll">
            <table className="data-table review-table">
              <thead>
                <tr>
                  <th>Retailer</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    className={selectedIndex === index ? 'selected' : ''}
                    key={record.retailer}
                  >
                    <td><button className="value-evidence-button" type="button" onClick={() => openEvidence(index, 'Retailer', record.retailer)}>{record.retailer}</button></td>
                    <td><button className="value-evidence-button" type="button" onClick={() => openEvidence(index, 'Product', record.product)}>{record.product}</button></td>
                    <td><button className="value-evidence-button" type="button" onClick={() => openEvidence(index, 'Price', record.price)}>{record.price}</button></td>
                    <td><button className="value-evidence-button" type="button" onClick={() => openEvidence(index, 'Availability', record.availability)}>{record.availability === 'Unknown' ? <Badge tone="warning">Unknown</Badge> : record.availability}</button></td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-link"
                        onClick={() => openEvidence(index, 'Evidence', record.evidence)}
                      >
                        {record.evidence}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="field-evidence">
            <div>
              <span>FIELD EVIDENCE</span>
              <strong>{selectedRecord.retailer} · {selectedRecord.product}</strong>
            </div>
            <blockquote>
              “{selectedRecord.product} — {selectedRecord.price}
              {selectedRecord.availability !== 'Unknown' ? ` — ${selectedRecord.availability}` : ''}.”
            </blockquote>
            <dl>
              <div>
                <dt>Source</dt>
                <dd>{selectedRecord.sourceUrl.replace('https://', '')}</dd>
              </div>
              <div>
                <dt>Verdict</dt>
                <dd>{selectedRecord.evidence}</dd>
              </div>
            </dl>
          </aside>
        </>
      ) : tab === 'json' ? (
        <pre className="code-block dataset-json">{JSON.stringify(records, null, 2)}</pre>
      ) : (
        <div className="evidence-screen-grid">
          {records.map((record, index) => (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedIndex(index);
                setTab('table');
              }}
              key={record.retailer}
            >
              <span>{record.retailer}</span>
              <div className="mini-product-page">
                <div className="mini-browser-head"><b>{record.retailer}</b><small>Product</small></div>
                <div className="mini-card-row">
                  <i />
                  <i className="observed"><label>Reading product card</label></i>
                  <i />
                </div>
                <strong>{record.product}</strong>
                <small>{record.price} · {record.availability}</small>
              </div>
              <em>{record.evidence}</em>
            </Button>
          ))}
        </div>
      )}
      <footer className="review-footer">
        <span>Preview only · review before saving</span>
        <Button variant="secondary" onClick={exportRecords}>Export JSON</Button>
        <Button variant="primary" onClick={saveDataset}>
          Save dataset
        </Button>
      </footer>
      <EvidencePanel evidence={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
