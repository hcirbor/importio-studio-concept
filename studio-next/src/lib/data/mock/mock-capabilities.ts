import { CAPABILITY_IDS, type CapabilityMap } from '@/lib/data/StudioDataSource';

const available = { status: 'available' as const };

export const demoCapabilities: CapabilityMap = Object.freeze(Object.fromEntries(
  CAPABILITY_IDS.map((id) => [id, available]),
) as unknown as CapabilityMap);

export const citeOtterCapabilities: CapabilityMap = Object.freeze({
  ...demoCapabilities,
  'browser-actions': { status: 'coming-soon', note: "Clicks, forms and logins aren't available yet." },
  'take-control': { status: 'coming-soon', note: "Taking control of the browser isn't available yet." },
  'input-decisions': { status: 'coming-soon', note: "Interactive decisions on a page aren't available yet." },
  'collect-pagination': { status: 'preview', limit: 10, note: 'Live runs are capped at 3 pages and 10 records.' },
  'large-collect': { status: 'preview', limit: 10, note: 'Live runs are capped at 3 pages and 10 records.' },
  'monitor-rules': { status: 'coming-soon', note: "Price thresholds aren't available yet. Monitors alert on any change." },
  'monitor-channels': { status: 'coming-soon', note: "Email and Slack alerts aren't available yet." },
  'cost-estimates': { status: 'coming-soon', note: "Live cost isn't available yet. Usage is shown instead." },
  'capture-screenshot': { status: 'preview', note: 'Screenshot artefacts are available for retained captures.' },
  'capture-html': { status: 'preview', note: 'HTML snapshots are available for retained captures.' },
  'capture-recording': { status: 'coming-soon', note: "Full run recordings aren't available yet." },
});

export const mockCapabilities = process.env.NEXT_PUBLIC_CAPABILITY_PROFILE === 'citeotter'
  ? citeOtterCapabilities
  : demoCapabilities;
