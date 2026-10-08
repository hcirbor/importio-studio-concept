export const workflowTemplates = {
  compare: {
    label: 'Compare competitor prices',
    text: 'Compare the current price and availability of the same product across these retailers. Return one record per retailer.',
    type: 'Compare',
    sources: 3,
    fields: 5,
    title: 'Research',
    description: 'Find and compare facts, with evidence from every source.',
  },
  research: {
    label: 'Research pricing across domains',
    text: 'For each domain, find the official pricing page and return the company, pricing URL, starting price, free plan, free trial and plan details.',
    type: 'Research',
    sources: 6,
    fields: 6,
    title: 'Research',
    description: 'Find and compare facts, with evidence from every source.',
  },
  extract: {
    label: 'Extract from a page',
    text: 'Extract the product name, current price, availability and URL from this page.',
    type: 'Extract',
    sources: 1,
    fields: 4,
    title: 'Extract',
    description: 'Turn known pages into typed, verifiable records.',
  },
  collect: {
    label: 'Collect a product catalogue',
    text: 'Collect the products in this category. Follow pagination and return product name, price, availability and URL.',
    type: 'Collect',
    sources: 1,
    fields: 4,
    title: 'Build a dataset',
    description: 'Follow links, collect records and preserve evidence for every row.',
  },
  discover: {
    label: 'Find qualified suppliers',
    text: 'Find qualified outdoor equipment suppliers. Return company, location, product categories and minimum order.',
    type: 'Discover',
    sources: 1,
    fields: 4,
    title: 'Research',
    description: 'Discover candidates, qualify them and retain supporting evidence.',
  },
  monitor: {
    label: 'Monitor a changing page',
    text: 'Capture a trusted baseline for price and availability, then let me choose which changes should trigger alerts.',
    type: 'Monitor',
    sources: 1,
    fields: 2,
    title: 'Create a monitor baseline',
    description: 'Capture and approve a trusted baseline before scheduling checks.',
  },
} as const;

export type WorkflowTemplateKey = keyof typeof workflowTemplates;

export const visibleStarterKeys: WorkflowTemplateKey[] = ['compare', 'research', 'collect', 'discover'];

export function resolveWorkflowTemplate(value: string | null): WorkflowTemplateKey {
  return value && value in workflowTemplates ? value as WorkflowTemplateKey : 'compare';
}
