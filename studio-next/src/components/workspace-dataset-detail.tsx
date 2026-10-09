'use client';

import Link from 'next/link';
import { Eyebrow } from '@/components/design-system';
import { useAuth } from '@/lib/auth';
import { DatasetExportMenu } from './dataset-export-menu';
import { EvidencePanel, type EvidenceDetail } from './evidence-panel';
import { useState } from 'react';

export function WorkspaceDatasetDetail({ datasetId }: { datasetId: string }) {
  const auth = useAuth();
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const dataset = auth.datasets.find((item) => item.id === datasetId);
  if (!dataset) {
    return <div className="page"><Link href="/datasets" className="back-link">← Datasets</Link><div className="panel empty-page"><div><h1>Dataset not found</h1><p className="muted">This dataset is not in {auth.currentWorkspace?.name ?? 'the active workspace'}.</p></div></div></div>;
  }
  const records = dataset.records ?? [];
  const datasetTitle = dataset.title;
  const fields = dataset.fields?.length ? dataset.fields : Array.from(new Set(records.flatMap((record) => Object.keys(record.values))));
  const recordCount = dataset.recordCount ?? records.length;
  function showEvidence(recordId: string, field: string) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;
    const detail = record.evidence[field];
    setEvidence({
      field,
      record: fields.map((name) => record.values[name]).find(Boolean) ?? record.id,
      value: record.values[field] ?? '—',
      quote: detail?.quote ?? 'No retained quote for this field.',
      sourceUrl: detail?.sourceUrl ?? '',
      captureLabel: `${datasetTitle} capture`,
      kind: fields.some((name) => name.toLowerCase().includes('price')) ? 'pricing' : 'product',
    });
  }
  return (
    <div className="page">
      <Link href="/datasets" className="back-link">← Datasets</Link>
      <header className="page-head dataset-detail-head">
        <div><Eyebrow>Dataset</Eyebrow><h1>{dataset.title}</h1><p>{dataset.version.replace('DATASET · ', 'Version ')} · evidence retained with every supported value.</p></div>
        <DatasetExportMenu dataset={dataset} />
      </header>
      <section className="panel dataset-metadata">
        <dl className="detail-list">
          <div><dt>Records</dt><dd>{recordCount} {recordCount === 1 ? 'record' : 'records'}</dd></div>
          <div><dt>Fields</dt><dd>{fields.join(', ') || '—'}</dd></div>
          <div><dt>Last updated</dt><dd>{dataset.lastUpdated ?? 'Just now'}</dd></div>
          <div><dt>Source</dt><dd>{dataset.sourceRunId ? <Link className="text-link" href={['run_batch_91af','run_7f3a','run_7e91','run_failed_9d11'].includes(dataset.sourceRunId) ? `/runs/${dataset.sourceRunId}` : `/runs/run_7f3a?run=${encodeURIComponent(dataset.sourceRunId)}`}>{dataset.sourceWorkflow ?? 'Workflow'} · {dataset.sourceRunId} →</Link> : dataset.sourceWorkflow ?? 'Saved workflow'}</dd></div>
        </dl>
      </section>
      <section className="panel dataset-detail-table">
        <div className="table-scroll"><table className="data-table"><thead><tr>{fields.map((field)=><th key={field}>{field}</th>)}</tr></thead><tbody>{records.map((record)=><tr key={record.id}>{fields.map((field)=><td key={field}><button type="button" className="value-evidence-button" onClick={()=>showEvidence(record.id,field)}>{record.values[field] ?? '—'}{record.reviewedBy?.[field] ? <small className="reviewed-by">Reviewed by {record.reviewedBy[field]}</small> : null}</button></td>)}</tr>)}</tbody></table></div>
        {!records.length ? <div className="panel-body"><p className="muted">No records have been saved yet.</p></div> : null}
      </section>
      <EvidencePanel evidence={evidence} onClose={()=>setEvidence(null)} />
    </div>
  );
}
