'use client';

import { useState } from 'react';
import { Badge, Button } from '@/components/design-system';
import { StatusTag } from '@/components/status-tag';
import { useCapability, type RunPresentation as Scenario, type RunWorker as Worker } from '@/lib/data';
import { ReplayControls } from './replay-controls';

export function ProductFrame({ worker, step, scenario, onCookieDecision }: { worker: Worker; step: number; scenario: Scenario; onCookieDecision?: (decision: string) => void }) {
  const takeControlCapability = useCapability('take-control');
  const inputDecisionsCapability = useCapability('input-decisions');
  const [decision, setDecision] = useState('');
  const [takeControlNoteOpen, setTakeControlNoteOpen] = useState(false);
  const [inputDecisionNoteOpen, setInputDecisionNoteOpen] = useState(false);

  function chooseInputDecision(value: string) {
    if (value === 'Necessary cookies accepted' && inputDecisionsCapability.status === 'coming-soon') {
      setInputDecisionNoteOpen(true);
      return;
    }
    if (onCookieDecision) onCookieDecision(value);
    else setDecision(value);
  }

  function takeControl() {
    if (takeControlCapability.status === 'coming-soon') {
      setTakeControlNoteOpen(true);
      return;
    }
    setDecision('Control handed to you');
  }

  if (worker.state === 'Failed') return <div className="browser-frame cookie-frame failed-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>{worker.domain}</span></div><section>{decision ? <><Badge tone="info">Recovery requested</Badge><h3>{decision}</h3><p>The failed checkpoint and retained evidence remain attached to this run.</p><Button variant="secondary" onClick={() => setDecision('')}>Back to stop reason</Button></> : <><Badge tone="danger">Failed</Badge><h3>Access challenge blocked the final source</h3><p>The worker stopped safely after two supported sources. No availability value was invented.</p><div><Button variant="primary" onClick={() => setDecision('Retry queued from the retained checkpoint')}>Retry</Button><Button variant="secondary" onClick={() => setDecision('Handed to Import.io experts')}>Hand to Import.io experts</Button></div></>}</section></div>;
  if (worker.state === 'Needs input') return <div className="browser-frame cookie-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>Pricing</span></div><section>{decision ? <><Badge tone="success">Decision recorded</Badge><h3>{decision}</h3><p>The worker can continue from this retained checkpoint.</p><Button variant="secondary" onClick={() => setDecision('')}>Change decision</Button></> : <><Badge tone="warning">Needs input</Badge><h3>Choose your cookie preferences</h3><p>The worker stopped before choosing optional cookies.</p><div className="decision-actions"><span className="capability-control"><Button variant="primary" onClick={() => chooseInputDecision('Necessary cookies accepted')}>Accept necessary only</Button><StatusTag capabilityId="input-decisions" open={inputDecisionNoteOpen} onOpenChange={setInputDecisionNoteOpen} /></span><Button variant="secondary" onClick={() => chooseInputDecision('Domain skipped')}>Skip domain</Button><span className="capability-control"><Button variant="secondary" onClick={takeControl}>Take control</Button><StatusTag capabilityId="take-control" open={takeControlNoteOpen} onOpenChange={setTakeControlNoteOpen} /></span></div></>}</section></div>;
  if (scenario.kind === 'research') {
    if (step === 0) return <div className="browser-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>Platform&nbsp;&nbsp; Customers&nbsp;&nbsp; Resources</span></div><div className="pricing-cards capture-landing-cards"><article><i /><strong>Product</strong><span>What teams can automate</span></article><article><i /><strong>Customers</strong><span>Stories and outcomes</span></article><article><i /><strong>Pricing</strong><span>Plans for every team</span></article></div></div>;
    if (step === 1) return <div className="browser-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>Pricing overview</span></div><div className="pricing-cards capture-navigation-cards"><article><i /><strong>Free</strong><span>Explore core features</span></article><article className="observed"><label>Opened pricing</label><i /><strong>Starter</strong><span>For growing teams</span></article><article><i /><strong>Business</strong><span>Advanced controls</span></article></div></div>;
    return <div className="browser-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>Products&nbsp;&nbsp; Solutions&nbsp;&nbsp; Pricing</span></div><div className="pricing-cards"><article><i /><strong>Free</strong><span>$0</span></article><article className={step === 2 ? 'observed' : ''}><label>{step === 2 ? 'Reading plan card' : 'Pricing plan'}</label><i /><strong>Starter</strong><span>{worker.price}{worker.planDetails ? ` · ${worker.planDetails}` : ''}</span></article><article><i /><strong>Business</strong><span>Contact sales</span></article></div></div>;
  }
  if (scenario.kind === 'discover') return <div className="browser-frame"><div className="mock-site-head"><strong>Worthington supplier directory</strong><span>Outdoor equipment · Europe</span></div><div className="product-cards"><article><i /><strong>Northwind Trade</strong><span>Rotterdam · Wholesale</span></article><article className={step === 2 ? 'observed' : ''}><label>{step === 2 ? 'Checking qualification' : 'Supplier detail'}</label><i /><strong>Summit Supply Europe</strong><span>Lyon · Minimum €500</span></article><article><i /><strong>Alpine Trade</strong><span>Innsbruck · Distributor</span></article></div></div>;
  if (step === 0) return <div className="browser-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>Outdoor equipment</span></div><div className="product-cards capture-landing-cards"><article><i /><strong>Tents</strong><span>3-season shelters</span></article><article><i /><strong>Packs</strong><span>Day and expedition</span></article><article><i /><strong>Equipment</strong><span>Camp essentials</span></article></div></div>;
  if (step === 1) return <div className="browser-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>Search · Trailhead</span></div><div className="product-cards capture-navigation-cards"><article><i /><strong>Summit Solo Tent</strong><span>1 person</span></article><article className="observed"><label>Matched request</label><i /><strong>Trailhead 2P Tent</strong><span>2 person · 3 season</span></article><article><i /><strong>Basecamp 4 Tent</strong><span>4 person</span></article></div></div>;
  return <div className="browser-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>{scenario.kind === 'collect' ? 'Tents · page 2 of 2' : 'Outdoor equipment · Tents'}</span></div><div className="product-cards"><article><i /><strong>Summit Solo Tent</strong><span>€179</span></article><article className={step === 2 ? 'observed' : ''}><label>{step === 2 ? 'Reading product card' : 'Product card'}</label><i /><strong>Trailhead 2P Tent</strong><span>{worker.price} · {worker.availability}</span></article><article><i /><strong>Basecamp 4 Tent</strong><span>€399</span></article></div></div>;
}

export function BrowserPanel({ worker, step, scenario, playing, onPlaying, onStep, onCookieDecision }: { worker: Worker; step: number; scenario: Scenario; playing: boolean; onPlaying: (value: boolean) => void; onStep: (value: number) => void; onCookieDecision?: (decision: string) => void }) {
  function resetReplay() { onPlaying(false); onStep(0); }
  return <section className="panel run-browser"><div className="section-head compact-section-head"><h2>{scenario.completed ? 'Browser' : 'Live browser'} · {worker.name} worker</h2><span className="mono-label">{worker.domain}</span></div><div className="browser-toolbar"><span className="browser-dots">○ ○ ○</span>{scenario.completed ? <Badge tone="info">Replay</Badge> : <><Badge tone="info">Live</Badge><Button variant="ghost" size="sm" className="button-reset" onClick={resetReplay}>Replay</Button></>}<code>https://{worker.domain}{scenario.kind === 'research' ? '/pricing' : ''}</code></div><ProductFrame key={worker.domain} worker={worker} step={step} scenario={scenario} onCookieDecision={onCookieDecision} /><ReplayControls worker={worker} step={step} playing={playing} onPlaying={onPlaying} onStep={onStep} /></section>;
}
