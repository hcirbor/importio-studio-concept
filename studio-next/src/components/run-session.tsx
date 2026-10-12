'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Expand, Pause, Play, X } from 'lucide-react';
import { Badge, Button } from '@/components/design-system';
import { useStudio, type RunPresentation as Scenario, type RunWorker as Worker, type RunWorkerState as WorkerState } from '@/lib/data';

type SessionContentsProps = {
  scenario: Scenario;
  workerIndex: number;
  setWorkerIndex: (value: number) => void;
  step: number;
  setStep: (value: number) => void;
  playing: boolean;
  setPlaying: (value: boolean) => void;
  expanded?: boolean;
};

const pendingScenario: Scenario = { title: '', kind: 'research', completed: false, workers: [{ name: '', domain: '', state: 'Running' }] };

const stepDefinitions = [
  { title: 'Opened approved source', detail: 'Final URL and capture retained.' },
  { title: 'Inspected navigation', detail: 'Observed links and requested language.' },
  { title: 'Read the requested card', detail: 'Captured the supported fields and evidence.' },
];

function workerSteps(worker: Worker) {
  const offset = [...worker.domain].reduce((total, character) => total + character.charCodeAt(0), 0) % 8;
  const timings = [3.6, 8.4, 13.1].map((base, index) => `${(base + offset * 0.37 + index * 0.16).toFixed(1)}s`);
  return stepDefinitions.map((item, index) => ({ ...item, duration: timings[index] }));
}

function workerStatusLabel(worker: Worker) {
  if (worker.availability === 'Unresolved') return '1 to review';
  return worker.state;
}

function statusTone(state: WorkerState) {
  if (state === 'Failed') return 'danger';
  if (state === 'Needs input') return 'warning';
  if (state === 'Running') return 'info';
  return 'success';
}

function ProductFrame({
  worker,
  step,
  scenario,
  onCookieDecision,
}: {
  worker: Worker;
  step: number;
  scenario: Scenario;
  onCookieDecision?: (decision: string) => void;
}) {
  const [decision, setDecision] = useState('');

  if (worker.state === 'Failed') {
    return (
      <div className="browser-frame cookie-frame failed-frame">
        <div className="mock-site-head"><strong>{worker.name}</strong><span>{worker.domain}</span></div>
        <section>
          {decision ? (
            <>
              <Badge tone="info">Recovery requested</Badge>
              <h3>{decision}</h3>
              <p>The failed checkpoint and retained evidence remain attached to this run.</p>
              <Button variant="secondary" onClick={() => setDecision('')}>Back to stop reason</Button>
            </>
          ) : (
            <>
              <Badge tone="danger">Failed</Badge>
              <h3>Access challenge blocked the final source</h3>
              <p>The worker stopped safely after two supported sources. No availability value was invented.</p>
              <div>
                <Button variant="primary" onClick={() => setDecision('Retry queued from the retained checkpoint')}>Retry</Button>
                <Button variant="secondary" onClick={() => setDecision('Handed to Import.io experts')}>Hand to Import.io experts</Button>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  if (worker.state === 'Needs input') {
    return (
      <div className="browser-frame cookie-frame">
        <div className="mock-site-head"><strong>{worker.name}</strong><span>Pricing</span></div>
        <section>
          {decision ? (
            <>
              <Badge tone="success">Decision recorded</Badge>
              <h3>{decision}</h3>
              <p>The worker can continue from this retained checkpoint.</p>
              <Button variant="secondary" onClick={() => setDecision('')}>Change decision</Button>
            </>
          ) : (
            <>
              <Badge tone="warning">Needs input</Badge>
              <h3>Choose your cookie preferences</h3>
              <p>The worker stopped before choosing optional cookies.</p>
              <div>
                <Button variant="primary" onClick={() => onCookieDecision?.('Necessary cookies accepted')}>Accept necessary only</Button>
                <Button variant="secondary" onClick={() => setDecision('Domain skipped')}>Skip domain</Button>
                <Button variant="secondary" onClick={() => setDecision('Control handed to you')}>Take control</Button>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  if (scenario.kind === 'research') {
    if (step === 0) {
      return (
        <div className="browser-frame">
          <div className="mock-site-head"><strong>{worker.name}</strong><span>Platform&nbsp;&nbsp; Customers&nbsp;&nbsp; Resources</span></div>
          <div className="pricing-cards capture-landing-cards">
            <article><i /><strong>Product</strong><span>What teams can automate</span></article>
            <article><i /><strong>Customers</strong><span>Stories and outcomes</span></article>
            <article><i /><strong>Pricing</strong><span>Plans for every team</span></article>
          </div>
        </div>
      );
    }
    if (step === 1) {
      return (
        <div className="browser-frame">
          <div className="mock-site-head"><strong>{worker.name}</strong><span>Pricing overview</span></div>
          <div className="pricing-cards capture-navigation-cards">
            <article><i /><strong>Free</strong><span>Explore core features</span></article>
            <article className="observed"><label>Opened pricing</label><i /><strong>Starter</strong><span>For growing teams</span></article>
            <article><i /><strong>Business</strong><span>Advanced controls</span></article>
          </div>
        </div>
      );
    }
    return (
      <div className="browser-frame">
        <div className="mock-site-head"><strong>{worker.name}</strong><span>Products&nbsp;&nbsp; Solutions&nbsp;&nbsp; Pricing</span></div>
        <div className="pricing-cards">
          <article><i /><strong>Free</strong><span>$0</span></article>
          <article className={step === 2 ? 'observed' : ''}>
            <label>{step === 2 ? 'Reading plan card' : 'Pricing plan'}</label>
            <i /><strong>Starter</strong><span>{worker.price}{worker.planDetails ? ` · ${worker.planDetails}` : ''}</span>
          </article>
          <article><i /><strong>Business</strong><span>Contact sales</span></article>
        </div>
      </div>
    );
  }

  if (scenario.kind === 'discover') {
    return (
      <div className="browser-frame">
        <div className="mock-site-head"><strong>Worthington supplier directory</strong><span>Outdoor equipment · Europe</span></div>
        <div className="product-cards">
          <article><i /><strong>Northwind Trade</strong><span>Rotterdam · Wholesale</span></article>
          <article className={step === 2 ? 'observed' : ''}>
            <label>{step === 2 ? 'Checking qualification' : 'Supplier detail'}</label>
            <i /><strong>Summit Supply Europe</strong><span>Lyon · Minimum €500</span>
          </article>
          <article><i /><strong>Alpine Trade</strong><span>Innsbruck · Distributor</span></article>
        </div>
      </div>
    );
  }

  if (step === 0) {
    return (
      <div className="browser-frame">
        <div className="mock-site-head"><strong>{worker.name}</strong><span>Outdoor equipment</span></div>
        <div className="product-cards capture-landing-cards">
          <article><i /><strong>Tents</strong><span>3-season shelters</span></article>
          <article><i /><strong>Packs</strong><span>Day and expedition</span></article>
          <article><i /><strong>Equipment</strong><span>Camp essentials</span></article>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="browser-frame">
        <div className="mock-site-head"><strong>{worker.name}</strong><span>Search · Trailhead</span></div>
        <div className="product-cards capture-navigation-cards">
          <article><i /><strong>Summit Solo Tent</strong><span>1 person</span></article>
          <article className="observed"><label>Matched request</label><i /><strong>Trailhead 2P Tent</strong><span>2 person · 3 season</span></article>
          <article><i /><strong>Basecamp 4 Tent</strong><span>4 person</span></article>
        </div>
      </div>
    );
  }

  return (
    <div className="browser-frame">
      <div className="mock-site-head">
        <strong>{worker.name}</strong>
        <span>{scenario.kind === 'collect' ? 'Tents · page 2 of 2' : 'Outdoor equipment · Tents'}</span>
      </div>
      <div className="product-cards">
        <article><i /><strong>Summit Solo Tent</strong><span>€179</span></article>
        <article className={step === 2 ? 'observed' : ''}>
          <label>{step === 2 ? 'Reading product card' : 'Product card'}</label>
          <i /><strong>Trailhead 2P Tent</strong><span>{worker.price} · {worker.availability}</span>
        </article>
        <article><i /><strong>Basecamp 4 Tent</strong><span>€399</span></article>
      </div>
    </div>
  );
}

function Timeline({ worker, step, onStep }: { worker: Worker; step: number; onStep: (value: number) => void }) {
  const items = workerSteps(worker);
  const pendingTitles = ['Open approved source', 'Inspect navigation', 'Read the requested card'];
  const completedCount = worker.state === 'Complete'
    ? items.length
    : worker.state === 'Needs input'
      ? 1
      : worker.state === 'Running'
        ? Math.min(step, items.length)
        : 0;
  return (
    <ol className="session-timeline">
      {items.map((item, index) => {
        const completed = index < completedCount;
        return (
          <li className={completed ? 'done' : 'pending'} key={item.title}>
            <Button variant="ghost" onClick={() => onStep(index)}>
              <span>{completed ? '✓' : index + 1}</span>
              <div>
                <strong>{completed ? item.title : pendingTitles[index]}</strong>
                <small>{completed ? item.detail : index === completedCount && worker.state === 'Needs input' ? 'Waiting for input.' : 'Waiting'}</small>
                <em>{completed ? <>{item.duration} <Camera size={12} /> capture</> : '—'}</em>
              </div>
            </Button>
          </li>
        );
      })}
    </ol>
  );
}

function BrowserPanel({
  worker,
  step,
  scenario,
  playing,
  onPlaying,
  onStep,
  onCookieDecision,
}: {
  worker: Worker;
  step: number;
  scenario: Scenario;
  playing: boolean;
  onPlaying: (value: boolean) => void;
  onStep: (value: number) => void;
  onCookieDecision?: (decision: string) => void;
}) {
  function resetReplay() {
    onPlaying(false);
    onStep(0);
  }

  return (
    <section className="panel run-browser">
      <div className="section-head compact-section-head">
        <h2>{scenario.completed ? 'Browser' : 'Live browser'} · {worker.name} worker</h2>
        <span className="mono-label">{worker.domain}</span>
      </div>
      <div className="browser-toolbar">
        <span className="browser-dots">○ ○ ○</span>
        {scenario.completed ? (
          <Badge tone="info">Replay</Badge>
        ) : (
          <>
            <Badge tone="info">Live</Badge>
            <Button variant="ghost" size="sm" className="button-reset" onClick={resetReplay}>Replay</Button>
          </>
        )}
        <code>https://{worker.domain}{scenario.kind === 'research' ? '/pricing' : ''}</code>
      </div>
      <ProductFrame key={worker.domain} worker={worker} step={step} scenario={scenario} onCookieDecision={onCookieDecision} />
      <div className="replay-controls">
        <Button
          variant="secondary"
          size="icon"
          className="icon-play"
          onClick={() => onPlaying(!playing)}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </Button>
        <span>{workerSteps(worker)[step].duration}</span>
        <input
          type="range"
          min="0"
          max={stepDefinitions.length - 1}
          value={step}
          onChange={(event) => onStep(Number(event.target.value))}
          aria-label="Replay step"
        />
        <span>{workerSteps(worker).at(-1)?.duration}</span>
      </div>
    </section>
  );
}

function SessionContents({
  scenario,
  workerIndex,
  setWorkerIndex,
  step,
  setStep,
  playing,
  setPlaying,
  onCookieDecision,
  expanded = false,
}: SessionContentsProps & { onCookieDecision?: (decision: string) => void }) {
  const worker = scenario.workers[workerIndex];

  function selectWorker(index: number) {
    setWorkerIndex(index);
    setStep(0);
    setPlaying(false);
  }

  return (
    <>
      <div className="worker-tabs">
        {scenario.workers.map((item, index) => (
          <Button
            variant="secondary"
            size="sm"
            className={index === workerIndex ? 'active' : ''}
            onClick={() => selectWorker(index)}
            key={item.domain}
          >
            {item.name} · {workerStatusLabel(item).toLowerCase()}
          </Button>
        ))}
      </div>
      <div className={expanded ? 'expanded-session-grid' : 'run-session-grid'}>
        <aside className="panel timeline-panel">
          <div className="section-head compact-section-head">
            <h2>Worker timeline</h2>
            <Badge tone={worker.availability === 'Unresolved' ? 'warning' : statusTone(worker.state)}>{workerStatusLabel(worker)}</Badge>
          </div>
          <Timeline worker={worker} step={step} onStep={setStep} />
          {worker.state === 'Needs input' ? (
            <div className="inline-intervention">
              <strong>Decision required</strong>
              <p>Choose the safest next step for this source.</p>
              <Button variant="secondary" onClick={() => setStep(1)}>Open decision in browser</Button>
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

export function RunSession({
  runId,
  onResearchResolved,
  onResearchStateChange,
}: {
  runId: string;
  onResearchResolved?: () => void;
  onResearchStateChange?: (state: 'Running' | 'Complete') => void;
}) {
  const execution = useStudio((snapshot) => snapshot.execution);
  const researchCallbacks = useRef({ onResearchResolved, onResearchStateChange });
  const [scenario, setScenario] = useState<Scenario>(pendingScenario);
  const [workerIndex, setWorkerIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    researchCallbacks.current = { onResearchResolved, onResearchStateChange };
  }, [onResearchResolved, onResearchStateChange]);

  useEffect(() => execution.subscribeRunEvents(runId, (event) => {
    setScenario(event.presentation);
    if (event.decisionState) researchCallbacks.current.onResearchStateChange?.(event.decisionState);
    if (event.decisionState === 'Complete') researchCallbacks.current.onResearchResolved?.();
  }), [execution, runId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedWorker = params.get('worker');
      const requestedStep = Number(params.get('step'));
      if (requestedWorker) {
        const index = scenario.workers.findIndex((worker) => worker.domain.startsWith(requestedWorker));
        if (index >= 0) setWorkerIndex(index);
      }
      if (Number.isFinite(requestedStep)) setStep(Math.min(2, Math.max(0, requestedStep)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scenario.workers]);

  function recordCookieDecision() {
    setStep(2);
    setPlaying(false);
    void execution.resolveRunDecision(runId);
  }

  const closeExpanded = useCallback(() => {
    setExpanded(false);
    requestAnimationFrame(() => expandButton.current?.focus());
  }, []);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= stepDefinitions.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 900);

    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape' && expanded) {
        event.preventDefault();
        closeExpanded();
        return;
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setExpanded((value) => {
          const next = !value;
          if (!next) requestAnimationFrame(() => expandButton.current?.focus());
          return next;
        });
        return;
      }
      if (event.key === 'ArrowLeft') setStep((value) => Math.max(0, value - 1));
      if (event.key === 'ArrowRight') setStep((value) => Math.min(stepDefinitions.length - 1, value + 1));
      if (event.key === ' ') {
        event.preventDefault();
        setPlaying((value) => !value);
      }
    }

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [closeExpanded, expanded]);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  return (
    <>
      <div className="session-actions">
        <Button
          ref={expandButton}
          variant="secondary"
          className="session-expand-button"
          type="button"
          onClick={() => setExpanded(true)}
        >
          <Expand size={15} /> Expand
        </Button>
      </div>
      {expanded ? (
        <div className="expanded-run-overlay" role="presentation">
          <section className="expanded-run-dialog" role="dialog" aria-modal="true" aria-labelledby="expanded-run-title">
            <header className="expanded-run-header">
              <div>
                <span className="mono-label">Expanded run</span>
                <h2 id="expanded-run-title">{scenario.title}</h2>
                <p>{scenario.completed ? 'Completed run replay and retained evidence.' : 'Live multi-worker session.'}</p>
              </div>
              <Button
                ref={closeButton}
                variant="secondary"
                size="icon"
                type="button"
                className="expanded-run-close"
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
      />
      <section className="panel capture-history">
        <div className="section-head compact-section-head">
          <h2>Capture history</h2>
          <span className="mono-label">{stepDefinitions.length} retained captures</span>
        </div>
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
                onCookieDecision={recordCookieDecision}
              />
              <span>{capture.duration} · {capture.title}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
