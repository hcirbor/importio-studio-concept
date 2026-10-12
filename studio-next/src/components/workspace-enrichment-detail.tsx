'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Eyebrow } from '@/components/design-system';
import { useStudio, type DatasetRecord, type EnrichmentCell } from '@/lib/data';
import { formatFieldLabel } from '@/lib/field-label';
import { DatasetExportMenu } from './dataset-export-menu';
import { EvidencePanel, type EvidenceDetail } from './evidence-panel';

function sourceUrl(values: Record<string, string>) {
  const raw = Object.entries(values).find(([field]) => /(?:website|domain|url|source)/i.test(field))?.[1] ?? '';
  return raw && !raw.includes('://') ? `https://${raw}` : raw;
}

function enrichedValue(field: string, rowIndex: number, values: Record<string, string>): EnrichmentCell {
  const source = sourceUrl(values);
  const names = ['Industrial tools', 'Business software', 'Outdoor equipment', 'Wholesale distribution', 'Retail'];
  const locations = ['Birmingham, UK', 'Amsterdam, Netherlands', 'Rotterdam, Netherlands', 'Lyon, France', 'Innsbruck, Austria'];
  const value = field === 'category' ? names[rowIndex % names.length] : locations[rowIndex % locations.length];
  const subject = Object.values(values)[0] || `Row ${rowIndex + 1}`;
  return {
    value,
    verdict: 'Supported',
    evidence: {
      sourceUrl: source || `https://source-${rowIndex + 1}.example`,
      quote: field === 'category'
        ? `${subject} describes its business as ${value.toLowerCase()}.`
        : `${subject} lists ${value} as its main office.`,
    },
  };
}

export function WorkspaceEnrichmentDetail({ enrichmentId }: { enrichmentId: string }) {
  const auth = useStudio((snapshot) => snapshot.auth);
  const enrichment = auth.enrichments.find((item) => item.id === enrichmentId);
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enrichment) return;
    document.title = `${enrichment.name} · Import.io Studio`;
  }, [enrichment]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

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
    const runId = `run_${Math.random().toString(36).slice(2, 8)}`;
    setRunning(true);
    auth.updateEnrichment(activeEnrichment.id, { state: 'Running', runId });
    auth.addRun({
      id: runId,
      when: 'Running now',
      createdAt: Date.now(),
      pipeline: activeEnrichment.name,
      coverage: `0 / ${activeEnrichment.rowCount} rows`,
      records: '0',
      queries: activeEnrichment.rowCount,
      state: 'Running',
      outcome: 'Running',
      tone: 'info',
      badge: true,
      scenario: 'extract',
    });
    timerRef.current = window.setTimeout(() => {
      const rows = activeEnrichment.rows.map((row, rowIndex) => ({
        ...row,
        enriched: Object.fromEntries(activeEnrichment.enrichedFields.map((field) => [field, enrichedValue(field, rowIndex, row.values)])),
      }));
      auth.updateEnrichment(activeEnrichment.id, { rows, state: 'Completed', outcome: 'Succeeded', runId });
      auth.updateRun(runId, { coverage: `${activeEnrichment.rowCount} / ${activeEnrichment.rowCount} rows`, records: String(activeEnrichment.rowCount), state: 'Completed', outcome: 'Succeeded', tone: 'success', when: 'Just now' });
      setRunning(false);
    }, 1200);
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
      {enrichment.state === 'Validated' && enrichment.outcome === 'Ready' ? <section className="panel enrichment-ready-panel"><div><Eyebrow>Validated CSV</Eyebrow><h2>Ready to enrich {enrichment.rowCount} {enrichment.rowCount === 1 ? 'row' : 'rows'}.</h2><p>The demo will visit each row’s source and retain evidence for the enriched values.</p></div><Button variant="primary" onClick={runEnrichment} disabled={running}>{running ? 'Running enrichment…' : 'Run enrichment'}</Button></section> : null}
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
