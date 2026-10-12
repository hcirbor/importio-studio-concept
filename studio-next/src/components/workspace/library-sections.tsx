'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStudio, type WorkspaceEnrichment } from '@/lib/data';
import { datasetSlug } from '@/lib/dataset-slug';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/components/design-system';
import { Feedback, PageHead, Status, TablePanel, type TableRow } from './shared';

function uniqueEnrichmentSlug(name: string, existingIds: string[]) {
  const base = datasetSlug(name);
  if (!existingIds.includes(base)) return base;
  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function csvCells(line: string) {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      cell += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function fieldKey(label: string, index: number) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `column_${index + 1}`;
}

export function SavedRunsSection({ showHeader = true }: { showHeader?: boolean }) {
  const memoryRowsFixture = useStudio((snapshot) => snapshot.fixtures.memoryRows);
  const memoryRows: TableRow[] = memoryRowsFixture.map((row) => ({
    id: row.id,
    cells: [row.label, row.runId, row.retention, <Status key="status" tone={row.tone}>{row.status}</Status>, <Button key="action" variant="ghost" size="sm" asChild><Link href={row.href}>Use in new workflow</Link></Button>],
  }));
  return (
    <>
      {showHeader ? <PageHead group="Operate" title="Saved runs" description="Saved runs available as labelled prior research." /> : null}
      <TablePanel
        title="Saved runs"
        meta="2 saved runs"
        headings={['Label', 'Run', 'Retention', 'State → outcome', '']}
        rows={memoryRows}
      />
    </>
  );
}

export function BatchesSection({ showHeader = true }: { showHeader?: boolean }) {
  const groupFixtures = useStudio((snapshot) => snapshot.fixtures.groups);
  const [message, setMessage] = useState<string>();
  const rows: TableRow[] = groupFixtures.map((group) => ({
    id: group.name,
    cells: [
      group.name,
      group.items,
      <Status key="status" tone={group.tone}>{group.status}</Status>,
      <Button
        key="retry"
        variant="secondary"
        onClick={() => setMessage(`${group.name}: retry queued for failed items only.`)}
      >
        Retry failed only
      </Button>,
    ],
  }));

  return (
    <>
      {showHeader ? <PageHead group="Operate" title="Batches" description="Bounded batches of 2–10 items with per-item status." /> : null}
      <Feedback tone="info">{message}</Feedback>
      <TablePanel
        title="Batches"
        meta="2 batches"
        headings={['Batch', 'Items', 'State → outcome', '']}
        rows={rows}
      />
    </>
  );
}

export function EnrichmentsSection({ showHeader = true, openCreateOnMount = false }: { showHeader?: boolean; openCreateOnMount?: boolean }) {
  const auth = useStudio((snapshot) => ({
    enrichments: snapshot.auth.enrichments,
    addEnrichment: snapshot.auth.addEnrichment,
  }));
  const [dialogOpen, setDialogOpen] = useState(openCreateOnMount);
  const [name, setName] = useState('New supplier enrichment');
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);

  const sampleHeaders = ['Company', 'Website'];
  const sampleRows = [
    ['Acme Tools', 'acme-tools.example'],
    ['WidgetCo', 'widgetco.example'],
    ['Northwind Outdoors', 'northwind-outdoors.example'],
    ['Summit Supply', 'summit-supply.example'],
    ['Trail Shop', 'trail-shop.example'],
  ];

  useEffect(() => {
    if (!openCreateOnMount) return;
    const timer = window.setTimeout(() => setDialogOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [openCreateOnMount]);

  function createEnrichment() {
    const trimmedName = name.trim();
    const id = uniqueEnrichmentSlug(trimmedName, auth.enrichments.map((item) => item.id));
    const inputFields = csvHeaders.map(fieldKey);
    const rows = csvRows.map((row, rowIndex) => ({
      id: `${id}-${rowIndex + 1}`,
      values: Object.fromEntries(inputFields.map((field, columnIndex) => [field, row[columnIndex] ?? ''])),
      enriched: {},
    }));
    const enrichment: WorkspaceEnrichment = {
      id,
      name: trimmedName,
      rowCount,
      state: 'Validated',
      outcome: 'Ready',
      sourceFile: fileName,
      inputFields,
      enrichedFields: ['category', 'headquarters'],
      rows,
    };
    auth.addEnrichment(enrichment);
    setDialogOpen(false);
    setMessage(`${trimmedName} created from ${fileName}. Upload validation is ready.`);
  }

  function useSampleCsv() {
    setFileName('enrichment-sample.csv');
    setCsvHeaders(sampleHeaders);
    setCsvRows(sampleRows);
    setRowCount(sampleRows.length);
  }

  async function loadCsv(file?: File) {
    setFileName(file?.name ?? '');
    if (!file) {
      setRowCount(0);
      setCsvHeaders([]);
      setCsvRows([]);
      return;
    }
    const lines = (await file.text()).replace(/\r/g, '').split('\n').filter((line) => line.trim());
    const headers = lines.length ? csvCells(lines[0]) : [];
    const rows = lines.slice(1).map(csvCells);
    setCsvHeaders(headers);
    setCsvRows(rows);
    setRowCount(rows.length);
  }

  const rows: TableRow[] = auth.enrichments.map((enrichment) => ({
    id: enrichment.id,
    cells: [
      enrichment.name,
      `${enrichment.rowCount} ${enrichment.rowCount === 1 ? 'row' : 'rows'}`,
      <Status key="status" tone={enrichment.outcome === 'Partial' ? 'warning' : 'success'}>{enrichment.state} → {enrichment.outcome}</Status>,
      <Button key="open" variant="ghost" size="sm" asChild>
        <Link href={`/datasets/enrichments/${enrichment.id}`}>Open</Link>
      </Button>,
    ],
  }));

  return (
    <>
      {showHeader ? <PageHead group="Operate" title="Enrichments" description="CSV enrichment with a verdict and evidence per cell." /> : null}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create an enrichment</DialogTitle>
            <DialogDescription>Choose a CSV and name the enrichment. This demo validates the file locally without uploading data.</DialogDescription>
          </DialogHeader>
          <div className="dialog-form">
            <label>
              NAME
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              CSV FILE
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => { void loadCsv(event.target.files?.[0]); }}
              />
            </label>
            <Button variant="ghost" type="button" className="csv-sample" onClick={useSampleCsv}>Use sample CSV</Button>
            {fileName ? <p className="dialog-file-note">Ready to validate · {fileName} · {rowCount} {rowCount === 1 ? 'row' : 'rows'}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createEnrichment} disabled={!name.trim() || !fileName}>
              Create enrichment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Feedback>{message}</Feedback>
      <TablePanel
        title="Enrichments"
        action={<Button variant="primary" onClick={() => setDialogOpen(true)}>Create from CSV</Button>}
        headings={['Enrichment', 'Rows', 'State → outcome', '']}
        rows={rows}
      />
    </>
  );
}
