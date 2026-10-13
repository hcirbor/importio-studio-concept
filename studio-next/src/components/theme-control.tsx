'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/design-system';

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

  return <Select value={theme} onValueChange={(value) => update(value as Theme)}>
    <SelectTrigger className="theme-control" aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>
      {theme === 'light' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}<SelectValue className="sr-only" />
    </SelectTrigger>
    <SelectContent className="theme-menu" align="end" sideOffset={6}><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem></SelectContent>
  </Select>;
}
