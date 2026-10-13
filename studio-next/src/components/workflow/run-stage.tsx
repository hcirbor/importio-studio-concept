'use client';

import type { ReactNode } from 'react';
import { Badge, Button, Eyebrow } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { ActionBar } from '../action-bar';
import { RunSession } from '../run-session';

export function RunStage({ stepper, isRunning, templateType, runId, onResolved, back, reviewData }: { stepper: ReactNode; isRunning: boolean; templateType: string; runId: string; onResolved: () => void; back: () => void; reviewData: () => void }) {
  const execution = useStudio((snapshot) => snapshot.execution);
  return (
    <>
      {stepper}
      <section className="workflow-stage">
        <header className="stage-head">
          <div>
            <Eyebrow>Watch run</Eyebrow>
            <h1>
              {isRunning
                ? `${templateType} is working through the approved sources.`
                : `${templateType} run complete.`}
            </h1>
            <p>
              {isRunning
                ? 'Follow each worker, replay captured steps and resolve input when needed.'
                : 'Replay every captured step, then inspect the records and retained evidence.'}
            </p>
          </div>
          <Badge tone={isRunning ? 'info' : 'success'}>
            {isRunning ? 'Running' : 'Completed'}
          </Badge>
        </header>
        <RunSession
          runId={runId}
          onResearchResolved={onResolved}
          showNeedsInputNotice={false}
        />
        <ActionBar
          status={isRunning ? '1 source needs input · BrightSend' : 'Run complete'}
          summary={isRunning
            ? 'The other workers can continue while this source waits.'
            : 'The supported records and retained evidence are ready to review.'}
          secondary={(
            <Button variant="secondary" onClick={back}>
              Review plan
            </Button>
          )}
          primary={isRunning ? (
            <Button variant="primary" onClick={() => void execution.resolveRunDecision(runId)}>
              Resolve input
            </Button>
          ) : (
            <Button variant="primary" onClick={reviewData}>
              Review data →
            </Button>
          )}
        />
      </section>
    </>
  );
}
