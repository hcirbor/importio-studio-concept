'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/design-system';
import { can, useStudio, viewerTooltip } from '@/lib/data';
import { CreateMonitorDialog } from '../monitors/create-monitor-dialog';
import { Feedback, PageHead, Status, TablePanel, type TableRow } from './shared';

export function MonitorsSection() {
  const state = useStudio((snapshot) => ({
    session: snapshot.auth.session,
    monitors: snapshot.auth.monitors,
    monitorEvents: snapshot.monitorEvents,
  }));
  const mayCreateMonitor = can(state.session, 'create_monitor');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const rows: TableRow[] = state.monitors.map((monitor) => ({
    id: monitor.id,
    cells: [
      <span key="name">
        <strong>{monitor.name}</strong>
        <small>{monitor.detail}</small>
      </span>,
      monitor.baselineDataset,
      monitor.schedule,
      monitor.lastChange,
      <Status key="status" tone={monitor.tone}>{monitor.status}</Status>,
    ],
  }));
  const activeCount = state.monitors.filter((monitor) => monitor.status !== 'Paused').length;
  const newEventCount = state.monitorEvents.filter((event) => event.status === 'New').length;

  return (
    <>
      <PageHead
        group="Operate"
        title="Monitors"
        description="Keep successful pipelines current and review meaningful changes."
        action={(
          <Button
            variant="primary"
            disabled={!mayCreateMonitor}
            title={!mayCreateMonitor ? viewerTooltip : undefined}
            onClick={() => setDialogOpen(true)}
          >
            Choose a pipeline to monitor
          </Button>
        )}
      />
      <CreateMonitorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onMessage={setMessage}
      />
      <Feedback>{message}</Feedback>
      <section className="panel monitor-note">
        <div>
          <strong>Monitoring starts after a workflow has a trusted baseline.</strong>
          <p>Choose a saved pipeline, select the fields that matter, then set its schedule and alert rules.</p>
        </div>
        <Status>{activeCount} active</Status>
      </section>
      <section className="panel monitor-events">
        <div className="section-head">
          <div>
            <h2>Recent monitor events</h2>
            <p>Meaningful changes detected against trusted baselines.</p>
          </div>
          <Status tone={newEventCount ? 'warning' : 'success'}>{newEventCount} new</Status>
        </div>
        {state.monitorEvents.map((event) => (
          <Link className="monitor-event-row" href={`/monitors/events/${event.id}`} key={event.id}>
            <span>
              <strong>{event.title}</strong>
              <small>{event.monitorName} · {event.occurredAt}</small>
            </span>
            <span>{event.previousValue} → {event.currentValue}</span>
            <Status tone={event.status === 'New' ? 'warning' : 'success'}>{event.status}</Status>
          </Link>
        ))}
      </section>
      <TablePanel
        title="Active monitors"
        meta={`${state.monitors.length} monitor${state.monitors.length === 1 ? '' : 's'} · Next check · 14:00 UTC`}
        headings={['Monitor', 'Pipeline', 'Schedule', 'Last change', 'Status']}
        rows={rows}
      />
    </>
  );
}
