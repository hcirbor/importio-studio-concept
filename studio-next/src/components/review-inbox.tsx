'use client';

import { useEffect } from 'react';
import { Badge, Button } from '@/components/design-system';
import { useReviewState } from './review-state';

export function ReviewInbox() {
  const { hasReviewItem, acceptReviewItem, restoreReviewItem } = useReviewState();
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'a' && hasReviewItem && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        acceptReviewItem();
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [acceptReviewItem, hasReviewItem]);
  if (!hasReviewItem) return <div className="panel empty-page"><div><div className="empty-check">✓</div><h2>Review queue clear</h2><p className="muted">Nothing needs a human decision.</p><Button variant="secondary" onClick={restoreReviewItem}>Undo last decision</Button></div></div>;
  return <div className="review-layout"><section className="panel"><button className="review-item selected"><span className="review-index">1</span><span><strong>Trailhead availability is unknown</strong><small className="muted">Competitor prices · unresolved field</small></span><Badge tone="warning">Needs review</Badge></button></section><aside className="panel"><div className="section-head"><div><Badge tone="warning">Unresolved field</Badge><h2 style={{margin:'9px 0 0'}}>Trailhead availability is unknown</h2></div></div><div className="review-detail"><p>The product page exposes a price but no supported availability statement. Keep the field unknown or enter a reviewed value.</p><dl className="detail-list" style={{marginTop:18,border:'1px solid var(--io-color-border)',borderRadius:8}}><div><dt>Pipeline</dt><dd>Competitor prices · v4</dd></div><div><dt>Source</dt><dd>trail-shop.example</dd></div><div><dt>Evidence</dt><dd>Price supported · availability absent</dd></div></dl><div className="review-actions"><Button variant="secondary">Enter value</Button><Button variant="secondary">Retry</Button><Button variant="primary" onClick={acceptReviewItem}>Accept unknown</Button></div></div></aside></div>;
}
