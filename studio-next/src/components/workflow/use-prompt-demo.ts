'use client';

import { useEffect, useState } from 'react';

export function usePromptDemo(examples: string[], enabled: boolean) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [typedExample, setTypedExample] = useState('');
  useEffect(() => {
    const example = examples[exampleIndex];
    if (!enabled) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) { const timer = window.setTimeout(() => setTypedExample(example), 0); return () => window.clearTimeout(timer); }
    let character = 0; let deleting = false; let timer = 0;
    const typeNextCharacter = () => {
      character += deleting ? -1 : 1; setTypedExample(example.slice(0, character));
      if (!deleting && character === example.length) { deleting = true; timer = window.setTimeout(typeNextCharacter, 1400); }
      else if (deleting && character === 0) setExampleIndex((current) => (current + 1) % examples.length);
      else timer = window.setTimeout(typeNextCharacter, deleting ? 10 : 18 + (character % 3) * 4);
    };
    timer = window.setTimeout(() => { setTypedExample(''); timer = window.setTimeout(typeNextCharacter, 220); }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, exampleIndex, examples]);
  function resetPromptDemo() { setExampleIndex(0); setTypedExample(''); }
  return { typedExample, resetPromptDemo };
}
