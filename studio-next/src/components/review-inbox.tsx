'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { can, useStudio, viewerTooltip } from '@/lib/data';

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
  const auth = useStudio((snapshot) => snapshot.auth);
  const { hasReviewItem, reviewCount, pipelineVersion, acceptReviewItem, restoreReviewItem } = useStudio((snapshot) => snapshot.humanReview);
  const mayReview = can(auth.session, 'review');
  const [editing, setEditing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [reviewedValue, setReviewedValue] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [feedback, setFeedback] = useState('');
  const [decisionSummary, setDecisionSummary] = useState(acceptedUnknownSummary);

  const showUndoToast = useCallback((message: string, undo: () => void) => {
    toast(message, {
      duration: 8000,
      action: { label: 'Undo', onClick: undo },
    });
  }, []);

  const beginEditing = useCallback(() => {
    if (!mayReview) return;
    setFeedback('');
    setEditing(true);
    setReviewedValue('In stock');
    setReviewNote('');
  }, [mayReview]);

  function cancelEditing() {
    setEditing(false);
    setReviewedValue('');
    setReviewNote('');
  }

  const queueRetry = useCallback(() => {
    if (!mayReview) return;
    setEditing(false);
    setReviewedValue('');
    setReviewNote('');
    setFeedback('');
    setDecisionSummary('Trailhead availability was resolved by retrying the source.');
    auth.setDatasetReviewState('competitor-prices', 0);
    acceptReviewItem();
    showUndoToast('Retry completed', () => {
      auth.setDatasetReviewState('competitor-prices', 1);
      restoreReviewItem();
    });
  }, [acceptReviewItem, auth, mayReview, restoreReviewItem, showUndoToast]);

  function saveReviewedValue() {
    if (!mayReview) return;
    const value = reviewedValue.trim();
    const note = reviewNote.trim();
    if (!value || !note) return;

    setEditing(false);
    setFeedback('');
    setDecisionSummary(`Trailhead availability was reviewed and saved as “${value}”.`);
    auth.updateDatasetValue('competitor-prices', 'trail-shop', 'Availability', value, auth.currentUser?.name ?? 'Jordan Davis', note);
    auth.setDatasetReviewState('competitor-prices', 0);
    acceptReviewItem();
    showUndoToast('Value saved', () => {
      auth.updateDatasetValue('competitor-prices', 'trail-shop', 'Availability', 'Unknown');
      auth.setDatasetReviewState('competitor-prices', 1);
      restoreReviewItem();
    });
  }

  const acceptUnknown = useCallback(() => {
    if (!mayReview) return;
    setEditing(false);
    setReviewedValue('');
    setFeedback('');
    setDecisionSummary(acceptedUnknownSummary);
    auth.setDatasetReviewState('competitor-prices', 0);
    acceptReviewItem();
    showUndoToast('Unknown value accepted', () => {
      auth.setDatasetReviewState('competitor-prices', 1);
      restoreReviewItem();
    });
  }, [acceptReviewItem, auth, mayReview, restoreReviewItem, showUndoToast]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const isTextInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (isTextInput) return;
      const key = event.key.toLowerCase();
      if ((key === 'j' || key === 'k') && hasReviewItem) {
        event.preventDefault();
        setSelectedIndex(0);
        return;
      }
      if (!hasReviewItem) return;
      if (key === 'a') {
        event.preventDefault();
        acceptUnknown();
      } else if (key === 'e') {
        event.preventDefault();
        beginEditing();
      } else if (key === 'r') {
        event.preventDefault();
        queueRetry();
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [acceptUnknown, beginEditing, hasReviewItem, queueRetry]);

  function restoreDemoReview() {
    setReviewedValue('');
    setReviewNote('');
    setFeedback('');
    auth.updateDatasetValue('competitor-prices', 'trail-shop', 'Availability', 'Unknown');
    auth.setDatasetReviewState('competitor-prices', 1);
    restoreReviewItem();
  }

  if (!hasReviewItem) {
    return (
      <>
        <section className="panel review-toolbar">
          <label>PIPELINE<PipelineFilter /></label>
          <span>{reviewCount} items need review</span>
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
        <span>{reviewCount} item needs review</span>
        <Button variant="secondary" disabled={!mayReview} title={!mayReview ? viewerTooltip : undefined} onClick={acceptUnknown}>Bulk accept visible</Button>
        <small className="review-shortcuts">Keyboard shortcuts: J/K move · A accept · E enter value · R retry</small>
      </section>
      <div className="review-layout">
        <section className="panel">
          <Button variant="ghost" className={`review-item${selectedIndex === 0 ? ' selected' : ''}`}>
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
              <div><dt>Pipeline</dt><dd><Link href="/pipelines/competitor-prices" className="text-link">Competitor prices · v{pipelineVersion} →</Link></dd></div>
              <div><dt>Source</dt><dd><Link href="/runs/run_7f3a" className="text-link">trail-shop.example →</Link></dd></div>
              <div><dt>Evidence</dt><dd><Link href="/runs/run_7f3a?worker=trail-shop&step=2" className="text-link">Price supported · availability absent →</Link></dd></div>
            </dl>
            {editing ? (
              <div className="review-value-entry">
                <label htmlFor="reviewed-value">Reviewed availability</label>
                <Select value={reviewedValue} onValueChange={setReviewedValue}>
                  <SelectTrigger id="reviewed-value" autoFocus aria-label="Reviewed availability"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In stock">In stock</SelectItem>
                    <SelectItem value="Low stock">Low stock</SelectItem>
                    <SelectItem value="Out of stock">Out of stock</SelectItem>
                  </SelectContent>
                </Select>
                <label htmlFor="review-source-reason">Source or reason</label>
                <Input
                  id="review-source-reason"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && saveReviewedValue()}
                  placeholder="Required"
                  required
                />
                <Button variant="primary" disabled={!reviewedValue.trim() || !reviewNote.trim()} onClick={saveReviewedValue}>
                  Save reviewed value
                </Button>
              </div>
            ) : null}
            {feedback ? <p className="review-feedback retry-feedback" role="status">{feedback}</p> : null}
            <div className="review-actions">
              {editing ? (
                <Button variant="secondary" onClick={cancelEditing}>Cancel</Button>
              ) : (
                <>
                  <Button variant="secondary" disabled={!mayReview} title={!mayReview ? viewerTooltip : undefined} onClick={beginEditing}>Enter value</Button>
                  <Button variant="secondary" disabled={!mayReview} title={!mayReview ? viewerTooltip : undefined} onClick={feedback ? () => setFeedback('') : queueRetry}>
                    {feedback ? 'Cancel retry' : 'Retry'}
                  </Button>
                  <Button variant="primary" disabled={!mayReview} title={!mayReview ? viewerTooltip : undefined} onClick={acceptUnknown}>Accept unknown</Button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
