'use client';

import type { RunPresentation as Scenario } from '@/lib/data';
import { ProductFrame } from './browser-frame';
import { stepDefinitions, workerSteps } from './presentation';

export function CaptureHistory({ scenario, workerIndex, step, onCookieDecision }: { scenario: Scenario; workerIndex: number; step: number; onCookieDecision: (decision: string) => void }) {
  return <section className="panel capture-history"><div className="section-head compact-section-head"><h2>Capture history</h2><span className="mono-label">{stepDefinitions.length} retained captures</span></div><div className="capture-strip" role="region" aria-label="Capture history" tabIndex={0}>{workerSteps(scenario.workers[workerIndex]).map((capture, index) => <div inert aria-hidden="true" className={index === step ? 'active' : ''} key={capture.title}><ProductFrame worker={scenario.workers[workerIndex]} step={index} scenario={scenario} onCookieDecision={onCookieDecision} /><span>{capture.duration} · {capture.title}</span></div>)}</div></section>;
}
