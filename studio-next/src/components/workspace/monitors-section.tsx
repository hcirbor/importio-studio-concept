'use client';

import { useState } from 'react';
import { Button } from '@/components/design-system';
import { can, useStudio, viewerTooltip } from '@/lib/data';
import { CreateMonitorDialog } from '../monitors/create-monitor-dialog';
import { Feedback, PageHead, Status, TablePanel, type TableRow } from './shared';

export function MonitorsSection() {
  const session = useStudio((snapshot) => snapshot.auth.session);
  const monitors = useStudio((snapshot) => snapshot.auth.monitors);
  const mayCreateMonitor = can(session, 'create_monitor');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const rows: TableRow[] = monitors.map((monitor) => ({ id: monitor.id, cells: [<span key="name"><strong>{monitor.name}</strong><small>{monitor.detail}</small></span>, monitor.baselineDataset, monitor.schedule, monitor.lastChange, <Status key="status" tone={monitor.tone}>{monitor.status}</Status>] }));
  const activeCount = monitors.filter((monitor) => monitor.status !== 'Paused').length;

  return <><PageHead group="Operate" title="Monitors" description="Keep successful pipelines current and review meaningful changes." action={<Button variant="primary" disabled={!mayCreateMonitor} title={!mayCreateMonitor ? viewerTooltip : undefined} onClick={() => setDialogOpen(true)}>Choose a pipeline to monitor</Button>} /><CreateMonitorDialog open={dialogOpen} onOpenChange={setDialogOpen} onMessage={setMessage} /><Feedback>{message}</Feedback><section className="panel monitor-note"><div><strong>Monitoring starts after a workflow has a trusted baseline.</strong><p>Choose a saved pipeline, select the fields that matter, then set its schedule and alert rules.</p></div><Status>{activeCount} active</Status></section><TablePanel title="Active monitors" meta={`${monitors.length} monitor${monitors.length === 1 ? '' : 's'} · Next check · 14:00 UTC`} headings={['Monitor', 'Pipeline', 'Schedule', 'Last change', 'Status']} rows={rows} /></>;
}
