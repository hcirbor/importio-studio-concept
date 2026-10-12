'use client';

import Link from 'next/link';
import { Badge } from '@/components/design-system';
import { useStudio } from '@/lib/data';

export function HomeRecentPipelines() {
  const pipelines = useStudio((snapshot) => snapshot.recentPipelines);
  return (
    <article className="panel"><div className="section-head"><h2>Recent pipelines</h2><Link href="/pipelines" className="text-link">View all</Link></div><table className="data-table"><thead><tr><th>Pipeline</th><th>Status</th><th>Records</th></tr></thead><tbody>{pipelines.map((pipeline) => <tr key={pipeline.name}><td><Link href={pipeline.href}>{pipeline.name}</Link></td><td><Badge tone={pipeline.tone}>{pipeline.status}</Badge></td><td>{pipeline.records}</td></tr>)}</tbody></table></article>
  );
}
