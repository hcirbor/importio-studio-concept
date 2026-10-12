'use client';

import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/design-system';
import type { RunWorker as Worker } from '@/lib/data';
import { stepDefinitions, workerSteps } from './presentation';

export function ReplayControls({ worker, step, playing, onPlaying, onStep }: { worker: Worker; step: number; playing: boolean; onPlaying: (value: boolean) => void; onStep: (value: number) => void }) {
  return <div className="replay-controls"><Button variant="secondary" size="icon" className="icon-play" onClick={() => onPlaying(!playing)} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? <Pause size={15} /> : <Play size={15} />}</Button><span>{workerSteps(worker)[step].duration}</span><input type="range" min="0" max={stepDefinitions.length - 1} value={step} onChange={(event) => onStep(Number(event.target.value))} aria-label="Replay step" /><span>{workerSteps(worker).at(-1)?.duration}</span></div>;
}
