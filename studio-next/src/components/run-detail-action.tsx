'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/design-system';

export function RunDetailAction({ completed }: { completed: boolean }) {
  const [paused, setPaused] = useState(false);
  if (completed) return <Button variant="primary" asChild><Link href="/datasets/competitor-prices">Review data</Link></Button>;
  return <Button variant="secondary" onClick={() => setPaused((value) => !value)}>{paused ? 'Resume' : 'Pause'}</Button>;
}
