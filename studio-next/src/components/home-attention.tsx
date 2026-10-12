'use client';

import Link from 'next/link';
import { Badge } from '@/components/design-system';
import { useStudio } from '@/lib/data';

export function HomeAttention() {
  const { hasReviewItem } = useStudio((snapshot) => snapshot.humanReview);
  return (
    <article className="panel attention-panel">
      <div className="section-head">
        <h2>Needs attention</h2>
        {hasReviewItem ? <Badge tone="warning">1 item</Badge> : <Badge tone="success">Clear</Badge>}
      </div>
      <div className="panel-body">
        {hasReviewItem ? (
          <div className="attention-item"><span>!</span><div><strong>Trailhead availability is unknown</strong><small>Competitor prices · unresolved field</small></div><Link href="/review" className="text-link">Review</Link></div>
        ) : (
          <div className="attention-empty"><span>✓</span><div><strong>Nothing needs attention</strong><small>The Review inbox is clear.</small></div><Link href="/review" className="text-link">Open review inbox</Link></div>
        )}
      </div>
    </article>
  );
}
