'use client';

import * as XLSX from 'xlsx';
import type { DatasetRecord, WorkspaceDataset } from '@/lib/data';

export type DatasetExportFormat = 'csv' | 'xlsx' | 'json';

function fileStem(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${new Date().toISOString().slice(0, 10)}`;
}

function rowsForExport(records: DatasetRecord[]) {
  return records.map((record) => {
    const retainedSource = Object.entries(record.values).find(([field]) => field.toLowerCase() === 'source')?.[1];
    const evidenceSource = Object.values(record.evidence).find((item) => item.sourceUrl)?.sourceUrl ?? '';
    const rawSource = retainedSource || evidenceSource;
    let source = rawSource;
    try {
      source = new URL(rawSource.includes('://') ? rawSource : `https://${rawSource}`).hostname.replace(/^www\./, '');
    } catch {
      source = rawSource;
    }
    const values = Object.fromEntries(Object.entries(record.values)
      .filter(([field]) => field.toLowerCase() !== 'source'));
    const evidence = Object.entries(record.evidence)
      .map(([field, item]) => `${field}: ${item.sourceUrl} — ${item.quote}`)
      .join(' | ');
    return { source, ...values, evidence };
  });
}

export function createDatasetExport(dataset: Pick<WorkspaceDataset, 'title' | 'records'>, format: DatasetExportFormat) {
  const rows = rowsForExport(dataset.records ?? []);
  const stem = fileStem(dataset.title);
  if (format === 'json') return { filename: `${stem}.json`, blob: new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }) };
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (format === 'csv') return { filename: `${stem}.csv`, blob: new Blob([XLSX.utils.sheet_to_csv(sheet)], { type: 'text/csv;charset=utf-8' }) };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Dataset');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });
  return { filename: `${stem}.xlsx`, blob: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) };
}
