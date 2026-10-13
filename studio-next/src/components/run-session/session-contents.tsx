'use client';

import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/design-system';
import type { RunPresentation as Scenario } from '@/lib/data';
import { BrowserPanel } from './browser-frame';
import { statusTone, workerStatusLabel } from './presentation';
import { Timeline } from './timeline';

type SessionContentsProps = {
  scenario: Scenario;
  workerIndex: number;
  setWorkerIndex: (value: number) => void;
  step: number;
  setStep: (value: number) => void;
  playing: boolean;
  setPlaying: (value: boolean) => void;
  onCookieDecision?: (decision: string) => void;
  expanded?: boolean;
  expandAction?: ReactNode;
  showNeedsInputNotice?: boolean;
  review?: {
    description: string;
    href: string;
  };
};

export function SessionContents({
  scenario,
  workerIndex,
  setWorkerIndex,
  step,
  setStep,
  playing,
  setPlaying,
  onCookieDecision,
  expanded = false,
  expandAction,
  showNeedsInputNotice = true,
  review,
}: SessionContentsProps) {
  const worker = scenario.workers[workerIndex];
  const waiting = scenario.workers.filter((item) => item.state === 'Needs input');

  function selectWorker(index: number) {
    setWorkerIndex(index);
    setStep(0);
    setPlaying(false);
  }

  return (
    <>
      {showNeedsInputNotice && waiting.length ? (
        <Card role="status">
          <CardHeader>
            <div>
              <CardTitle>{waiting.length} source needs input</CardTitle>
              <CardDescription>
                {waiting.map((item) => item.name).join(', ')} is waiting while other workers continue.
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectWorker(scenario.workers.indexOf(waiting[0]))}
            >
              Resolve input
            </Button>
          </CardHeader>
        </Card>
      ) : null}
      <div className="worker-tabs">
        {scenario.workers.map((item, index) => (
          <Button
            variant="secondary"
            size="sm"
            className={index === workerIndex ? 'active' : undefined}
            onClick={() => selectWorker(index)}
            key={item.domain}
          >
            {item.name} · {workerStatusLabel(item).toLowerCase()}
          </Button>
        ))}
        {expandAction}
      </div>
      <div className={expanded ? 'expanded-session-grid' : 'run-session-grid'}>
        <aside className="panel timeline-panel">
          <div className="section-head compact-section-head">
            <h2>Worker timeline</h2>
            <Badge tone={worker.availability === 'Unresolved' ? 'warning' : statusTone(worker.state)}>
              {workerStatusLabel(worker)}
            </Badge>
          </div>
          <Timeline
            worker={worker}
            step={step}
            onStep={setStep}
            review={worker.availability === 'Unresolved' ? review : undefined}
          />
          {worker.state === 'Needs input' ? (
            <div className="inline-intervention">
              <strong>Decision required</strong>
              <p>Choose the safest next step for this source.</p>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Open decision in browser
              </Button>
            </div>
          ) : null}
        </aside>
        <BrowserPanel
          worker={worker}
          step={step}
          scenario={scenario}
          playing={playing}
          onPlaying={setPlaying}
          onStep={setStep}
          onCookieDecision={onCookieDecision}
        />
      </div>
    </>
  );
}
