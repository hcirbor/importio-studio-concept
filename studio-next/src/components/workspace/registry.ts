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

export function isWorkspaceSectionSlug(value: string): value is WorkspaceSectionSlug {
  return workspaceSectionSlugs.includes(value as WorkspaceSectionSlug);
}
