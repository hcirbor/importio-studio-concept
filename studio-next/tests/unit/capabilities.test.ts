import { describe, expect, it } from 'vitest';
import { CAPABILITY_IDS } from '@/lib/data/StudioDataSource';
import { citeOtterCapabilities, demoCapabilities } from '@/lib/data/mock/mock-capabilities';

describe('capability profiles', () => {
  it('keeps every demo capability available', () => {
    expect(Object.keys(demoCapabilities).sort()).toEqual([...CAPABILITY_IDS].sort());
    expect(Object.values(demoCapabilities).every(({ status }) => status === 'available')).toBe(true);
  });

  it('describes every labelled CiteOtter capability', () => {
    const labelled = CAPABILITY_IDS.filter((id) => citeOtterCapabilities[id].status !== 'available');
    expect(labelled).toEqual([
      'browser-actions',
      'take-control',
      'input-decisions',
      'collect-pagination',
      'large-collect',
      'monitor-rules',
      'monitor-channels',
      'cost-estimates',
      'capture-screenshot',
      'capture-html',
      'capture-recording',
    ]);
    expect(labelled.every((id) => Boolean(citeOtterCapabilities[id].note))).toBe(true);
    expect(citeOtterCapabilities['collect-pagination'].limit).toBe(10);
    expect(citeOtterCapabilities['large-collect'].limit).toBe(10);
  });
});
