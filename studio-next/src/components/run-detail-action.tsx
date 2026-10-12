'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/design-system';
import { can, useStudio, viewerTooltip } from '@/lib/data';

export function RunDetailAction({ status, href = '/datasets/competitor-prices', label = 'Review data' }: { status: 'running' | 'completed' | 'failed'; href?: string; label?: string }) {
  const auth = useStudio((snapshot) => snapshot.auth);
  const mayRun = can(auth.session, 'run');
  const [paused, setPaused] = useState(false);
  if (status === 'completed') return <Button variant="primary" asChild><Link href={href}>{label}</Link></Button>;
  if (status === 'failed') return <Button variant="primary" disabled={!mayRun} title={!mayRun ? viewerTooltip : undefined} asChild={mayRun}>{mayRun ? <Link href="/build?template=extract">Retry as new run</Link> : 'Retry as new run'}</Button>;
  return <Button variant="secondary" disabled={!mayRun} title={!mayRun ? viewerTooltip : undefined} onClick={() => setPaused((value) => !value)}>{paused ? 'Resume' : 'Pause'}</Button>;
}
