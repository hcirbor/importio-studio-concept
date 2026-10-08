'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Expand, Pause, Play, X } from 'lucide-react';
import { Badge, Button } from '@/components/design-system';

type Worker = { name: string; domain: string; state: 'Running' | 'Complete' | 'Needs input'; price?: string; availability?: string };
type Scenario = { title: string; kind: 'compare' | 'research' | 'collect' | 'discover' | 'extract' | 'monitor'; completed: boolean; workers: Worker[] };

const scenarios: Record<string, Scenario> = {
  run_7f3a: { title: 'Competitor prices', kind: 'compare', completed: true, workers: [
    { name: 'Northwind Outdoors', domain: 'northwind-outdoors.example', state: 'Complete', price: '€249', availability: 'In stock' },
    { name: 'Summit Supply', domain: 'summit-supply.example', state: 'Complete', price: '€239', availability: 'Low stock' },
    { name: 'Trail Shop', domain: 'trail-shop.example', state: 'Complete', price: '€259', availability: 'Unresolved' },
  ] },
  run_batch_91af: { title: 'SaaS pricing research', kind: 'research', completed: false, workers: [
    { name: 'HubSpot', domain: 'hubspot.com', state: 'Running', price: '$20 / month' },
    { name: 'Mailchimp', domain: 'mailchimp.com', state: 'Complete', price: '$13 / month' },
    { name: 'Brevo', domain: 'brevo.com', state: 'Needs input', price: 'Cookie choice' },
  ] },
  run_collect: { title: 'Northwind tent catalogue', kind: 'collect', completed: true, workers: [{ name: 'Northwind catalogue', domain: 'northwind-outdoors.example', state: 'Complete', price: '3 products', availability: '2 pages' }] },
  run_discover: { title: 'Qualified supplier discovery', kind: 'discover', completed: true, workers: [{ name: 'Worthington directory', domain: 'worthington-directory.example', state: 'Complete', price: '3 qualified', availability: '74 candidates' }] },
  run_extract: { title: 'Trailhead product extraction', kind: 'extract', completed: true, workers: [{ name: 'Northwind Outdoors', domain: 'northwind-outdoors.example', state: 'Complete', price: '€249', availability: 'In stock' }] },
  run_monitor: { title: 'Trailhead baseline', kind: 'monitor', completed: true, workers: [{ name: 'Northwind Outdoors', domain: 'northwind-outdoors.example', state: 'Complete', price: '€249', availability: 'Baseline saved' }] },
};

const steps = [
  ['Opened approved source', 'Final URL and capture retained.', '4.2s'],
  ['Inspected navigation', 'Observed links and requested language.', '9.3s'],
  ['Read the requested card', 'Captured the supported fields and evidence.', '14.4s'],
];

function ProductFrame({ worker, step, scenario }: { worker: Worker; step: number; scenario: Scenario }) {
  const [decision, setDecision] = useState('');
  if (worker.state === 'Needs input') return <div className="browser-frame cookie-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>Pricing</span></div><section>{decision ? <><Badge tone="success">Decision recorded</Badge><h3>{decision}</h3><p>The worker can continue from this retained checkpoint.</p><Button variant="secondary" onClick={() => setDecision('')}>Change decision</Button></> : <><Badge tone="warning">Needs input</Badge><h3>Choose your cookie preferences</h3><p>The worker stopped before choosing optional cookies.</p><div><Button variant="secondary" onClick={() => setDecision('Necessary cookies accepted')}>Accept necessary only</Button><Button variant="secondary" onClick={() => setDecision('Domain skipped')}>Skip domain</Button><Button variant="primary" onClick={() => setDecision('Control handed to you')}>Take control</Button></div></>}</section></div>;
  if (scenario.kind === 'research') return <div className="browser-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>Products&nbsp;&nbsp; Solutions&nbsp;&nbsp; Pricing</span></div><div className="pricing-cards"><article><i/><strong>Free</strong><span>$0</span></article><article className={step === 2 ? 'observed' : ''}><label>{step === 2 ? 'Reading plan card' : 'Pricing plan'}</label><i/><strong>Starter</strong><span>{worker.price}</span></article><article><i/><strong>Business</strong><span>Contact sales</span></article></div></div>;
  if (scenario.kind === 'discover') return <div className="browser-frame"><div className="mock-site-head"><strong>Worthington supplier directory</strong><span>Outdoor equipment · Europe</span></div><div className="product-cards"><article><i/><strong>Northwind Trade</strong><span>Rotterdam · Wholesale</span></article><article className={step === 2 ? 'observed' : ''}><label>{step === 2 ? 'Checking qualification' : 'Supplier detail'}</label><i/><strong>Summit Supply Europe</strong><span>Lyon · Minimum €500</span></article><article><i/><strong>Alpine Trade</strong><span>Innsbruck · Distributor</span></article></div></div>;
  return <div className="browser-frame"><div className="mock-site-head"><strong>{worker.name}</strong><span>{scenario.kind === 'collect' ? 'Tents · page 2 of 2' : 'Outdoor equipment · Tents'}</span></div><div className="product-cards"><article><i/><strong>Summit Solo Tent</strong><span>€179</span></article><article className={step === 2 ? 'observed' : ''}><label>{step === 2 ? 'Reading product card' : 'Product card'}</label><i/><strong>Trailhead 2P Tent</strong><span>{worker.price} · {worker.availability}</span></article><article><i/><strong>Basecamp 4 Tent</strong><span>€399</span></article></div></div>;
}

function Timeline({ step, onStep }: { step: number; onStep: (value: number) => void }) {
  return <ol className="session-timeline">{steps.map(([title, detail, duration], index) => <li className={index === step ? 'current' : index < step ? 'done' : ''} key={title}><Button variant="ghost" onClick={() => onStep(index)}><span>{index < step ? '✓' : index === step ? '•' : index + 1}</span><div><strong>{title}</strong><small>{detail}</small><em>{duration} <Camera size={12}/> capture</em></div></Button></li>)}</ol>;
}

function BrowserPanel({ worker, step, scenario, playing, onPlaying, onStep }: { worker: Worker; step: number; scenario: Scenario; playing: boolean; onPlaying: (value: boolean) => void; onStep: (value: number) => void }) {
  return <section className="panel run-browser"><div className="section-head compact-section-head"><h2>{scenario.completed ? 'Browser' : 'Live browser'} · {worker.name} worker</h2><span className="mono-label">{worker.domain}</span></div><div className="browser-toolbar"><span className="browser-dots">○ ○ ○</span>{scenario.completed ? <Badge tone="info">Replay</Badge> : <><Badge tone="info">Live</Badge><Button variant="ghost" size="sm" className="button-reset" onClick={() => { onPlaying(false); onStep(0); }}>Replay</Button></>}<code>https://{worker.domain}</code></div><ProductFrame worker={worker} step={step} scenario={scenario}/><div className="replay-controls"><Button variant="secondary" size="icon" className="icon-play" onClick={() => onPlaying(!playing)} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? <Pause size={15}/> : <Play size={15}/>}</Button><span>00:{String((step + 1) * 4).padStart(2,'0')}</span><input type="range" min="0" max={steps.length - 1} value={step} onChange={(event) => onStep(Number(event.target.value))} aria-label="Replay step"/><span>00:14</span></div></section>;
}

function SessionContents({ scenario, workerIndex, setWorkerIndex, step, setStep, playing, setPlaying, expanded = false }: { scenario: Scenario; workerIndex: number; setWorkerIndex: (value: number) => void; step: number; setStep: (value: number) => void; playing: boolean; setPlaying: (value: boolean) => void; expanded?: boolean }) {
  const worker = scenario.workers[workerIndex];
  return <><div className="worker-tabs">{scenario.workers.map((item,index) => <Button variant="secondary" size="sm" className={index === workerIndex ? 'active' : ''} onClick={() => { setWorkerIndex(index); setStep(0); }} key={item.domain}>{item.name} · {item.state.toLowerCase()}</Button>)}</div><div className={expanded ? 'expanded-session-grid' : 'run-session-grid'}><aside className="panel timeline-panel"><div className="section-head compact-section-head"><h2>Worker timeline</h2><Badge tone={worker.state === 'Needs input' ? 'warning' : worker.state === 'Running' ? 'info' : 'success'}>{worker.state}</Badge></div><Timeline step={step} onStep={setStep}/>{worker.state === 'Needs input' ? <div className="inline-intervention"><strong>Decision required</strong><p>Choose the safest next step for this source.</p><Button variant="secondary" onClick={() => setStep(2)}>Open decision in browser</Button></div> : null}</aside><BrowserPanel worker={worker} step={step} scenario={scenario} playing={playing} onPlaying={setPlaying} onStep={setStep}/></div></>;
}

export function RunSession({ runId }: { runId: string }) {
  const scenario = scenarios[runId] ?? scenarios.run_7f3a;
  const [workerIndex, setWorkerIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeExpanded = () => {
    setExpanded(false);
    requestAnimationFrame(() => expandButton.current?.focus());
  };
  useEffect(() => {
    function keys(event: KeyboardEvent) {
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
      if (event.key === 'ArrowRight') setStep((value) => Math.min(steps.length - 1, value + 1));
      if (event.key === ' ') { event.preventDefault(); setPlaying((value) => !value); }
    }
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [expanded]);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [expanded]);
  const captures = useMemo(() => steps.map((item,index) => ({ label: item[0], index })), []);
  return <><div className="session-actions"><Button ref={expandButton} variant="secondary" className="session-expand-button" type="button" onClick={() => setExpanded(true)}><Expand size={15}/> Expand</Button></div>{expanded ? <div className="expanded-run-overlay" role="presentation"><section className="expanded-run-dialog" role="dialog" aria-modal="true" aria-labelledby="expanded-run-title"><header className="expanded-run-header"><div><span className="mono-label">Expanded run</span><h2 id="expanded-run-title">{scenario.title}</h2><p>{scenario.completed ? 'Completed run replay and retained evidence.' : 'Live multi-worker session.'}</p></div><Button ref={closeButton} variant="secondary" size="icon" type="button" className="expanded-run-close" aria-label="Close expanded run" onClick={closeExpanded}><X size={18}/></Button></header><SessionContents scenario={scenario} workerIndex={workerIndex} setWorkerIndex={setWorkerIndex} step={step} setStep={setStep} playing={playing} setPlaying={setPlaying} expanded/></section></div> : null}<SessionContents scenario={scenario} workerIndex={workerIndex} setWorkerIndex={setWorkerIndex} step={step} setStep={setStep} playing={playing} setPlaying={setPlaying}/><section className="panel capture-history"><div className="section-head compact-section-head"><h2>Capture history</h2><span className="mono-label">{captures.length} retained captures</span></div><div className="capture-strip">{captures.map((capture) => <div role="button" tabIndex={0} aria-label={`Jump to ${capture.label}`} className={capture.index === step ? 'active' : ''} onClick={() => setStep(capture.index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setStep(capture.index); } }} key={capture.label}><ProductFrame worker={scenario.workers[workerIndex]} step={capture.index} scenario={scenario}/><span>00:{String((capture.index + 1) * 4).padStart(2,'0')} · {capture.label}</span></div>)}</div></section></>;
}
