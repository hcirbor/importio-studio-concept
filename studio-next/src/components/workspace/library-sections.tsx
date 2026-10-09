'use client';

import Link from 'next/link';
import { useState } from 'react';
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

const memoryRows: TableRow[] = [
  {
    id: 'competitor-price-review',
    cells: [
      'Competitor price review',
      'run_7f3a',
      'Saved until 5 Nov 2026',
      <Status key="status" tone="warning">Completed · Partial</Status>,
      <Button key="action" variant="ghost" size="sm" asChild>
        <Link href="/build?template=compare&input=prior">Use in new workflow</Link>
      </Button>,
    ],
  },
  {
    id: 'supplier-market-scan',
    cells: [
      'Supplier market scan',
      'run_supplier_2b81',
      'Saved until 18 Nov 2026',
      <Status key="status">Completed · Succeeded</Status>,
      <Button key="action" variant="ghost" size="sm" asChild>
        <Link href="/build?template=discover&input=prior">Use in new workflow</Link>
      </Button>,
    ],
  },
];

const groupFixtures = [
  { name: 'EU supplier discovery', items: '8 items', status: 'Completed · Partial', tone: 'warning' as const },
  { name: 'SaaS pricing sample', items: '10 items', status: 'Completed · Succeeded', tone: 'success' as const },
];

const enrichmentFixtures = [
  { name: 'Supplier enrichment', rows: '248 rows', status: 'Completed → Partial', tone: 'warning' as const },
  { name: 'Retailer domain match', rows: '74 rows', status: 'Completed → Succeeded', tone: 'success' as const },
];

export function SavedRunsSection({ showHeader = true }: { showHeader?: boolean }) {
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
  const [dialogOpen, setDialogOpen] = useState(openCreateOnMount);
  const [name, setName] = useState('New supplier enrichment');
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');

  function createEnrichment() {
    setDialogOpen(false);
    setMessage(`${name} created from ${fileName}. Upload validation is ready.`);
  }

  const rows: TableRow[] = enrichmentFixtures.map((enrichment) => ({
    id: enrichment.name,
    cells: [
      enrichment.name,
      enrichment.rows,
      <Status key="status" tone={enrichment.tone}>{enrichment.status}</Status>,
      <Button
        key="open"
        variant="ghost"
        size="sm"
        onClick={() => setMessage(
          enrichment.name === 'Supplier enrichment'
            ? 'Supplier enrichment selected · 248 rows · 17 unresolved cells.'
            : 'Retailer domain match selected · all 74 rows supported.',
        )}
      >
        Open
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
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
              />
            </label>
            {fileName ? <p className="dialog-file-note">Ready to validate · {fileName}</p> : null}
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
