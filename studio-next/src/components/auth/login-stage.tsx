'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './login-stage.module.css';

type DemoField = {
  key: string;
  value: string;
  target: string;
  evidence: string;
  unknown?: boolean;
};

type Demo = {
  url: string;
  name: string;
  source: string;
  kind: 'products' | 'pricing' | 'company';
  fields: DemoField[];
  summary: string;
};

type Highlight = { left: number; top: number; width: number; height: number };
type Flight = { id: number; text: string; fromX: number; fromY: number; toX: number; toY: number };
type FlightStyle = CSSProperties & Record<'--from-x' | '--from-y' | '--to-x' | '--to-y', string>;

const demoSequence = [0] as const;

const demos: Demo[] = [
  {
    url: 'trail-shop.example/tents',
    name: 'Trailhead 2P Tent',
    source: 'Trail Shop',
    kind: 'products',
    fields: [
      { key: 'product', value: '"Trailhead 2P Tent"', target: 'name', evidence: '✓ quote retained' },
      { key: 'price', value: '"€259"', target: 'price', evidence: '✓ quote retained' },
      { key: 'availability', value: 'null', target: 'stock', evidence: '○ not stated · unknown', unknown: true },
    ],
    summary: '2 of 3 supported · 1 left unknown, never invented',
  },
  {
    url: 'cloudharbor.example/pricing',
    name: 'CloudHarbor',
    source: 'Pricing page',
    kind: 'pricing',
    fields: [
      { key: 'starting_price', value: '"$18 / month"', target: 'price', evidence: '✓ quote retained' },
      { key: 'plan', value: '"Starter"', target: 'plan', evidence: '✓ quote retained' },
      { key: 'free_trial', value: '"14 days"', target: 'trial', evidence: '✓ quote retained' },
    ],
    summary: '3 of 3 supported',
  },
  {
    url: 'northwind.example/about',
    name: 'Northwind Trade',
    source: 'Company page',
    kind: 'company',
    fields: [
      { key: 'eu_presence', value: 'true', target: 'hq', evidence: '✓ quote retained' },
      { key: 'wholesale', value: 'true', target: 'wholesale', evidence: '✓ quote retained' },
      { key: 'contact_published', value: 'true', target: 'contact', evidence: '✓ quote retained' },
    ],
    summary: 'Qualified · 3 of 3 criteria supported',
  },
];

function DemoPage({ demo }: { demo: Demo }) {
  if (demo.kind === 'products') {
    return (
      <>
        <div className={styles.pageHeading}><strong>Trail Shop</strong><span>Outdoor equipment · Tents</span></div>
        <div className={styles.productGrid}>
          <article><i /><strong>Summit Solo Tent</strong><span>€179</span><small>In stock</small></article>
          <article><i /><strong><span data-target="name">Trailhead 2P Tent</span></strong><span data-target="price">€259</span><small><span data-target="stock">Ships in 5 days</span></small></article>
          <article><i /><strong>Basecamp 4 Tent</strong><span>€399</span><small>In stock</small></article>
        </div>
      </>
    );
  }

  if (demo.kind === 'pricing') {
    return (
      <>
        <div className={styles.pageHeading}><strong>CloudHarbor</strong><span>Pricing</span></div>
        <div className={styles.priceGrid}>
          <article><strong>Free</strong><span>$0</span><small>1 seat · core features</small></article>
          <article><strong><span data-target="plan">Starter</span></strong><span data-target="price">$18 / month</span><small>3 seats · core automation</small></article>
        </div>
        <p className={styles.note}><span data-target="trial">Try any paid plan free for 14 days.</span></p>
        <div className={styles.copyLines}><i /><i /></div>
      </>
    );
  }

  return (
    <>
      <div className={styles.pageHeading}><strong>Northwind Trade</strong><span>About</span></div>
      <div className={styles.companyRows}>
        <div><span>Head office</span><strong data-target="hq">Rotterdam, Netherlands</strong></div>
        <div><span>Customers</span><strong data-target="wholesale">Wholesale accounts only</strong></div>
        <div><span>Trade enquiries</span><strong data-target="contact">trade@northwind.example</strong></div>
      </div>
    </>
  );
}

export function LoginStage() {
  const stageRef = useRef<HTMLElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [visibleRows, setVisibleRows] = useState(0);
  const [showFooter, setShowFooter] = useState(false);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [scale, setScale] = useState(1);
  const [demoIndex, setDemoIndex] = useState<number>(demoSequence[0]);
  const demo = demos[demoIndex];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min((width - 48) / 1000, (height - 24) / 760, 1.35));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const art = artRef.current;
    if (!page || !art || !activeTarget) {
      setHighlight(null);
      return;
    }
    const target = page.querySelector<HTMLElement>(`[data-target="${activeTarget}"]`);
    if (!target) {
      setHighlight(null);
      return;
    }
    const pageRect = page.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const renderedScale = art.getBoundingClientRect().width / art.offsetWidth || 1;
    setHighlight({
      left: (targetRect.left - pageRect.left) / renderedScale - 10,
      top: (targetRect.top - pageRect.top) / renderedScale - 7,
      width: targetRect.width / renderedScale + 20,
      height: targetRect.height / renderedScale + 14,
    });
  }, [activeTarget, demoIndex, scale]);

  useEffect(() => {
    let cancelled = false;
    let flightId = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = (duration: number) => new Promise<void>((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : duration));
    const nextFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const measure = (element: HTMLElement) => {
      const art = artRef.current;
      if (!art) return null;
      const artRect = art.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const renderedScale = artRect.width / art.offsetWidth || 1;
      return { x: (rect.left - artRect.left) / renderedScale, y: (rect.top - artRect.top) / renderedScale };
    };

    async function play() {
      if (reducedMotion) {
        const finalDemoIndex = demoSequence[demoSequence.length - 1];
        setDemoIndex(finalDemoIndex);
        setVisibleRows(demos[finalDemoIndex].fields.length);
        setShowFooter(true);
        return;
      }

      for (let sequenceIndex = 0; sequenceIndex < demoSequence.length && !cancelled; sequenceIndex += 1) {
        const currentDemoIndex = demoSequence[sequenceIndex];
        const currentDemo = demos[currentDemoIndex];

        setDemoIndex(currentDemoIndex);
        setActiveTarget(null);
        setVisibleRows(0);
        setShowFooter(false);
        setFlight(null);
        await nextFrame();
        await wait(sequenceIndex === 0 ? 700 : 500);

        for (let fieldIndex = 0; fieldIndex < currentDemo.fields.length && !cancelled; fieldIndex += 1) {
          const field = currentDemo.fields[fieldIndex];
          setActiveTarget(field.target);
          await wait(500);

          if (!field.unknown) {
            await nextFrame();
            const target = pageRef.current?.querySelector<HTMLElement>(`[data-target="${field.target}"]`);
            const destination = artRef.current?.querySelector<HTMLElement>(`[data-row-value="${fieldIndex}"]`);
            if (target && destination) {
              const from = measure(target);
              const to = measure(destination);
              if (from && to) {
                setFlight({ id: flightId += 1, text: target.textContent ?? field.value, fromX: from.x - 10, fromY: from.y - 6, toX: to.x - 10, toY: to.y - 6 });
                await wait(900);
                setFlight(null);
              }
            }
          }

          setVisibleRows(fieldIndex + 1);
          await wait(500);
        }

        if (cancelled) return;
        setActiveTarget(null);
        setShowFooter(true);

        if (sequenceIndex < demoSequence.length - 1) {
          await wait(1900);
        }
      }
    }

    void play();
    return () => { cancelled = true; };
  }, []);

  const flightStyle: FlightStyle | undefined = flight ? {
    '--from-x': `${flight.fromX}px`,
    '--from-y': `${flight.fromY}px`,
    '--to-x': `${flight.toX}px`,
    '--to-y': `${flight.toY}px`,
  } : undefined;

  return (
    <section className={styles.stage} ref={stageRef} aria-labelledby="login-stage-title">
      <div className={styles.art} ref={artRef} style={{ '--stage-scale': scale } as CSSProperties}>
        <header className={styles.claim}>
          <h2 id="login-stage-title">From web pages to answers you can trust.</h2>
          <p>Every value in Studio keeps the quote and the capture it came from.</p>
        </header>

        <article className={styles.page} ref={pageRef} aria-hidden="true">
          <div className={styles.chrome}><i /><i /><i /><span>{demo.url}</span></div>
          <div className={styles.pageBody}><DemoPage demo={demo} /></div>
          <div className={`${styles.highlight} ${highlight ? styles.on : ''}`} style={highlight ?? undefined} />
        </article>

        <article className={styles.record} aria-hidden="true">
          <header><span>Record <strong>{demo.name}</strong></span><em>{demo.source}</em></header>
          <div className={styles.recordRows}>
            {demo.fields.map((field, index) => (
              <div className={`${styles.recordRow} ${index < visibleRows ? styles.on : ''}`} key={field.key}>
                <code>{field.key}</code>
                <span data-row-value={index}>{field.value}</span>
                <small className={field.unknown ? styles.unknown : undefined}>{field.evidence}</small>
              </div>
            ))}
          </div>
          <footer className={showFooter ? styles.on : ''}><strong>Evidence retained</strong> · {demo.summary}</footer>
        </article>

        {flight ? <div className={styles.flight} key={flight.id} style={flightStyle}>{flight.text}</div> : null}
      </div>
    </section>
  );
}
