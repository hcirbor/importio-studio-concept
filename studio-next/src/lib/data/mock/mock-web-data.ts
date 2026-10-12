import type { DatasetRecord } from '@/lib/data/StudioDataSource';

function hashDomain(domain: string) {
  return Array.from(domain).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0) >>> 0;
}

export function domainLabel(domain: string) {
  return domain.split('.')[0].split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function mockDomainRecord(domain: string, fields: string[]): DatasetRecord {
  const seed = hashDomain(domain);
  const price = 12 + (seed % 29);
  const trial = [7, 14, 30][seed % 3];
  const plan = ['Starter', 'Essentials', 'Growth'][seed % 3];
  const stock = ['In stock', 'Low stock', 'Out of stock'][seed % 3];
  const label = domainLabel(domain);
  const quote = `${plan} — $${price}/month. Try free for ${trial} days.`;
  const sourceUrl = `https://${domain}/pricing`;
  const values: Record<string, string | null> = {};
  const evidence: DatasetRecord['evidence'] = {};
  fields.forEach((field) => {
    const key = field.toLowerCase().replace(/\s+/g, '_');
    let value: string | null = null;
    if (key === 'starting_price' || key === 'price') value = `$${price} / month`;
    else if (key === 'free_trial' || key === 'trial' || key === 'free_trial_length') value = `${trial} days`;
    else if (key === 'plan' || key === 'free_plan' || key === 'plan_details') value = plan;
    else if (key === 'stock' || key === 'availability') value = stock;
    else if (key === 'name' || key === 'product' || key === 'product_name' || key === 'company') value = label;
    else if (key === 'url' || key === 'pricing_url') value = sourceUrl;
    else if (key === 'rating') value = `${(3.8 + (seed % 12) / 10).toFixed(1)} / 5`;
    else if (key === 'seller') value = label;
    else if (key === 'map') value = `$${Math.max(8, price - 3)}`;
    values[field] = value;
    evidence[field] = { sourceUrl, quote: value === null ? 'Not stated · unknown' : quote };
  });
  return { id: domain.replace(/[^a-z0-9]+/gi, '-'), values, evidence };
}
