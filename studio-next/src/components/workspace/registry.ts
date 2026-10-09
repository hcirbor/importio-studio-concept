export const workspaceSectionSlugs = [
  'pipelines',
  'runs',
  'datasets',
  'monitors',
  'memories',
  'groups',
  'enrich',
  'search',
  'candidates',
  'qualify',
  'developers',
  'webhooks',
  'usage',
  'settings',
] as const;

export type WorkspaceSectionSlug = (typeof workspaceSectionSlugs)[number];

export const workspaceSectionTitles: Record<WorkspaceSectionSlug, string> = {
  pipelines: 'Pipelines',
  runs: 'Runs',
  datasets: 'Datasets',
  monitors: 'Monitors',
  memories: 'Saved runs',
  groups: 'Batches',
  enrich: 'Enrichments',
  search: 'Search',
  candidates: 'Companies',
  qualify: 'Companies',
  developers: 'Developers',
  webhooks: 'Webhooks',
  usage: 'Usage',
  settings: 'Settings',
};

export function isWorkspaceSectionSlug(value: string): value is WorkspaceSectionSlug {
  return workspaceSectionSlugs.includes(value as WorkspaceSectionSlug);
}
