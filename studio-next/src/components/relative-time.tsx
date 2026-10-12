'use client';

import { useEffect, useState } from 'react';

export function formatRelativeTime(timestamp: number, now: number) {
  const elapsed = Math.max(0, now - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function RelativeTime({ timestamp, fallback = 'Just now' }: { timestamp?: number; fallback?: string }) {
  const now = useCurrentTime();
  return <>{timestamp && now ? formatRelativeTime(timestamp, now) : fallback}</>;
}

export function useCurrentTime() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);
  return now;
}

export function isTimestampToday(timestamp: number | undefined, now: number) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const today = new Date(now);
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}
