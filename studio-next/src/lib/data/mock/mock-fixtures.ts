import type { MockFixtures } from '@/lib/data/StudioDataSource';

export const mockFixtures: MockFixtures = {
  searchResults: [
    { domain: 'northwind-outdoors.example', url: 'https://northwind-outdoors.example/tents/trailhead-2p', title: 'Trailhead 2P Tent — Northwind Outdoors', description: 'Product page with current EUR price, stock status and delivery guidance.' },
    { domain: 'summit-supply.example', url: 'https://summit-supply.example/camping/trailhead-two-person', title: 'Trailhead Two-Person Tent — Summit Supply', description: 'Retail listing with price, low-stock notice and product specifications.' },
    { domain: 'trail-shop.example', url: 'https://trail-shop.example/search?q=trailhead', title: 'Trailhead 2 Person — Trail Shop', description: 'Product detail page with price and availability requiring review.' },
  ],
  candidates: [
    { name: 'Northwind Trade', domain: 'northwind.example', detail: 'Outdoor equipment supplier · Rotterdam' },
    { name: 'Summit Supply Europe', domain: 'summit.example', detail: 'Wholesale distributor · Lyon' },
    { name: 'Alpine Trade', domain: 'alpine.example', detail: 'Outdoor catalogue · Innsbruck' },
  ],
  qualificationRows: [
    { id: 'northwind-trade', name: 'Northwind Trade', verdicts: ['Supported', 'Supported', 'Supported'] },
    { id: 'summit-supply-europe', name: 'Summit Supply Europe', verdicts: ['Supported', 'Supported', 'Unresolved'] },
    { id: 'alpine-trade', name: 'Alpine Trade', verdicts: ['Supported', 'Not supported', 'Unresolved'] },
  ],
  readyCandidateIds: ['northwind-trade', 'summit-supply-europe'],
  pipelines: [
    { id: 'competitor-prices', name: 'Competitor prices', detail: '3 sources · 5 fields', version: 'v4', lastRun: '2 min ago', schedule: 'On demand', status: 'Needs review', tone: 'warning', href: '/pipelines/competitor-prices' },
    { id: 'outdoor-catalogue', name: 'Outdoor catalogue', detail: '12 categories · 8 fields', version: 'v7', lastRun: '1 hr ago', schedule: 'Daily', status: 'Healthy', tone: 'success' },
    { id: 'qualified-suppliers', name: 'Qualified suppliers', detail: 'EU region · 9 fields', version: 'v2', lastRun: 'Yesterday', schedule: 'Weekly', status: 'Healthy', tone: 'success' },
  ],
  memoryRows: [
    { id: 'competitor-price-review', label: 'Competitor price review', runId: 'run_7f3a', retention: 'Saved until 5 Nov 2026', status: 'Completed · Partial', tone: 'warning', href: '/build?template=compare&input=prior' },
    { id: 'supplier-market-scan', label: 'Supplier market scan', runId: 'run_supplier_2b81', retention: 'Saved until 18 Nov 2026', status: 'Completed · Succeeded', tone: 'success', href: '/build?template=discover&input=prior' },
  ],
  groups: [
    { name: 'EU supplier discovery', items: '8 items', status: 'Completed · Partial', tone: 'warning' },
    { name: 'SaaS pricing sample', items: '10 items', status: 'Completed · Succeeded', tone: 'success' },
  ],
  usageRows: [
    { id: 'outdoor-catalogue', values: ['Outdoor catalogue', '742', '81,412', '246 min', '$5.19'] },
    { id: 'competitor-prices', values: ['Competitor prices', '422', '8,996', '130 min', '$2.95'] },
    { id: 'qualified-suppliers', values: ['Qualified suppliers', '120', '2,204', '42 min', '$0.84'] },
  ],
  usageTrend: { runs: [32, 41, 36, 58, 44, 49, 34], dates: ['Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7', 'Oct 8', 'Oct 9'] },
  webhooks: [{ id: 'primary-data-endpoint', url: 'https://data.example.com/importio', events: 'Run completed · Monitor changed', health: 'Healthy' }],
  mcpSetups: [
    { id: 'claude', label: 'Claude', title: 'Claude connector setup', setup: 'Customize → Connectors → Add custom connector → https://mcp.import.io/mcp' },
    { id: 'claude-code', label: 'Claude Code', title: 'Claude Code setup command', setup: 'claude mcp add --transport http importio https://mcp.import.io/mcp' },
    { id: 'chatgpt', label: 'ChatGPT', title: 'ChatGPT connector setup', setup: 'Settings → Apps → Advanced settings → Developer mode → Create (Business/Enterprise/Edu)' },
    { id: 'cursor', label: 'Cursor', title: '~/.cursor/mcp.json', setup: '{\n  "mcpServers": {\n    "importio": {\n      "url": "https://mcp.import.io/mcp"\n    }\n  }\n}' },
    { id: 'vs-code', label: 'VS Code', title: 'VS Code MCP configuration', setup: '{\n  "servers": {\n    "importio": {\n      "type": "http",\n      "url": "https://mcp.import.io/mcp"\n    }\n  }\n}' },
    { id: 'codex', label: 'Codex', title: 'Codex setup commands', setup: 'codex mcp add importio --url https://mcp.import.io/mcp\ncodex mcp login importio' },
  ],
  recentItems: [
    { label: 'Run · run_7f3a', href: '/runs/run_7f3a', kind: 'run' },
    { label: 'Run · run_batch_91af', href: '/runs/run_batch_91af', kind: 'run' },
    { label: 'Pipeline · Competitor prices', href: '/pipelines/competitor-prices', kind: 'pipeline' },
    { label: 'Pipeline · Outdoor catalogue', href: '/pipelines', kind: 'pipeline' },
    { label: 'Dataset · Competitor prices', href: '/datasets/competitor-prices', kind: 'dataset' },
    { label: 'Dataset · Outdoor catalogue', href: '/datasets?type=dataset', kind: 'dataset' },
  ],
  homePipelinesByWorkspace: {
    studio: [
      { id: 'competitor-prices', name: 'Competitor prices', status: 'Needs review', records: '3', tone: 'warning', href: '/pipelines/competitor-prices', reviewLinked: true },
      { id: 'outdoor-catalogue', name: 'Outdoor catalogue', status: 'Completed', records: '1,284', tone: 'success', href: '/pipelines' },
      { id: 'map-watch', name: 'MAP watch', status: 'Healthy', records: '9,316', tone: 'success', href: '/monitors' },
    ],
    northwind: [],
  },
};
