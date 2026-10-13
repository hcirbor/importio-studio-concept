'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/design-system';
import { can, useStudio, viewerTooltip } from '@/lib/data';
import { ActionBar } from './action-bar';

type ReviewDecisionControlsProps = {
  datasetId: string;
  mode: 'inbox' | 'action-bar';
  enterRequest?: number;
  includeRetry?: boolean;
};

export function ReviewDecisionControls({
  datasetId,
  mode,
  enterRequest = 0,
  includeRetry = false,
}: ReviewDecisionControlsProps) {
  const router = useRouter();
  const state = useStudio((snapshot) => ({
    session: snapshot.auth.session,
    currentUser: snapshot.auth.currentUser,
    dataset: snapshot.auth.datasets.find((item) => item.id === datasetId),
    updateDatasetValue: snapshot.controlPlane.updateDatasetValue,
    setDatasetReviewState: snapshot.controlPlane.setDatasetReviewState,
  }));
  const [editing, setEditing] = useState(enterRequest > 0);
  const [reviewedValue, setReviewedValue] = useState('In stock');
  const [reviewNote, setReviewNote] = useState('');
  const mayReview = can(state.session, 'review');
  const review = state.dataset?.review;
  const reviewRecord = state.dataset?.records?.find((record) => {
    const value = review ? record.values[review.field] : undefined;
    return value === null || value === 'Unknown';
  });

  const restore = useCallback(() => {
    state.setDatasetReviewState(datasetId, 1);
  }, [datasetId, state]);

  const resolve = useCallback((message: string) => {
    state.setDatasetReviewState(datasetId, 0);
    toast(message, {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: restore,
      },
    });
    router.push('/review');
  }, [datasetId, restore, router, state]);

  const acceptUnknown = useCallback(() => {
    if (!mayReview || !review) return;
    resolve('Unknown value accepted');
  }, [mayReview, resolve, review]);

  const retry = useCallback(() => {
    if (!mayReview || !review) return;
    resolve('Retry completed');
  }, [mayReview, resolve, review]);

  function saveReviewedValue() {
    if (!mayReview || !review || !reviewRecord) return;
    const value = reviewedValue.trim();
    const note = reviewNote.trim();
    if (!value || !note) return;
    const previousValue = reviewRecord.values[review.field] ?? 'Unknown';
    state.updateDatasetValue(
      datasetId,
      reviewRecord.id,
      review.field,
      value,
      state.currentUser?.name ?? 'Jordan Davis',
      note,
    );
    state.setDatasetReviewState(datasetId, 0);
    setEditing(false);
    toast('Value saved', {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: () => {
          state.updateDatasetValue(datasetId, reviewRecord.id, review.field, previousValue);
          restore();
        },
      },
    });
    router.push('/review');
  }

  if (!review || review.status !== 'Open') return null;

  const enterValue = (
    <Button
      variant="secondary"
      disabled={!mayReview}
      title={!mayReview ? viewerTooltip : undefined}
      onClick={() => setEditing(true)}
    >
      Enter value
    </Button>
  );

  return (
    <>
      {mode === 'action-bar' ? (
        <ActionBar
          status="1 value needs a decision"
          summary={review.itemDescription}
          secondary={(
            <>
              <Button variant="secondary" asChild>
                <Link href="/review">
                  Back to review
                </Link>
              </Button>
              {enterValue}
            </>
          )}
          primary={(
            <Button
              variant="primary"
              disabled={!mayReview}
              title={!mayReview ? viewerTooltip : undefined}
              onClick={acceptUnknown}
            >
              Accept unknown
            </Button>
          )}
        />
      ) : (
        <div className="review-actions">
          {enterValue}
          {includeRetry ? (
            <Button
              variant="secondary"
              disabled={!mayReview}
              title={!mayReview ? viewerTooltip : undefined}
              onClick={retry}
            >
              Retry
            </Button>
          ) : null}
          <Button
            variant="primary"
            disabled={!mayReview}
            title={!mayReview ? viewerTooltip : undefined}
            onClick={acceptUnknown}
          >
            Accept unknown
          </Button>
        </div>
      )}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Enter reviewed value
            </DialogTitle>
            <DialogDescription>
              Save a human-reviewed value and the source or reason for the decision.
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-form">
            <label htmlFor="reviewed-value">
              Reviewed {review.field.toLowerCase()}
              <Select value={reviewedValue} onValueChange={setReviewedValue}>
                <SelectTrigger id="reviewed-value" aria-label={`Reviewed ${review.field.toLowerCase()}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In stock">
                    In stock
                  </SelectItem>
                  <SelectItem value="Low stock">
                    Low stock
                  </SelectItem>
                  <SelectItem value="Out of stock">
                    Out of stock
                  </SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label htmlFor="review-source-reason">
              Source or reason
              <Input
                id="review-source-reason"
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && saveReviewedValue()}
                placeholder="Required"
                required
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!reviewedValue.trim() || !reviewNote.trim()}
              onClick={saveReviewedValue}
            >
              Save reviewed value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
