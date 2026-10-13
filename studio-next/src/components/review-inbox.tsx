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

function PipelineFilter({ names }: { names: string[] }) {
  return (
    <Select defaultValue="all">
      <SelectTrigger aria-label="Filter review items by pipeline">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All pipelines</SelectItem>
        {names.map((name) => (
          <SelectItem value={name} key={name}>{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ReviewInbox() {
  const state = useStudio((snapshot) => ({
    session: snapshot.auth.session,
    currentUser: snapshot.auth.currentUser,
    datasets: snapshot.auth.datasets,
    updateDatasetValue: snapshot.controlPlane.updateDatasetValue,
    setDatasetReviewState: snapshot.controlPlane.setDatasetReviewState,
    pipelineVersion: snapshot.humanReview.pipelineVersion,
    acceptReviewItem: snapshot.humanReview.acceptReviewItem,
    restoreReviewItem: snapshot.humanReview.restoreReviewItem,
  }));
  const reviewDataset = state.datasets.find((dataset) => dataset.review);
  const review = reviewDataset?.review;
  const reviewRecord = reviewDataset?.records?.find((record) => {
    const value = review ? record.values[review.field] : undefined;
    return value === null || value === 'Unknown';
  }) ?? reviewDataset?.records?.[0];
  const sourceEvidence = review && reviewRecord ? reviewRecord.evidence[review.field] : undefined;
  const sourceDomain = sourceEvidence ? new URL(sourceEvidence.sourceUrl).hostname : 'source.example';
  const itemTitle = review?.title ?? 'Field needs review';
  const hasReviewItem = review?.status === 'Open';
  const reviewCount = state.datasets.reduce((count, dataset) => count + (dataset.review?.issueCount ?? 0), 0);
  const mayReview = can(state.session, 'review');
  const [editing, setEditing] = useState(false);
  const [reviewedValue, setReviewedValue] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [decisionSummary, setDecisionSummary] = useState('The review item was accepted as unknown.');
  const showUndoToast = useCallback((message: string, undo: () => void) => {
    toast(message, {
      duration: 8000,
      action: { label: 'Undo', onClick: undo },
    });
  }, []);
  const beginEditing = useCallback(() => {
    if (!mayReview) return;
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
    if (!mayReview || !reviewDataset) return;
    setEditing(false);
    setReviewedValue('');
    setReviewNote('');
    setDecisionSummary(`${review?.field ?? 'Field'} was resolved by retrying the source.`);
    state.setDatasetReviewState(reviewDataset.id, 0);
    state.acceptReviewItem();
    showUndoToast('Retry completed', () => {
      state.setDatasetReviewState(reviewDataset.id, 1);
      state.restoreReviewItem();
    });
  }, [mayReview, review, reviewDataset, showUndoToast, state]);

  function saveReviewedValue() {
    if (!mayReview || !reviewDataset || !reviewRecord || !review) return;
    const value = reviewedValue.trim();
    const note = reviewNote.trim();
    if (!value || !note) return;
    const previousValue = reviewRecord.values[review.field] ?? 'Unknown';

    setEditing(false);
    setDecisionSummary(`${review.field} was reviewed and saved as “${value}”.`);
    state.updateDatasetValue(
      reviewDataset.id,
      reviewRecord.id,
      review.field,
      value,
      state.currentUser?.name ?? 'Jordan Davis',
      note,
    );
    state.setDatasetReviewState(reviewDataset.id, 0);
    state.acceptReviewItem();
    showUndoToast('Value saved', () => {
      state.updateDatasetValue(reviewDataset.id, reviewRecord.id, review.field, previousValue);
      state.setDatasetReviewState(reviewDataset.id, 1);
      state.restoreReviewItem();
    });
  }

  const acceptUnknown = useCallback(() => {
    if (!mayReview || !reviewDataset) return;
    setEditing(false);
    setReviewedValue('');
    setDecisionSummary(`${review?.field ?? 'Field'} was accepted as unknown.`);
    state.setDatasetReviewState(reviewDataset.id, 0);
    state.acceptReviewItem();
    showUndoToast('Unknown value accepted', () => {
      state.setDatasetReviewState(reviewDataset.id, 1);
      state.restoreReviewItem();
    });
  }, [mayReview, review, reviewDataset, showUndoToast, state]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const isTextInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (isTextInput) return;
      const key = event.key.toLowerCase();
      if ((key === 'j' || key === 'k') && hasReviewItem) {
        event.preventDefault();
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
    if (!reviewDataset) return;
    setReviewedValue('');
    setReviewNote('');
    state.setDatasetReviewState(reviewDataset.id, 1);
    state.restoreReviewItem();
  }

  if (!reviewDataset || !review || !reviewRecord) return null;

  if (!hasReviewItem) {
    return (
      <>
        <section className="panel review-toolbar">
          <label>
            PIPELINE
            <PipelineFilter names={state.datasets.filter((dataset) => dataset.review).map((dataset) => dataset.title)} />
          </label>
          <span>{reviewCount} items need review</span>
        </section>
        <div className="panel empty-page">
          <div>
            <div className="empty-check">✓</div>
            <h2>Review queue clear</h2>
            <p className="muted">{decisionSummary} Restore the demo item to explore the other review actions.</p>
            <Button variant="secondary" onClick={restoreDemoReview}>
              Restore demo review
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <section className="panel review-toolbar">
        <label>
          PIPELINE
          <PipelineFilter names={state.datasets.filter((dataset) => dataset.review).map((dataset) => dataset.title)} />
        </label>
        <span>{reviewCount} item needs review</span>
        <Button variant="secondary" disabled={!mayReview} title={!mayReview ? viewerTooltip : undefined} onClick={acceptUnknown}>
          Bulk accept visible
        </Button>
        <small className="review-shortcuts">Keyboard shortcuts: J/K move · A accept · E enter value · R retry</small>
      </section>
      <div className="review-layout">
        <section className="panel">
          <Button variant="ghost" className="review-item selected">
            <span className="review-index">1</span>
            <span>
              <strong>{itemTitle}</strong>
              <small className="muted">{reviewDataset.title} · unresolved field</small>
            </span>
            <Badge tone="warning">Needs review</Badge>
          </Button>
        </section>
        <aside className="panel">
          <div className="section-head">
            <div>
              <Badge tone="warning">Unresolved field</Badge>
              <h2 style={{ margin: '9px 0 0' }}>{itemTitle}</h2>
            </div>
          </div>
          <div className="review-detail">
            <p>{review.description}</p>
            <dl className="detail-list" style={{ marginTop: 18, border: '1px solid var(--io-color-border)', borderRadius: 8 }}>
              <div>
                <dt>Pipeline</dt>
                <dd>
                  <Link href={`/pipelines/${reviewDataset.id}`} className="text-link">
                    {reviewDataset.sourceWorkflow} · v{state.pipelineVersion} →
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>
                  <Link href={`${reviewDataset.sourceRunHref}?from=review`} className="text-link">
                    {sourceDomain} →
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>
                  <Link href={`${reviewDataset.sourceRunHref}?worker=${reviewRecord.id}&step=2&from=review`} className="text-link">
                    Price supported · {review.field.toLowerCase()} absent →
                  </Link>
                </dd>
              </div>
            </dl>
            {editing ? (
              <div className="review-value-entry">
                <label htmlFor="reviewed-value">Reviewed {review.field.toLowerCase()}</label>
                <Select value={reviewedValue} onValueChange={setReviewedValue}>
                  <SelectTrigger id="reviewed-value" autoFocus aria-label={`Reviewed ${review.field.toLowerCase()}`}>
                    <SelectValue />
                  </SelectTrigger>
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
            <div className="review-actions">
              {editing ? (
                <Button variant="secondary" onClick={cancelEditing}>Cancel</Button>
              ) : (
                <>
                  <Button variant="secondary" disabled={!mayReview} title={!mayReview ? viewerTooltip : undefined} onClick={beginEditing}>
                    Enter value
                  </Button>
                  <Button variant="secondary" disabled={!mayReview} title={!mayReview ? viewerTooltip : undefined} onClick={queueRetry}>
                    Retry
                  </Button>
                  <Button variant="primary" disabled={!mayReview} title={!mayReview ? viewerTooltip : undefined} onClick={acceptUnknown}>
                    Accept unknown
                  </Button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
