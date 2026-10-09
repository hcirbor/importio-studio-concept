const fieldLabels: Record<string, string> = {
  product: 'Product name',
  product_name: 'Product name',
  plan: 'Plan',
  plan_details: 'Plan',
  price: 'Price',
  starting_price: 'Price',
  url: 'Source',
  pricing_url: 'Source',
};

export function formatFieldLabel(field: string) {
  const normalized = field.trim().toLowerCase().replace(/\s+/g, '_');
  return fieldLabels[normalized] ?? normalized.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
