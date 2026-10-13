import { MonitorEventDetail } from '@/components/monitor-event-detail';

export const metadata = { title: 'Monitor event' };

export function generateStaticParams() {
  return [{ id: 'trailhead-availability-change' }];
}

export default async function MonitorEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MonitorEventDetail eventId={id} />;
}
