'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/design-system';
import { useReviewState } from './review-state';

const acceptedUnknownSummary = 'The Trailhead availability item was accepted as unknown.';

function PipelineFilter() {
  return (
    <Select defaultValue="all">
      <SelectTrigger aria-label="Filter review items by pipeline">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All pipelines</SelectItem>
        <SelectItem value="competitor">Competitor prices</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ReviewInbox() {
  const { hasReviewItem, acceptReviewItem, restoreReviewItem } = useReviewState();
  const [editing, setEditing] = useState(false);
  const [reviewedValue, setReviewedValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [decisionSummary, setDecisionSummary] = useState(acceptedUnknownSummary);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const isTextInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key.toLowerCase() !== 'a' || !hasReviewItem || isTextInput) return;

      event.preventDefault();
      setDecisionSummary(acceptedUnknownSummary);
      acceptReviewItem();
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [acceptReviewItem, hasReviewItem]);

  function beginEditing() {
    setFeedback('');
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setReviewedValue('');
  }

  function queueRetry() {
    setEditing(false);
    setReviewedValue('');
    setFeedback('Retry queued for trail-shop.example. The item will remain here until the retry finishes.');
  }

  function saveReviewedValue() {
    const value = reviewedValue.trim();
    if (!value) return;

    setEditing(false);
    setFeedback('');
    setDecisionSummary(`Trailhead availability was reviewed and saved as “${value}”.`);
    acceptReviewItem();
  }

  function acceptUnknown() {
    setEditing(false);
    setReviewedValue('');
    setFeedback('');
    setDecisionSummary(acceptedUnknownSummary);
    acceptReviewItem();
  }

  function restoreDemoReview() {
    setReviewedValue('');
    setFeedback('');
    restoreReviewItem();
  }

  if (!hasReviewItem) {
    return (
      <>
        <section className="panel review-toolbar">
          <label>PIPELINE<PipelineFilter /></label>
          <span>0 items need review</span>
        </section>
        <div className="panel empty-page">
          <div>
            <div className="empty-check">✓</div>
            <h2>Review queue clear</h2>
            <p className="muted">{decisionSummary} Restore the demo item to explore the other review actions.</p>
            <Button variant="secondary" onClick={restoreDemoReview}>Restore demo review</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <section className="panel review-toolbar">
        <label>PIPELINE<PipelineFilter /></label>
        <span>1 item needs review</span>
        <Button variant="secondary" onClick={acceptUnknown}>Bulk accept visible</Button>
      </section>
      <div className="review-layout">
        <section className="panel">
          <Button variant="ghost" className="review-item selected">
            <span className="review-index">1</span>
            <span>
              <strong>Trailhead availability is unknown</strong>
              <small className="muted">Competitor prices · unresolved field</small>
            </span>
            <Badge tone="warning">Needs review</Badge>
          </Button>
        </section>
        <aside className="panel">
          <div className="section-head">
            <div>
              <Badge tone="warning">Unresolved field</Badge>
              <h2 style={{ margin: '9px 0 0' }}>Trailhead availability is unknown</h2>
            </div>
          </div>
          <div className="review-detail">
            <p>The product page exposes a price but no supported availability statement. Keep the field unknown or enter a reviewed value.</p>
            <dl className="detail-list" style={{ marginTop: 18, border: '1px solid var(--io-color-border)', borderRadius: 8 }}>
              <div><dt>Pipeline</dt><dd><Link href="/pipelines/competitor-prices" className="text-link">Competitor prices · v4 →</Link></dd></div>
              <div><dt>Source</dt><dd><Link href="/runs/run_7f3a" className="text-link">trail-shop.example →</Link></dd></div>
              <div><dt>Evidence</dt><dd><Link href="/runs/run_7f3a" className="text-link">Price supported · availability absent →</Link></dd></div>
            </dl>
            {editing ? (
              <div className="review-value-entry">
                <label htmlFor="reviewed-value">Reviewed availability</label>
                <Input
                  id="reviewed-value"
                  autoFocus
                  value={reviewedValue}
                  onChange={(event) => setReviewedValue(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && saveReviewedValue()}
                  placeholder="e.g. In stock"
                />
                <Button variant="primary" disabled={!reviewedValue.trim()} onClick={saveReviewedValue}>
                  Save value
                </Button>
              </div>
            ) : null}
            {feedback ? <p className="review-feedback retry-feedback" role="status">{feedback}</p> : null}
            <div className="review-actions">
              {editing ? (
                <Button variant="secondary" onClick={cancelEditing}>Cancel edit</Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={beginEditing}>Enter value</Button>
                  <Button variant="secondary" onClick={feedback ? () => setFeedback('') : queueRetry}>
                    {feedback ? 'Cancel retry' : 'Retry'}
                  </Button>
                  <Button variant="primary" onClick={acceptUnknown}>Accept unknown</Button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
