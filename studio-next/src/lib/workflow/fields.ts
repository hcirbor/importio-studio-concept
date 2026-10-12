export const FIELD_TYPES = ['text', 'number', 'currency', 'boolean', 'duration', 'url', 'date', 'status'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

const FIELD_ALIASES: Readonly<Record<string, string>> = {
  pricing_url: 'pricing_url',
  pricing_link: 'pricing_url',
  starting_price: 'starting_price',
  free_plan: 'free_plan',
  free_trial: 'free_trial',
  free_trial_length: 'free_trial',
  trial_length: 'free_trial',
  plan_details: 'plan_details',
  company: 'company',
  company_name: 'company',
  product_name: 'product_name',
  current_price: 'price',
  price: 'price',
  stock: 'availability',
  availability: 'availability',
  url: 'url',
  rating: 'rating',
  seller: 'seller',
  map: 'map',
};

const FIELD_LABELS: Readonly<Record<string, string>> = {
  source: 'Source',
  product: 'Product',
  product_name: 'Product name',
  plan: 'Plan',
  plan_details: 'Plan details',
  price: 'Price',
  starting_price: 'Starting price',
  url: 'URL',
  pricing_url: 'Pricing URL',
};

const MATCHING_ALIASES: Readonly<Record<string, readonly string[]>> = {
  product_name: ['product_name', 'product'],
  availability: ['availability', 'stock', 'status'],
  stock: ['stock', 'availability', 'status'],
  pricing_url: ['pricing_url', 'url'],
  url: ['url', 'pricing_url'],
  plan_details: ['plan_details', 'plan'],
};

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && FIELD_TYPES.some((type) => type === value);
}

export function normalizeFieldName(value: string) {
  return value
    .trim()
    .replace(/^(?:(?:please\s+)?(?:return|extract|collect|get|include|show)\s+|(?:the|a|an|all|each|their|its|current)\s+)+/i, '')
    .replace(/\s+(?:from|for|on|across|per)\b.*$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function canonicalFieldName(value: string) {
  const normalized = normalizeFieldName(value);
  if (FIELD_ALIASES[normalized]) return FIELD_ALIASES[normalized];
  if (!normalized || /(?:official_pricing_page|pricing_page|(?:one_)?record(?:_per)?|pagination|this_page|these_pages|products?_in_)/.test(normalized)) return '';
  return normalized;
}

export function formatFieldLabel(field: string) {
  const normalized = normalizeFieldName(field);
  return FIELD_LABELS[normalized] ?? normalized.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

export function inferFieldType(field: string): FieldType {
  const normalized = normalizeFieldName(field);
  if (/(?:^|_)(?:price|map)(?:_|$)/.test(normalized)) return 'currency';
  if (/(?:^|_)(?:url|link)(?:_|$)/.test(normalized)) return 'url';
  if (/(?:^|_)(?:stock|availability|status)(?:_|$)/.test(normalized)) return 'status';
  if (/(?:^|_)(?:rating|count|quantity)(?:_|$)/.test(normalized)) return 'number';
  if (/(?:^|_)(?:free_plan|available)(?:_|$)/.test(normalized)) return 'boolean';
  if (/(?:^|_)(?:trial|duration|length)(?:_|$)/.test(normalized)) return 'duration';
  return 'text';
}

export function fieldTypeRecord(entries: Array<readonly [string, FieldType]>) {
  return entries.reduce<Record<string, FieldType>>((record, [name, type]) => {
    record[name] = type;
    return record;
  }, {});
}

export function inferFieldTypes(fields: string[]) {
  return fieldTypeRecord(fields.map((field) => [field, inferFieldType(field)]));
}

export function matchingFieldNames(field: string) {
  const normalized = normalizeFieldName(field);
  return MATCHING_ALIASES[normalized] ?? [normalized];
}
