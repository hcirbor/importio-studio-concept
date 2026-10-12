'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/design-system';
import { can, useStudio, viewerTooltip } from '@/lib/data';

export function RunDetailAction({ status, runId, href = '/datasets/competitor-prices', label = 'Review data' }: { status: 'running' | 'completed' | 'failed'; runId?: string; href?: string; label?: string }) {
  const session = useStudio((snapshot) => snapshot.auth.session);
  const execution = useStudio((snapshot) => snapshot.execution);
  const mayRun = can(session, 'run');
  const [paused, setPaused] = useState(false);
  if (status === 'completed') return <Button variant="primary" asChild><Link href={href}>{label}</Link></Button>;
  if (status === 'failed') return <Button variant="primary" disabled={!mayRun} title={!mayRun ? viewerTooltip : undefined} asChild={mayRun}>{mayRun ? <Link href="/build?template=extract">Retry as new run</Link> : 'Retry as new run'}</Button>;
  return <Button variant="secondary" disabled={!mayRun} title={!mayRun ? viewerTooltip : undefined} onClick={() => { if (!paused && runId) void execution.cancelRun(runId); setPaused((value) => !value); }}>{paused ? 'Resume' : 'Pause'}</Button>;
}
