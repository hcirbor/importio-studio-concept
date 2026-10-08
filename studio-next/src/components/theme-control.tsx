'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function ThemeControl() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('importio-studio-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function update(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem('importio-studio-theme', next);
  }

  return (
    <label className="theme-control">
      <span className="sr-only">Theme</span>
      <select value={theme} onChange={(event) => update(event.target.value as Theme)} aria-label="Theme">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
