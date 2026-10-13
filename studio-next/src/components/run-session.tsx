'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Expand, X } from 'lucide-react';
import { Button } from '@/components/design-system';
import { useStudio, type RunPresentation as Scenario } from '@/lib/data';
import { CaptureHistory } from './run-session/capture-history';
import { pendingScenario } from './run-session/presentation';
import { SessionContents } from './run-session/session-contents';
import { useRunReplay } from './run-session/use-run-replay';

type RunSessionProps = {
  runId: string;
  review?: {
    description: string;
    href: string;
  };
  onResearchResolved?: () => void;
  onResearchStateChange?: (state: 'Running' | 'Complete') => void;
  showNeedsInputNotice?: boolean;
  showExpandAction?: boolean;
};

export type RunSessionHandle = {
  openExpanded: () => void;
};

export const RunSession = forwardRef<RunSessionHandle, RunSessionProps>(function RunSession({
  runId,
  review,
  onResearchResolved,
  onResearchStateChange,
  showNeedsInputNotice = true,
  showExpandAction = true,
}, ref) {
  const execution = useStudio((snapshot) => snapshot.execution);
  const hasReview = Boolean(review);
  const researchCallbacks = useRef({ onResearchResolved, onResearchStateChange });
  const [scenario, setScenario] = useState<Scenario>(pendingScenario);
  const {
    workerIndex,
    setWorkerIndex,
    step,
    setStep,
    playing,
    setPlaying,
    expanded,
    setExpanded,
    expandButton,
    closeButton,
    closeExpanded,
  } = useRunReplay(scenario);

  useImperativeHandle(ref, () => ({
    openExpanded: () => setExpanded(true),
  }), [setExpanded]);

  useEffect(() => {
    researchCallbacks.current = { onResearchResolved, onResearchStateChange };
  }, [onResearchResolved, onResearchStateChange]);

  useEffect(() => execution.subscribeRunEvents(runId, (event) => {
    setScenario(event.presentation);
    if (hasReview) {
      const reviewWorkerIndex = event.presentation.workers.findIndex((worker) => worker.availability === 'Unresolved');
      if (reviewWorkerIndex >= 0) setWorkerIndex(reviewWorkerIndex);
    }
    if (event.decisionState) researchCallbacks.current.onResearchStateChange?.(event.decisionState);
    if (event.decisionState === 'Complete') researchCallbacks.current.onResearchResolved?.();
  }), [execution, hasReview, runId, setWorkerIndex]);

  function recordCookieDecision() {
    setStep(2);
    setPlaying(false);
    void execution.resolveRunDecision(runId);
  }

  const expandAction = (
    <Button
      ref={expandButton}
      variant="secondary"
      size="sm"
      type="button"
      onClick={() => setExpanded(true)}
    >
      <Expand size={16} />
      Expand
    </Button>
  );

  return (
    <>
      {expanded ? (
        <div className="expanded-run-overlay" role="presentation">
          <section
            className="expanded-run-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-run-title"
          >
            <header className="expanded-run-header">
              <div>
                <span className="mono-label">Expanded run</span>
                <h2 id="expanded-run-title">{scenario.title}</h2>
                <p>
                  {scenario.completed
                    ? 'Completed run replay and retained evidence.'
                    : 'Live multi-worker session.'}
                </p>
              </div>
              <Button
                ref={closeButton}
                variant="secondary"
                size="icon"
                type="button"
                aria-label="Close expanded run"
                onClick={closeExpanded}
              >
                <X size={18} />
              </Button>
            </header>
            <SessionContents
              scenario={scenario}
              workerIndex={workerIndex}
              setWorkerIndex={setWorkerIndex}
              step={step}
              setStep={setStep}
              playing={playing}
              setPlaying={setPlaying}
              onCookieDecision={recordCookieDecision}
              expanded
              showNeedsInputNotice={false}
              review={review}
            />
          </section>
        </div>
      ) : null}
      <SessionContents
        scenario={scenario}
        workerIndex={workerIndex}
        setWorkerIndex={setWorkerIndex}
        step={step}
        setStep={setStep}
        playing={playing}
        setPlaying={setPlaying}
        onCookieDecision={recordCookieDecision}
        expandAction={showExpandAction ? expandAction : undefined}
        showNeedsInputNotice={showNeedsInputNotice}
        review={review}
      />
      <CaptureHistory
        scenario={scenario}
        workerIndex={workerIndex}
        step={step}
        onCookieDecision={recordCookieDecision}
      />
    </>
  );
});
