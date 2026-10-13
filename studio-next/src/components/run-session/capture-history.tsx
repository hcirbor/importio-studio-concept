'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/design-system';
import { StatusTag } from '@/components/status-tag';
import { useCapability, type RunPresentation as Scenario } from '@/lib/data';
import { ProductFrame } from './browser-frame';
import { stepDefinitions, workerSteps } from './presentation';

export function CaptureHistory({
  scenario,
  workerIndex,
  step,
  onCookieDecision,
}: {
  scenario: Scenario;
  workerIndex: number;
  step: number;
  onCookieDecision: (decision: string) => void;
}) {
  const [artefact, setArtefact] = useState('');
  const recording = useCapability('capture-recording');

  return (
    <Card className="capture-history">
      <CardHeader>
        <CardTitle>
          Capture history
        </CardTitle>
        <span className="mono-label">
          {stepDefinitions.length} retained captures
        </span>
      </CardHeader>
      <CardContent>
        <div className="capture-strip" role="region" aria-label="Capture history" tabIndex={0}>
          {workerSteps(scenario.workers[workerIndex]).map((capture, index) => (
            <div
              inert
              aria-hidden="true"
              className={index === step ? 'active' : ''}
              key={capture.title}
            >
              <ProductFrame
                worker={scenario.workers[workerIndex]}
                step={index}
                scenario={scenario}
                onCookieDecision={onCookieDecision}
              />
              <span>
                {capture.duration} · {capture.title}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter role="group" aria-label="Capture actions">
        <span className="capability-control">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setArtefact('Screenshot preview opened for this capture.')}
          >
            View screenshot
          </Button>
          <StatusTag capabilityId="capture-screenshot" />
        </span>
        <span className="capability-control">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setArtefact('HTML snapshot opened for this capture.')}
          >
            View HTML snapshot
          </Button>
          <StatusTag capabilityId="capture-html" />
        </span>
        <span className="capability-control">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setArtefact(
              recording.status === 'coming-soon'
                ? recording.note ?? 'Recording is coming soon.'
                : 'Recording preview opened for this run.',
            )}
          >
            Watch recording
          </Button>
          <StatusTag capabilityId="capture-recording" />
        </span>
      </CardFooter>
      {artefact ? (
        <span role="status" className="muted">
          {artefact}
        </span>
      ) : null}
    </Card>
  );
}
