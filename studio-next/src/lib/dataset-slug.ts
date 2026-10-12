export function datasetSlug(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dataset';
}

export function uniqueDatasetSlug(name: string, existingIds: string[]) {
  const base = datasetSlug(name);
  const used = new Set(existingIds);
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function datasetDisplayName(name: string, id: string) {
  const base = datasetSlug(name);
  const suffix = id.startsWith(`${base}-`) ? Number(id.slice(base.length + 1)) : 1;
  return Number.isInteger(suffix) && suffix > 1 ? `${name} (${suffix})` : name;
}

export function uniqueDatasetIdentity(name: string, existingIds: string[]) {
  const id = uniqueDatasetSlug(name, existingIds);
  return { id, title: datasetDisplayName(name, id) };
}

const generatedDatasetBases = [
  'pricing-acme-tools-widgetco',
  'pricing-acme-crm-pipeway-dealflow',
  'pricing-cloudharbor-letterloop-brightsend',
  'northwind-catalogue',
  'northwind-outdoors-catalogue',
  'northwind-outdoors-extract',
  'northwind-outdoors-baseline',
  'northwind-outdoors-research',
];

const generatedDatasetTitles: Record<string, string> = {
  'pricing-acme-tools-widgetco': 'Pricing · Acme Tools, Widgetco',
  'pricing-acme-crm-pipeway-dealflow': 'Pricing · Acme Crm, Pipeway, Dealflow',
  'pricing-cloudharbor-letterloop-brightsend': 'Pricing · Cloudharbor, Letterloop, Brightsend',
  'northwind-catalogue': 'Northwind catalogue',
  'northwind-outdoors-catalogue': 'Northwind Outdoors catalogue',
  'northwind-outdoors-extract': 'Northwind Outdoors extract',
  'northwind-outdoors-baseline': 'Northwind Outdoors baseline',
  'northwind-outdoors-research': 'Northwind Outdoors research',
};

export const generatedDatasetRouteIds = generatedDatasetBases.flatMap((base) => [base, `${base}-2`, `${base}-3`]);

export function datasetTitleFromSlug(id: string) {
  const suffix = id.match(/-(\d+)$/)?.[1];
  const base = id.replace(/-\d+$/, '');
  const title = generatedDatasetTitles[base]
    ?? (base.split('-').filter(Boolean).map((part) => part.replace(/^./, (letter) => letter.toUpperCase())).join(' ') || 'Dataset');
  return suffix ? `${title} (${suffix})` : title;
}
