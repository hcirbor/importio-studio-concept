'use client';

import Link from 'next/link';
import { Badge } from '@/components/design-system';
import { useStudio } from '@/lib/data';

export function HomeAttention() {
  const hasReviewItem = useStudio((snapshot) => snapshot.humanReview.hasReviewItem);
  return (
    <article className="panel attention-panel">
      <div className="section-head">
        <h2>Needs attention</h2>
        <Badge tone="warning">{hasReviewItem ? '2 items' : '1 item'}</Badge>
      </div>
      <div className="panel-body">
        {hasReviewItem ? <div className="attention-item"><span>!</span><div><strong>Trailhead availability is unknown</strong><small>Competitor prices · unresolved field</small></div><Link href="/review" className="text-link">Review</Link></div> : null}
        <div className="attention-item"><span>!</span><div><strong>Outdoor catalogue needs repair</strong><small>Product cards changed · repair ready to review</small></div><Link href="/pipelines/competitor-prices#repair" className="text-link">Review repair</Link></div>
      </div>
    </article>
  );
}
