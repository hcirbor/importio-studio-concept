'use client';

import { useState } from 'react';
import { Badge, Button, Tabs, TabsList, TabsTrigger } from '@/components/design-system';
import { downloadJson } from '@/lib/download-json';

const records = [
  {
    retailer: 'Northwind Outdoors',
    product: 'Trailhead 2P Tent',
    price: '€249.00',
    availability: 'In stock',
    evidence: 'Supported · product page',
  },
  {
    retailer: 'Summit Supply',
    product: 'Trailhead Two-Person Tent',
    price: '€239.00',
    availability: 'Low stock',
    evidence: 'Supported · product card',
  },
  {
    retailer: 'Trail Shop',
    product: 'Trailhead 2 Person',
    price: '€259.00',
    availability: 'Unknown',
    evidence: 'Price supported · review field',
  },
];

export function DatasetReview() {
  const [tab, setTab] = useState('table');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const selectedRecord = records[selectedIndex];

  function exportRecords() {
    downloadJson('competitor-prices.json', records);
    setFeedback('Dataset exported as JSON.');
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
                    onClick={() => setSelectedIndex(index)}
                    key={record.retailer}
                  >
                    <td>{record.retailer}</td>
                    <td>{record.product}</td>
                    <td>{record.price}</td>
                    <td>{record.availability === 'Unknown' ? <Badge tone="warning">Unknown</Badge> : record.availability}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-link"
                        onClick={() => setSelectedIndex(index)}
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
                <dd>{selectedRecord.retailer.toLowerCase().replaceAll(' ', '-')}.example</dd>
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
        <Button variant="primary" onClick={() => setFeedback('Dataset saved as Competitor prices · v4.')}>
          Save dataset
        </Button>
      </footer>
    </section>
  );
}
