'use client';

import Link from 'next/link';
import { Eyebrow } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { formatFieldLabel } from '@/lib/field-label';
import { DatasetExportMenu } from './dataset-export-menu';
import { EvidencePanel, type EvidenceDetail } from './evidence-panel';
import { useState } from 'react';
import { RelativeTime } from './relative-time';

export function WorkspaceDatasetDetail({ datasetId }: { datasetId: string }) {
  const auth = useStudio((snapshot) => snapshot.auth);
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const dataset = auth.datasets.find((item) => item.id === datasetId);
  if (!dataset) {
    return <div className="page"><Link href="/datasets" className="back-link">← Datasets</Link><div className="panel empty-page"><div><h1>Dataset not found</h1><p className="muted">This dataset is not in {auth.currentWorkspace?.name ?? 'the active workspace'}.</p></div></div></div>;
  }
  const records = dataset.records ?? [];
  const datasetTitle = dataset.title;
  const fields = dataset.fields?.length ? dataset.fields : Array.from(new Set(records.flatMap((record) => Object.keys(record.values))));
  const sourceField = fields.find((field) => field.trim().toLowerCase() === 'source');
  const tableFields = ['source', ...fields.filter((field) => field.trim().toLowerCase() !== 'source')];
  const recordCount = dataset.recordCount ?? records.length;
  const unresolvedCount = dataset.unresolvedCount ?? Number(dataset.detail.match(/(\d+)\s+unresolved/i)?.[1] ?? 0);
  function sourceDomain(record: (typeof records)[number]) {
    const retainedSource = sourceField ? record.values[sourceField] : undefined;
    const evidenceSource = Object.values(record.evidence).find((item) => item.sourceUrl)?.sourceUrl;
    const source = retainedSource || evidenceSource || '';
    if (!source) return '—';
    try {
      return new URL(source.includes('://') ? source : `https://${source}`).hostname.replace(/^www\./, '');
    } catch {
      return source;
    }
  }
  function showEvidence(recordId: string, field: string) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;
    const evidenceField = field === 'source' ? sourceField ?? Object.keys(record.evidence)[0] : field;
    const detail = evidenceField ? record.evidence[evidenceField] : undefined;
    setEvidence({
      field,
      record: fields.map((name) => record.values[name]).find(Boolean) ?? record.id,
      value: field === 'source' ? sourceDomain(record) : record.values[field] ?? 'null',
      quote: detail?.quote ?? (record.values[field] === null ? 'Not stated · unknown' : 'No retained quote for this field.'),
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
          <div><dt>Fields</dt><dd>{fields.map(formatFieldLabel).join(', ') || '—'}</dd></div>
          <div><dt>Status</dt><dd>{dataset.status} · {unresolvedCount} unresolved</dd></div>
          <div><dt>Last updated</dt><dd><RelativeTime timestamp={dataset.updatedAt} fallback={dataset.lastUpdated ?? 'Just now'} /></dd></div>
          <div><dt>Source</dt><dd>{dataset.sourceRunId ? <Link className="text-link" href={['run_batch_91af','run_7f3a','run_7e91','run_failed_9d11'].includes(dataset.sourceRunId) ? `/runs/${dataset.sourceRunId}` : `/runs/run_7f3a?run=${encodeURIComponent(dataset.sourceRunId)}`}>{dataset.sourceWorkflow ?? 'Workflow'} · {dataset.sourceRunId} →</Link> : dataset.sourceWorkflow ?? 'Saved workflow'}</dd></div>
        </dl>
      </section>
      <section className="panel dataset-detail-table">
        <div className="table-scroll"><table className="data-table"><thead><tr>{tableFields.map((field)=><th key={field}>{formatFieldLabel(field)}</th>)}</tr></thead><tbody>{records.map((record)=><tr key={record.id}>{tableFields.map((field)=><td key={field}><button type="button" className="value-evidence-button" onClick={()=>showEvidence(record.id,field)}>{field === 'source' ? sourceDomain(record) : record.values[field] === null ? <><code>null</code><span className="unknown-value">Not stated · unknown</span></> : record.values[field] ?? '—'}{field !== 'source' && record.reviewedBy?.[field] ? <small className="reviewed-by">Reviewed by {record.reviewedBy[field]}</small> : null}</button></td>)}</tr>)}</tbody></table></div>
        {!records.length ? <div className="panel-body"><p className="muted">No records have been saved yet.</p></div> : null}
      </section>
      <EvidencePanel evidence={evidence} onClose={()=>setEvidence(null)} />
    </div>
  );
}
