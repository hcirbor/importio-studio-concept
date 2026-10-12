'use client';

import { useState } from 'react';
import { Badge, Button, Tabs, TabsList, TabsTrigger } from '@/components/design-system';
import type { DatasetRecord } from '@/lib/data';
import { DatasetExportMenu } from './dataset-export-menu';
import { EvidencePanel, type EvidenceDetail } from './evidence-panel';
import { formatFieldLabel, normalizeFieldName } from '@/lib/workflow/fields';
import { sourceDomain } from '@/lib/web/source-domain';

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

function recordValue(record: (typeof records)[number], field: string) {
  const key = normalizeFieldName(field);
  if (key === 'retailer' || key === 'seller' || key === 'company') return record.retailer;
  if (key === 'product' || key === 'product_name' || key === 'name') return record.product;
  if (key === 'price' || key === 'starting_price') return record.price;
  if (key === 'availability' || key === 'stock' || key === 'status') return record.availability === 'Unknown' ? null : record.availability;
  if (key === 'url' || key === 'pricing_url') return record.sourceUrl;
  return null;
}

export function DatasetReview({ fields = [], onSaved, workspaceName = 'Import.io Studio', datasetName = 'Competitor prices', savedDatasetId = '' }: { fields?: string[]; onSaved?: (records?: DatasetRecord[], fields?: string[]) => void; workspaceName?: string; datasetName?: string; savedDatasetId?: string } = {}) {
  const [tab, setTab] = useState('table');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const selectedRecord = records[selectedIndex];
  const outputFields = (fields.length ? fields : ['retailer','product_name','price','availability']).filter((field) => normalizeFieldName(field) !== 'source');
  const exportRecords: DatasetRecord[] = records.map((record) => ({
    id: record.retailer.toLowerCase().replace(/\W+/g, '-'),
    values: Object.fromEntries(outputFields.map((field) => [field, recordValue(record, field)])),
    evidence: Object.fromEntries(outputFields.map((field) => {
      const value = recordValue(record, field);
      return [field, { sourceUrl: record.sourceUrl, quote: value === null ? 'Not stated · unknown' : `${record.product} — ${record.price}${record.availability !== 'Unknown' ? ` · ${record.availability}` : ''}.` }];
    })),
  }));
  const hasAvailability = outputFields.some((field) => ['availability','stock','status'].includes(normalizeFieldName(field)));
  const jsonRows = exportRecords.map((record, index) => ({
    source: sourceDomain(records[index].sourceUrl),
    ...record.values,
  }));

  function openEvidence(index: number, field: string, value: string | null) {
    const record = records[index];
    const projectedRecord = exportRecords[index];
    const sourceField = field === 'source' ? outputFields[0] : field;
    const retained = sourceField ? projectedRecord.evidence[sourceField] : undefined;
    setSelectedIndex(index);
    setEvidence({
      field,
      record: `${record.retailer} · ${record.product}`,
      value: value ?? 'null',
      quote: retained?.quote ?? 'Source page retained.',
      sourceUrl: record.sourceUrl,
      captureLabel: `${record.retailer} product capture`,
      kind: 'product',
    });
  }

  function saveDataset() {
    setFeedback(`Dataset saved to ${workspaceName}.`);
    onSaved?.(exportRecords, outputFields);
  }

  return (
    <section className="panel dataset-review">
      <div className="review-summary">
        <span>PREVIEW COMPLETE · RUN_7F3A</span>
        <strong>{hasAvailability ? '3 retailers checked. 1 field needs review.' : '3 retailers checked. Records are ready to review.'}</strong>
      </div>
      {hasAvailability ? <div className="review-warning">
        Availability for Trail Shop is unresolved—not rejected. The record remains in the dataset.
      </div> : null}
      {feedback ? <p className="review-feedback" role="status">{feedback}</p> : null}
      <Tabs className="dataset-view-tabs" value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="screens">Record evidence</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'table' ? (
        <>
          <div className="table-scroll">
            <table className="data-table review-table">
              <thead>
                <tr>
                  <th>Source</th>
                  {outputFields.map((field) => <th key={field}>{formatFieldLabel(field)}</th>)}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    className={selectedIndex === index ? 'selected' : ''}
                    key={record.retailer}
                  >
                    <td><button className="value-evidence-button" type="button" onClick={() => openEvidence(index, 'source', record.sourceUrl)}>{sourceDomain(record.sourceUrl)}</button></td>
                    {outputFields.map((field) => {
                      const value = exportRecords[index].values[field];
                      return <td key={field}><button className="value-evidence-button" type="button" onClick={() => openEvidence(index, field, value)}>{value === null ? <><code>null</code><span className="unknown-value">Not stated · unknown</span></> : value}</button></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="field-evidence">
            <div>
              <span>FIELD EVIDENCE</span>
              <strong>{sourceDomain(selectedRecord.sourceUrl)}</strong>
            </div>
            <blockquote>
              “{evidence?.quote ?? exportRecords[selectedIndex].evidence[outputFields[0]]?.quote ?? 'Not stated · unknown'}”
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
        <pre className="code-block dataset-json">{JSON.stringify(jsonRows, null, 2)}</pre>
      ) : (
        <div className="record-evidence-grid">
          {records.map((record, index) => {
            const hasUnknown = Object.values(exportRecords[index].values).some((value) => value === null);
            const firstField = outputFields[0];
            const firstEvidence = firstField ? exportRecords[index].evidence[firstField] : undefined;
            return (
            <article className="record-evidence-card" key={record.retailer}>
              <header>
                <div>
                  <span>RECORD {String(index + 1).padStart(2, '0')}</span>
                  <strong>{record.retailer}</strong>
                </div>
                <Badge tone={hasUnknown ? 'warning' : 'success'}>
                  {hasUnknown ? 'Needs review' : 'Fully supported'}
                </Badge>
              </header>
              <dl>{outputFields.map((field) => <div key={field}><dt>{formatFieldLabel(field)}</dt><dd>{exportRecords[index].values[field] ?? <><code>null</code> · Not stated · unknown</>}</dd></div>)}</dl>
              <blockquote>
                “{firstEvidence?.quote ?? 'Not stated · unknown'}”
              </blockquote>
              <footer>
                <div>
                  <span>Source</span>
                  <code>{record.sourceUrl.replace('https://', '')}</code>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEvidence(index, firstField ?? 'Evidence', firstField ? exportRecords[index].values[firstField] : null)}
                >
                  Open evidence
                </Button>
              </footer>
            </article>
          );})}
        </div>
      )}
      <footer className="review-footer">
        <span>Preview only · review before saving</span>
        <DatasetExportMenu dataset={{ title: datasetName, records: exportRecords }} />
        {savedDatasetId ? <><Button variant="primary" disabled>Saved</Button><Button variant="ghost" asChild><a href={`/datasets/${savedDatasetId}`}>Open dataset</a></Button></> : <Button variant="primary" onClick={saveDataset}>Save dataset</Button>}
      </footer>
      <EvidencePanel evidence={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
