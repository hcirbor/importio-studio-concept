'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Eyebrow } from '@/components/design-system';
import { useStudio, type DatasetRecord } from '@/lib/data';
import { formatFieldLabel } from '@/lib/field-label';
import { DatasetExportMenu } from './dataset-export-menu';
import { EvidencePanel, type EvidenceDetail } from './evidence-panel';

export function WorkspaceEnrichmentDetail({ enrichmentId }: { enrichmentId: string }) {
  const auth = useStudio((snapshot) => ({
    enrichments: snapshot.auth.enrichments,
    currentWorkspace: snapshot.auth.currentWorkspace,
  }));
  const execution = useStudio((snapshot) => snapshot.execution);
  const enrichment = auth.enrichments.find((item) => item.id === enrichmentId);
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);

  useEffect(() => {
    if (!enrichment) return;
    document.title = `${enrichment.name} · Import.io Studio`;
  }, [enrichment]);

  const exportRecords = useMemo<DatasetRecord[]>(() => enrichment?.rows.map((row) => ({
    id: row.id,
    values: {
      ...row.values,
      ...Object.fromEntries(enrichment.enrichedFields.map((field) => [field, row.enriched[field]?.value ?? null])),
    },
    evidence: Object.fromEntries(enrichment.enrichedFields.flatMap((field) => {
      const cell = row.enriched[field];
      return cell ? [[field, cell.evidence]] : [];
    })),
  })) ?? [], [enrichment]);

  if (!enrichment) {
    return <div className="page"><Link href="/datasets?type=enrichment" className="back-link">← Enrichments</Link><div className="panel empty-page"><div><h1>Enrichment not found</h1><p className="muted">This enrichment is not in {auth.currentWorkspace?.name ?? 'the active workspace'}.</p></div></div></div>;
  }

  const activeEnrichment = enrichment;
  const fields = [...enrichment.inputFields, ...enrichment.enrichedFields];
  const reviewRows = enrichment.rows.filter((row) => enrichment.enrichedFields.some((field) => ['Not stated', 'Conflicting'].includes(row.enriched[field]?.verdict ?? '')));
  const exportDataset = { title: enrichment.name, records: exportRecords };
  const staticRunIds = ['run_batch_91af', 'run_7f3a', 'run_7e91', 'run_failed_9d11'];
  const runHref = enrichment.runId && (staticRunIds.includes(enrichment.runId) ? `/runs/${enrichment.runId}` : `/runs/run_7f3a?run=${encodeURIComponent(enrichment.runId)}`);

  function runEnrichment() {
    void execution.startEnrichment({ enrichmentId: activeEnrichment.id });
  }

  function openEvidence(rowIndex: number, field: string) {
    const row = activeEnrichment.rows[rowIndex];
    const cell = row.enriched[field];
    if (!cell) return;
    setEvidence({
      field: formatFieldLabel(field),
      record: Object.values(row.values)[0] || `Row ${rowIndex + 1}`,
      value: cell.value ?? 'null',
      quote: cell.evidence.quote,
      sourceUrl: cell.evidence.sourceUrl,
      captureLabel: `${activeEnrichment.name} source capture`,
      kind: 'product',
    });
  }

  return (
    <div className="page">
      <Link href="/datasets?type=enrichment" className="back-link">← Enrichments</Link>
      <header className="page-head dataset-detail-head">
        <div><Eyebrow>Enrichment</Eyebrow><h1>{enrichment.name}</h1><p>CSV rows enriched with a verdict and retained evidence for every result.</p></div>
        <DatasetExportMenu dataset={exportDataset} />
      </header>
      <section className="panel dataset-metadata">
        <dl className="detail-list">
          <div><dt>Rows</dt><dd>{enrichment.rowCount} {enrichment.rowCount === 1 ? 'row' : 'rows'}</dd></div>
          <div><dt>State → outcome</dt><dd>{enrichment.state} → {enrichment.outcome}</dd></div>
          <div><dt>Source file</dt><dd>{enrichment.sourceFile}</dd></div>
          <div><dt>Run</dt><dd>{enrichment.runId && runHref ? <Link className="text-link" href={runHref}>{enrichment.runId} →</Link> : 'Not run yet'}</dd></div>
        </dl>
      </section>
      {enrichment.state === 'Validated' && enrichment.outcome === 'Ready' ? <section className="panel enrichment-ready-panel"><div><Eyebrow>Validated CSV</Eyebrow><h2>Ready to enrich {enrichment.rowCount} {enrichment.rowCount === 1 ? 'row' : 'rows'}.</h2><p>The demo will visit each row’s source and retain evidence for the enriched values.</p></div><Button variant="primary" onClick={runEnrichment}>Run enrichment</Button></section> : null}
      {enrichment.state === 'Running' ? <p className="review-feedback" role="status">Running enrichment · checking sources and retaining evidence…</p> : null}
      {enrichment.outcome === 'Partial' ? <div className="review-warning enrichment-review-warning"><span>{reviewRows.length} preview {reviewRows.length === 1 ? 'row needs' : 'rows need'} review: {reviewRows.map((row) => Object.values(row.values)[0]).join(', ')}.</span><Link className="text-link" href="/review">Open Review →</Link></div> : null}
      <section className="panel dataset-detail-table">
        <div className="table-scroll">
          <table className="data-table enrichment-table">
            <thead><tr>{fields.map((field) => <th key={field}>{formatFieldLabel(field)}</th>)}</tr></thead>
            <tbody>{enrichment.rows.map((row, rowIndex) => <tr key={row.id}>{fields.map((field) => {
              const enriched = enrichment.enrichedFields.includes(field);
              const cell = row.enriched[field];
              return <td key={field}>{enriched ? cell ? <button type="button" className="value-evidence-button enrichment-cell" onClick={() => openEvidence(rowIndex, field)}><span>{cell.value ?? 'null'}</span><Badge tone={cell.verdict === 'Supported' ? 'success' : cell.verdict === 'Conflicting' ? 'danger' : 'warning'}>{cell.verdict}</Badge></button> : <span className="muted">—</span> : row.values[field] || '—'}</td>;
            })}</tr>)}</tbody>
          </table>
        </div>
      </section>
      <EvidencePanel evidence={evidence} onClose={() => setEvidence(null)} />
    </div>
  );
}
