'use client';

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/design-system';
import { useState } from 'react';
import type { WorkspaceDataset } from '@/lib/auth';
import { createDatasetExport, type DatasetExportFormat } from '@/lib/dataset-export';

type DownloadLink = { href: string; filename: string };

export function DatasetExportMenu({ dataset, label = 'Export' }: { dataset: Pick<WorkspaceDataset, 'title' | 'records'>; label?: string }) {
  const [open, setOpen] = useState(false);
  const [downloads, setDownloads] = useState<Partial<Record<DatasetExportFormat, DownloadLink>>>({});
  function openDialog() {
    const next = Object.fromEntries((['csv','xlsx','json'] as DatasetExportFormat[]).map((format) => {
      const file = createDatasetExport(dataset, format);
      return [format, { href: URL.createObjectURL(file.blob), filename: file.filename }];
    })) as Record<DatasetExportFormat, DownloadLink>;
    setDownloads(next);
    setOpen(true);
  }
  function closeDialog() {
    setOpen(false);
    const current = downloads;
    window.setTimeout(() => Object.values(current).forEach((link) => URL.revokeObjectURL(link.href)), 1000);
  }
  function formatLink(format: DatasetExportFormat, label: string) {
    const download = downloads[format];
    return <Button variant="secondary" disabled={!download} asChild={Boolean(download)}>{download ? <a href={download.href} download={download.filename} onClick={closeDialog}>{label}</a> : label}</Button>;
  }
  return (
    <Dialog open={open} onOpenChange={(next)=>next ? openDialog() : closeDialog()}>
      <Button variant="secondary" onClick={openDialog}>{label}</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export {dataset.title}</DialogTitle>
          <DialogDescription>Every format includes an evidence column with the source URL and retained quote.</DialogDescription>
        </DialogHeader>
        <div className="export-format-grid">
          {formatLink('csv','CSV')}
          {formatLink('xlsx','Excel (.xlsx)')}
          {formatLink('json','JSON')}
        </div>
      </DialogContent>
    </Dialog>
  );
}
