import { describe, expect, it } from 'vitest';
import { canonicalFieldName, formatFieldLabel, inferFieldType, normalizeFieldName } from '@/lib/workflow/fields';
import { inferWorkflowTemplate, parsePromptSpecification } from '@/lib/workflow/prompt-parser';
import { extractSourceDomain, sourceDisplayLabel } from '@/lib/web/source-domain';

describe('workflow fields', () => {
  it.each([
    ['the pricing URL', 'pricing_url', 'url'],
    ['starting price', 'starting_price', 'currency'],
    ['free trial length', 'free_trial', 'duration'],
    ['free plan', 'free_plan', 'boolean'],
    ['plan details', 'plan_details', 'text'],
    ['current stock', 'availability', 'status'],
  ])('normalizes %s', (input, expectedName, expectedType) => {
    const name = canonicalFieldName(input);
    expect(name).toBe(expectedName);
    expect(inferFieldType(name)).toBe(expectedType);
  });

  it('humanises compound and initialism field names', () => {
    expect(formatFieldLabel('pricing_url')).toBe('Pricing URL');
    expect(formatFieldLabel('starting_price')).toBe('Starting price');
    expect(normalizeFieldName(' Product name ')).toBe('product_name');
  });
});

describe('prompt parser', () => {
  it.each([
    {
      prompt: 'For each domain, find the official pricing page and return the company, pricing URL, starting price, free plan, free trial and plan details.',
      fields: ['company', 'pricing_url', 'starting_price', 'free_plan', 'free_trial', 'plan_details'],
    },
    {
      prompt: 'Extract pricing URL, free trial length, and plan details from https://www.Acme-CRM.example/pricing.',
      fields: ['pricing_url', 'free_trial', 'plan_details'],
    },
    {
      prompt: 'Find the official page; return price, stock; keep the capture.',
      fields: ['price', 'availability'],
    },
  ])('extracts only the requested list from punctuation and compound names', ({ prompt, fields }) => {
    expect(parsePromptSpecification(prompt).fields).toEqual(fields);
  });

  it.each([
    ['watch competitor pricing changes', 'monitor'],
    ['compare pricing across vendors', 'research'],
    ['collect a paginated catalogue', 'collect'],
    ['extract this page', 'extract'],
  ] as const)('uses explicit precedence for %s', (prompt, expected) => {
    expect(inferWorkflowTemplate(prompt)).toBe(expected);
  });

  it('finds and deduplicates domain forms', () => {
    expect(parsePromptSpecification('Compare ACME-CRM.example, https://www.acme-crm.example/pricing and pipeway.example.').domains)
      .toEqual(['acme-crm.example', 'pipeway.example']);
  });
});

describe('source domains', () => {
  it.each([
    ['https://www.cloudharbor.example/pricing', 'cloudharbor.example', 'CloudHarbor'],
    ['letterloop.example/path', 'letterloop.example', 'Letterloop'],
    ['northwind-outdoors.example', 'northwind-outdoors.example', 'Northwind Outdoors'],
  ])('validates %s', (input, domain, label) => {
    expect(extractSourceDomain(input)).toBe(domain);
    expect(sourceDisplayLabel(input)).toBe(label);
  });

  it('rejects non-host source text', () => {
    expect(extractSourceDomain('not a domain')).toBeNull();
  });
});
