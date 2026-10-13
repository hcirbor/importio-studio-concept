'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  const [eventOpen, setEventOpen] = useState(false);
  const [eventState, setEventState] = useState<'New' | 'Baseline accepted' | 'Muted 7 days'>('New');
  const rows: TableRow[] = monitors.map((monitor) => ({ id: monitor.id, cells: [<span key="name"><strong>{monitor.name}</strong><small>{monitor.detail}</small></span>, monitor.baselineDataset, monitor.schedule, monitor.lastChange, <Status key="status" tone={monitor.tone}>{monitor.status}</Status>] }));
  const activeCount = monitors.filter((monitor) => monitor.status !== 'Paused').length;

  return <><PageHead group="Operate" title="Monitors" description="Keep successful pipelines current and review meaningful changes." action={<Button variant="primary" disabled={!mayCreateMonitor} title={!mayCreateMonitor ? viewerTooltip : undefined} onClick={() => setDialogOpen(true)}>Choose a pipeline to monitor</Button>} /><CreateMonitorDialog open={dialogOpen} onOpenChange={setDialogOpen} onMessage={setMessage} /><Feedback>{message}</Feedback><section className="panel monitor-note"><div><strong>Monitoring starts after a workflow has a trusted baseline.</strong><p>Choose a saved pipeline, select the fields that matter, then set its schedule and alert rules.</p></div><Status>{activeCount} active</Status></section><section className="panel monitor-events"><div className="section-head"><div><h2>Recent monitor events</h2><p>Meaningful changes detected against trusted baselines.</p></div><Status tone="warning">1 new</Status></div><button type="button" className="monitor-event-row" onClick={() => setEventOpen(true)}><span><strong>Trailhead availability changed</strong><small>Trailhead availability · Today, 09:42</small></span><span>Low stock → In stock</span><Status tone={eventState === 'New' ? 'warning' : 'success'}>{eventState}</Status></button>{eventOpen ? <article className="monitor-event-detail" aria-labelledby="monitor-event-title"><div className="section-head"><div><small className="mono-label">Monitor event</small><h3 id="monitor-event-title">Trailhead availability changed</h3></div><Button variant="ghost" onClick={() => setEventOpen(false)}>Close</Button></div><dl className="detail-list"><div><dt>What changed</dt><dd>Availability changed from “Low stock” to “In stock”.</dd></div><div><dt>Evidence</dt><dd>“Trailhead 2P Tent · €249.00 · In stock” · northwind-outdoors.example</dd></div><div><dt>Run</dt><dd><Link className="text-link" href="/runs/run_monitor">run_monitor →</Link></dd></div></dl><div className="page-action-row"><span>{eventState === 'New' ? 'Choose how this field should be monitored.' : eventState}</span><Button variant="secondary" onClick={() => setEventState('Muted 7 days')}>Mute field for 7 days</Button><Button variant="secondary" asChild><Link href="/runs/run_monitor">Open run</Link></Button><Button variant="primary" onClick={() => setEventState('Baseline accepted')}>Accept new baseline</Button></div></article> : null}</section><TablePanel title="Active monitors" meta={`${monitors.length} monitor${monitors.length === 1 ? '' : 's'} · Next check · 14:00 UTC`} headings={['Monitor', 'Pipeline', 'Schedule', 'Last change', 'Status']} rows={rows} /></>;
}
