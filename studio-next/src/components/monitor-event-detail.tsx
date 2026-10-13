'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Eyebrow,
} from '@/components/design-system';
import { useStudio } from '@/lib/data';

export function MonitorEventDetail({ eventId }: { eventId: string }) {
  const state = useStudio((snapshot) => ({
    event: snapshot.monitorEvents.find((item) => item.id === eventId),
    accept: snapshot.controlPlane.acceptMonitorBaseline,
    mute: snapshot.controlPlane.muteMonitorField,
  }));
  const event = state.event;

  if (!event) {
    return (
      <div className="page">
        <Link href="/monitors" className="back-link">
          ← Monitors
        </Link>
        <header className="page-head">
          <Eyebrow>Monitor event</Eyebrow>
          <h1>Event not found</h1>
        </header>
      </div>
    );
  }
  const currentEvent = event;

  function acceptBaseline() {
    state.accept(currentEvent.id);
    toast.success('New baseline accepted.');
  }

  function muteField() {
    state.mute(currentEvent.id);
    toast.success(`${currentEvent.field} muted for 7 days.`);
  }

  return (
    <div className="page">
      <Link href="/monitors" className="back-link">
        ← Monitors
      </Link>
      <header className="page-head">
        <Eyebrow>Monitor event</Eyebrow>
        <h1>{event.title}</h1>
        <p>{event.monitorName} · {event.occurredAt}</p>
        <Badge tone={event.status === 'New' ? 'warning' : 'success'}>{event.status}</Badge>
      </header>
      <Card aria-labelledby="monitor-change-title">
        <CardHeader>
          <div>
            <CardTitle id="monitor-change-title">What changed</CardTitle>
            <CardDescription>{event.field} changed against the trusted baseline.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="definition-grid">
            <Card>
              <CardContent>
                <Eyebrow>Before · baseline</Eyebrow>
                <strong>{event.previousValue}</strong>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Eyebrow>After · detected</Eyebrow>
                <strong>{event.currentValue}</strong>
              </CardContent>
            </Card>
          </div>
          <dl className="detail-list">
          <div>
            <dt>Evidence</dt>
            <dd>“{event.evidence}”</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>
              <a className="text-link" href={event.sourceUrl} target="_blank" rel="noreferrer">
                {new URL(event.sourceUrl).hostname} →
              </a>
            </dd>
          </div>
          <div>
            <dt>Run</dt>
            <dd>
              <Link className="text-link" href={event.runHref}>
                {event.monitorName} · {event.occurredAt.replace(',', '').toLowerCase()} →
              </Link>
            </dd>
          </div>
          </dl>
        </CardContent>
        <CardFooter>
          <span>{event.status === 'New' ? 'Choose how this field should be monitored.' : event.status}</span>
          <Button variant="secondary" onClick={muteField}>
            Mute field for 7 days
          </Button>
          <Button variant="secondary" asChild>
            <Link href={event.runHref}>Open run</Link>
          </Button>
          <Button variant="primary" onClick={acceptBaseline}>
            Accept as new baseline
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
