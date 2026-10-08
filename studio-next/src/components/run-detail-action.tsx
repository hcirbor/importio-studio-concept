'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/design-system';

export function RunDetailAction({ status, href = '/datasets/competitor-prices', label = 'Review data' }: { status: 'running' | 'completed' | 'failed'; href?: string; label?: string }) {
  const [paused, setPaused] = useState(false);
  if (status === 'completed') return <Button variant="primary" asChild><Link href={href}>{label}</Link></Button>;
  if (status === 'failed') return <Button variant="primary" asChild><Link href="/build?template=extract">Retry as new run</Link></Button>;
  return <Button variant="secondary" onClick={() => setPaused((value) => !value)}>{paused ? 'Resume' : 'Pause'}</Button>;
}
