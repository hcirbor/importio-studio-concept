const fieldLabels: Record<string, string> = {
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

export function formatFieldLabel(field: string) {
  const normalized = field.trim().toLowerCase().replace(/\s+/g, '_');
  return fieldLabels[normalized] ?? normalized.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
