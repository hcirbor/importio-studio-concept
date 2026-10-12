'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunPresentation as Scenario } from '@/lib/data';
import { stepDefinitions } from './presentation';

export function useRunReplay(scenario: Scenario) {
  const [workerIndex, setWorkerIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeExpanded = useCallback(() => { setExpanded(false); requestAnimationFrame(() => expandButton.current?.focus()); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedWorker = params.get('worker');
      const requestedStep = Number(params.get('step'));
      if (requestedWorker) { const index = scenario.workers.findIndex((worker) => worker.domain.startsWith(requestedWorker)); if (index >= 0) setWorkerIndex(index); }
      if (Number.isFinite(requestedStep)) setStep(Math.min(2, Math.max(0, requestedStep)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scenario.workers]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep((current) => { if (current >= stepDefinitions.length - 1) { setPlaying(false); return current; } return current + 1; }), 900);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape' && expanded) { event.preventDefault(); closeExpanded(); return; }
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); setExpanded((value) => { const next = !value; if (!next) requestAnimationFrame(() => expandButton.current?.focus()); return next; }); return; }
      if (event.key === 'ArrowLeft') setStep((value) => Math.max(0, value - 1));
      if (event.key === 'ArrowRight') setStep((value) => Math.min(stepDefinitions.length - 1, value + 1));
      if (event.key === ' ') { event.preventDefault(); setPlaying((value) => !value); }
    }
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [closeExpanded, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; closeButton.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [expanded]);

  return { workerIndex, setWorkerIndex, step, setStep, playing, setPlaying, expanded, setExpanded, expandButton, closeButton, closeExpanded };
}
