'use client';

import { Camera } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/design-system';
import type { RunWorker as Worker } from '@/lib/data';
import { workerSteps } from './presentation';

export function Timeline({
  worker,
  step,
  onStep,
  review,
}: {
  worker: Worker;
  step: number;
  onStep: (value: number) => void;
  review?: {
    description: string;
    href: string;
  };
}) {
  const items = workerSteps(worker);
  const pendingTitles = ['Open approved source', 'Inspect navigation', 'Read the requested card'];
  const completedCount = worker.state === 'Complete' ? items.length : worker.state === 'Needs input' ? 1 : worker.state === 'Running' ? Math.min(step, items.length) : 0;
  return (
    <ol className="session-timeline">
      {items.map((item, index) => {
        const completed = index < completedCount;
        const reviewStep = completed && index === items.length - 1 && review;
        return (
          <li className={reviewStep ? 'review' : completed ? 'done' : 'pending'} key={item.title}>
            <Button variant="ghost" onClick={() => onStep(index)}>
              <span>{reviewStep ? '!' : completed ? '✓' : index + 1}</span>
              <div>
                <strong>{completed ? item.title : pendingTitles[index]}</strong>
                <small>
                  {reviewStep
                    ? review.description
                    : completed
                      ? item.detail
                      : index === completedCount && worker.state === 'Needs input'
                        ? 'Waiting for input.'
                        : 'Waiting'}
                </small>
                <em>
                  {completed ? (
                    <>
                      {item.duration}
                      {' '}
                      <Camera size={12} />
                      {' '}
                      capture
                    </>
                  ) : '—'}
                </em>
              </div>
            </Button>
            {reviewStep ? (
              <Link href={review.href} className="text-link">
                Open review →
              </Link>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
