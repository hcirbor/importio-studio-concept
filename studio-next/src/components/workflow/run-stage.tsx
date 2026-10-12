'use client';

import type { ReactNode } from 'react';
import { Badge, Button, Eyebrow } from '@/components/design-system';
import { RunSession } from '../run-session';

export function RunStage({ stepper, isRunning, templateType, runId, onResolved, back, reviewData }: { stepper: ReactNode; isRunning: boolean; templateType: string; runId: string; onResolved: () => void; back: () => void; reviewData: () => void }) {
  return <>{stepper}<section className="workflow-stage"><header className="stage-head"><div><Eyebrow>Watch run</Eyebrow><h1>{isRunning ? `${templateType} is working through the approved sources.` : `${templateType} run complete.`}</h1><p>{isRunning ? 'Follow each worker, replay captured steps and resolve input when needed.' : 'Replay every captured step, then inspect the records and retained evidence.'}</p></div><Badge tone={isRunning ? 'info' : 'success'}>{isRunning ? 'Running' : 'Completed'}</Badge></header><RunSession runId={runId} onResearchResolved={onResolved} /><div className="stage-actions"><Button variant="secondary" onClick={back}>Review plan</Button><Button variant="primary" disabled={isRunning} onClick={reviewData}>Review data →</Button></div></section></>;
}
