'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/design-system';
import { pipelineVersionForRepair, useStudio } from '@/lib/data';
import { ReviewDecisionControls } from './review-decision-controls';

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
  const searchParams = useSearchParams();
  const state = useStudio((snapshot) => ({
    datasets: snapshot.auth.datasets,
    reviewItems: snapshot.humanReview.items,
    reviewCount: snapshot.humanReview.reviewCount,
    repairs: snapshot.pipelineRepairs,
    setDatasetReviewState: snapshot.controlPlane.setDatasetReviewState,
  }));
  const requestedDatasetId = searchParams.get('dataset');
  const reviewDataset = state.reviewItems.find((dataset) => dataset.id === requestedDatasetId)
    ?? state.reviewItems[0];
  const restoreDataset = state.datasets.find((dataset) => dataset.review);
  const review = reviewDataset?.review;
  const reviewRecord = reviewDataset?.records?.find((record) => {
    const value = review ? record.values[review.field] : undefined;
    return value === null || value === 'Unknown';
  }) ?? reviewDataset?.records?.[0];
  const sourceEvidence = review && reviewRecord ? reviewRecord.evidence[review.field] : undefined;
  const sourceDomain = sourceEvidence ? new URL(sourceEvidence.sourceUrl).hostname : 'source.example';
  const itemTitle = review?.title ?? 'Field needs review';
  const pipelineId = reviewDataset?.pipelineId;
  const repair = state.repairs.find((item) => item.pipelineId === pipelineId);
  const datasetVersion = Number(reviewDataset?.version.match(/V(\d+)/i)?.[1] ?? 1);
  const pipelineVersion = pipelineVersionForRepair(repair, datasetVersion);
  function restoreDemoReview() {
    if (!restoreDataset) return;
    state.setDatasetReviewState(restoreDataset.id, 1);
  }

  if (!reviewDataset || !review || !reviewRecord) {
    return (
      <>
        <section className="panel review-toolbar">
          <label>
            PIPELINE
            <PipelineFilter names={state.reviewItems.map((dataset) => dataset.title)} />
          </label>
          <span>0 items need review</span>
        </section>
        <div className="panel empty-page">
          <div>
            <div className="empty-check">✓</div>
            <h2>Review queue clear</h2>
            <p className="muted">The decision is complete. Restore the demo item to explore the other review actions.</p>
            {restoreDataset ? (
              <Button variant="secondary" onClick={restoreDemoReview}>
                Restore demo review
              </Button>
            ) : null}
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
          <PipelineFilter names={state.reviewItems.map((dataset) => dataset.title)} />
        </label>
        <span>
          {state.reviewCount} {state.reviewCount === 1 ? 'item needs' : 'items need'} review
        </span>
        <small className="review-shortcuts">Open the item to inspect evidence and make its decision.</small>
      </section>
      <div className="review-layout">
        <section className="panel">
          {state.reviewItems.map((dataset, index) => (
            <Button
              variant="ghost"
              className={`review-item${dataset.id === reviewDataset.id ? ' selected' : ''}`}
              asChild
              key={dataset.id}
            >
              <Link href={`/review?dataset=${dataset.id}`}>
                <span className="review-index">{index + 1}</span>
                <span>
                  <strong>{dataset.review?.title}</strong>
                  <small className="muted">{dataset.review?.itemDescription}</small>
                </span>
                <Badge tone="warning">Needs review</Badge>
              </Link>
            </Button>
          ))}
        </section>
        <aside className="panel">
          <div className="section-head">
            <div>
              <Badge tone="warning">Unresolved field</Badge>
              <h2 style={{ margin: '9px 0 0' }}>{itemTitle}</h2>
            </div>
          </div>
          <div className="review-detail">
            <p>{review.itemDescription}</p>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Evidence</CardTitle>
                  <CardDescription>{sourceDomain}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <blockquote>“{sourceEvidence?.quote}”</blockquote>
                <div className="evidence-capture-thumbnail product">
                  <div>
                    <i />
                    <i />
                    <i />
                  </div>
                  <strong>{review.captureLabel}</strong>
                  <small>{sourceEvidence?.quote}</small>
                </div>
              </CardContent>
            </Card>
            <p>
              <strong>Recommended:</strong> {review.recommendation}
            </p>
            <dl className="detail-list">
              <div>
                <dt>Pipeline</dt>
                <dd>
                  <Link href={`/pipelines/${pipelineId ?? reviewDataset.id}?from=review`} className="text-link">
                    {reviewDataset.sourceWorkflow} · v{pipelineVersion} →
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>
                  <Link href={`/datasets/${reviewDataset.id}?from=review`} className="text-link">
                    {reviewDataset.title} →
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
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${reviewDataset.sourceRunHref}?from=review`}>Open full run</Link>
            </Button>
            <ReviewDecisionControls
              datasetId={reviewDataset.id}
              includeRetry
            />
          </div>
        </aside>
      </div>
    </>
  );
}
