'use client';

import Link from 'next/link';
import { Badge } from '@/components/design-system';
import { useStudio } from '@/lib/data';

export function HomeAttention() {
  const state = useStudio((snapshot) => ({
    datasets: snapshot.auth.datasets,
    repairs: snapshot.pipelineRepairs,
    monitorEvents: snapshot.monitorEvents,
  }));
  const reviewItems = state.datasets.filter((dataset) => dataset.review?.status === 'Open');
  const repairs = state.repairs.filter((repair) => repair.status !== 'Approved');
  const monitorEvents = state.monitorEvents.filter((event) => event.status === 'New');
  const itemCount = reviewItems.length + repairs.length + monitorEvents.length;

  return (
    <article className="panel attention-panel">
      <div className="section-head">
        <h2>Needs attention</h2>
        <Badge tone={itemCount ? 'warning' : 'success'}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Badge>
      </div>
      <div className="panel-body">
        {reviewItems.map((dataset) => (
          <div className="attention-item" key={`review-${dataset.id}`}>
            <span>!</span>
            <div>
              <strong>Needs review</strong>
              <small>{dataset.review?.itemDescription}</small>
            </div>
            <Link href="/review" className="text-link">
              Review
            </Link>
          </div>
        ))}
        {repairs.map((repair) => (
          <div className="attention-item" key={repair.id}>
            <span>!</span>
            <div>
              <strong>{repair.pipelineName} needs repair</strong>
              <small>{repair.title} · repair ready to review</small>
            </div>
            <Link href={`/pipelines/${repair.pipelineId}/repair`} className="text-link">
              Review repair
            </Link>
          </div>
        ))}
        {monitorEvents.map((event) => (
          <div className="attention-item" key={event.id}>
            <span>!</span>
            <div>
              <strong>{event.title}</strong>
              <small>{event.previousValue} → {event.currentValue}</small>
            </div>
            <Link href={`/monitors/events/${event.id}`} className="text-link">
              Review change
            </Link>
          </div>
        ))}
      </div>
    </article>
  );
}
