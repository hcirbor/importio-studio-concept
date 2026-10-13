'use client';

import { useEffect, useRef, useState } from 'react';
import { Expand, X } from 'lucide-react';
import { Button } from '@/components/design-system';
import { useStudio, type RunPresentation as Scenario } from '@/lib/data';
import { CaptureHistory } from './run-session/capture-history';
import { pendingScenario } from './run-session/presentation';
import { SessionContents } from './run-session/session-contents';
import { useRunReplay } from './run-session/use-run-replay';

export function RunSession({ runId, onResearchResolved, onResearchStateChange }: { runId: string; onResearchResolved?: () => void; onResearchStateChange?: (state: 'Running' | 'Complete') => void }) {
  const execution = useStudio((snapshot) => snapshot.execution);
  const researchCallbacks = useRef({ onResearchResolved, onResearchStateChange });
  const [scenario, setScenario] = useState<Scenario>(pendingScenario);
  const { workerIndex, setWorkerIndex, step, setStep, playing, setPlaying, expanded, setExpanded, expandButton, closeButton, closeExpanded } = useRunReplay(scenario);

  useEffect(() => { researchCallbacks.current = { onResearchResolved, onResearchStateChange }; }, [onResearchResolved, onResearchStateChange]);
  useEffect(() => execution.subscribeRunEvents(runId, (event) => { setScenario(event.presentation); if (event.decisionState) researchCallbacks.current.onResearchStateChange?.(event.decisionState); if (event.decisionState === 'Complete') researchCallbacks.current.onResearchResolved?.(); }), [execution, runId]);
  function recordCookieDecision() { setStep(2); setPlaying(false); void execution.resolveRunDecision(runId); }

  return <><div className="session-actions"><Button ref={expandButton} variant="secondary" className="session-expand-button" type="button" onClick={() => setExpanded(true)}><Expand size={15} /> Expand</Button></div>{expanded ? <div className="expanded-run-overlay" role="presentation"><section className="expanded-run-dialog" role="dialog" aria-modal="true" aria-labelledby="expanded-run-title"><header className="expanded-run-header"><div><span className="mono-label">Expanded run</span><h2 id="expanded-run-title">{scenario.title}</h2><p>{scenario.completed ? 'Completed run replay and retained evidence.' : 'Live multi-worker session.'}</p></div><Button ref={closeButton} variant="secondary" size="icon" type="button" className="expanded-run-close" aria-label="Close expanded run" onClick={closeExpanded}><X size={18} /></Button></header><SessionContents scenario={scenario} workerIndex={workerIndex} setWorkerIndex={setWorkerIndex} step={step} setStep={setStep} playing={playing} setPlaying={setPlaying} onCookieDecision={recordCookieDecision} expanded /></section></div> : null}<SessionContents scenario={scenario} workerIndex={workerIndex} setWorkerIndex={setWorkerIndex} step={step} setStep={setStep} playing={playing} setPlaying={setPlaying} onCookieDecision={recordCookieDecision} /><CaptureHistory scenario={scenario} workerIndex={workerIndex} step={step} onCookieDecision={recordCookieDecision} /></>;
}
