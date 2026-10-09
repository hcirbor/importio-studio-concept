'use client';

import { useState } from 'react';
import { Button } from '@/components/design-system';
import type { DatasetRecord } from '@/lib/auth';
import { mockDomainRecords } from '@/lib/mock-web-data';
import { DatasetReview } from './dataset-review';
import { DatasetExportMenu } from './dataset-export-menu';
import { EvidencePanel, type EvidenceDetail } from './evidence-panel';
import type { WorkflowTemplateKey } from './workflow-config';

type ReviewFixture = {
  headings: string[];
  rows: string[][];
};

const reviewFixtures: Partial<Record<WorkflowTemplateKey, ReviewFixture>> = {
  collect: {
    headings: ['Product', 'Price', 'Availability', 'URL', 'Evidence'],
    rows: [
      ['Summit Solo Tent', '€179', 'In stock', '/tents/summit-solo', 'Supported · page 1'],
      ['Trailhead 2P Tent', '€249', 'In stock', '/tents/trailhead-2p', 'Supported · page 2'],
      ['Basecamp 4 Tent', '€399', 'Low stock', '/tents/basecamp-4', 'Supported · page 2'],
    ],
  },
  extract: {
    headings: ['Product', 'Price', 'Availability', 'URL', 'Evidence'],
    rows: [
      ['Trailhead 2P Tent', '€249', 'In stock', '/tents/trailhead-2p', 'Supported · product page'],
    ],
  },
  discover: {
    headings: ['Company', 'Location', 'Categories', 'Minimum order', 'Evidence'],
    rows: [
      ['Northwind Trade', 'Rotterdam', 'Tents, packs', '€500', 'Supported · directory'],
      ['Summit Supply Europe', 'Lyon', 'Camping equipment', '€750', 'Supported · detail page'],
      ['Alpine Trade', 'Innsbruck', 'Outdoor equipment', '€400', 'Supported · detail page'],
    ],
  },
  monitor: {
    headings: ['Field', 'Baseline', 'Status', 'Source', 'Evidence'],
    rows: [
      ['Price', '€249', 'Baseline saved', 'northwind-outdoors.example', 'Supported · product page'],
      ['Availability', 'In stock', 'Baseline saved', 'northwind-outdoors.example', 'Supported · product page'],
    ],
  },
};

function researchFixture(resolved: boolean): ReviewFixture {
  return {
    headings: ['Company', 'Pricing URL', 'Starting price', 'Free plan', 'Free trial', 'Plan details', 'Evidence'],
    rows: [
      ['CloudHarbor', 'cloudharbor.example/pricing', '$18 / month', 'Yes', '14 days', 'Starter · 3 seats · core automation', 'Supported · plan card'],
      ['Letterloop', 'letterloop.example/pricing', '$12 / month', 'Yes', '30 days', 'Essentials · 500 contacts · email support', 'Supported · pricing page'],
      resolved
        ? ['BrightSend', 'brightsend.example/pricing', '$9 / month', 'Yes', '14 days', 'Starter · 2,000 emails · basic reports', 'Supported · plan card']
        : ['BrightSend', 'brightsend.example/pricing', 'Pending input', '—', '—', 'Cookie decision required', 'Cookie decision required'],
    ],
  };
}

const pricingPageCopy: Record<string, {
  company: string;
  url: string;
  plan: string;
  freePlan: string;
  trial: string;
}> = {
  CloudHarbor: {
    company: 'CloudHarbor plans and pricing.',
    url: 'Pricing · cloudharbor.example/pricing',
    plan: 'Starter — $18/month. 3 seats, core automation.',
    freePlan: 'Free plan available.',
    trial: 'Try any paid plan free for 14 days.',
  },
  Letterloop: {
    company: 'Letterloop plans and pricing.',
    url: 'Pricing · letterloop.example/pricing',
    plan: 'Essentials — $12/month. 500 contacts, email support.',
    freePlan: 'Free plan available.',
    trial: 'Try any paid plan free for 30 days.',
  },
  BrightSend: {
    company: 'BrightSend plans and pricing.',
    url: 'Pricing · brightsend.example/pricing',
    plan: 'Starter — $9/month. 2,000 emails, basic reports.',
    freePlan: 'Free plan available.',
    trial: 'Try any paid plan free for 14 days.',
  },
};

function pricingQuote(record: string, cellIndex: number, pending: boolean) {
  if (pending) return 'Choose your cookie preferences to continue.';
  const copy = pricingPageCopy[record];
  if (!copy) return 'Pricing information shown on the captured page.';
  if (cellIndex === 0) return copy.company;
  if (cellIndex === 1) return copy.url;
  if (cellIndex === 3) return copy.freePlan;
  if (cellIndex === 4) return copy.trial;
  return copy.plan;
}

function evidenceForCell(scenario: WorkflowTemplateKey, fixture: ReviewFixture, row: string[], cellIndex: number): EvidenceDetail {
  const field = fixture.headings[cellIndex];
  const value = row[cellIndex];
  const record = row[0];
  const sourceUrl = scenario === 'research'
    ? `https://${row[1]}`
    : scenario === 'discover'
      ? 'https://worthington-directory.example/outdoor-equipment'
      : 'https://northwind-outdoors.example/tents/trailhead-2p';
  const pending = value === '—' || value === 'Pending input' || value === 'Cookie decision required';
  return {
    field,
    record,
    value,
    quote: scenario === 'research'
      ? pricingQuote(record, cellIndex, pending)
      : pending
        ? 'The source paused before this value could be supported.'
        : scenario === 'collect' || scenario === 'extract'
          ? `${row[0]} — ${row[1]} · ${row[2]}.`
          : scenario === 'monitor'
            ? `Trailhead 2P Tent — €249 · In stock.`
            : `${record} — ${value}.`,
    sourceUrl,
    captureLabel: scenario === 'research' ? `${record} pricing page` : `${record} source page`,
    kind: scenario === 'research' ? 'pricing' : 'product',
  };
}

export function WorkflowScenarioReview({
  scenario,
  researchResolved = false,
  onSaved,
  onCreateMonitor,
  workspaceName = 'Import.io Studio',
  customDomains = [],
  customFields = [],
}: {
  scenario: WorkflowTemplateKey;
  researchResolved?: boolean;
  onSaved?: (records?: DatasetRecord[], fields?: string[]) => void;
  onCreateMonitor?: () => void;
  workspaceName?: string;
  customDomains?: string[];
  customFields?: string[];
}) {
  const [feedback, setFeedback] = useState('');
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);

  if (scenario === 'compare') {
    return <DatasetReview onSaved={onSaved} workspaceName={workspaceName} />;
  }

  const customRecords = customDomains.length ? mockDomainRecords(customDomains, customFields) : [];
  const fixture = customRecords.length ? {
    headings: ['Source', ...customFields],
    rows: customRecords.map((record, index) => [customDomains[index], ...customFields.map((field)=>record.values[field] ?? '—')]),
  } : scenario === 'research' ? researchFixture(researchResolved) : reviewFixtures[scenario] ?? reviewFixtures.collect!;
  const supportedCount = scenario === 'research' && !researchResolved && !customRecords.length ? 2 : fixture.rows.length;
  const savedFields = customRecords.length ? customFields : fixture.headings.filter((heading)=>heading !== 'Evidence');
  const datasetRecords: DatasetRecord[] = customRecords.length ? customRecords : fixture.rows.map((row, rowIndex) => ({
    id: `${scenario}-${rowIndex + 1}`,
    values: Object.fromEntries(savedFields.map((field) => {
      const index = fixture.headings.indexOf(field);
      return [field, row[index] ?? '—'];
    })),
    evidence: Object.fromEntries(savedFields.map((field) => {
      const index = fixture.headings.indexOf(field);
      const detail = evidenceForCell(scenario, fixture, row, index);
      return [field, { sourceUrl: detail.sourceUrl, quote: detail.quote }];
    })),
  }));

  function openEvidence(rowIndex: number, cellIndex: number) {
    if (!customRecords.length) {
      setEvidence(evidenceForCell(scenario, fixture, fixture.rows[rowIndex], cellIndex));
      return;
    }
    const field = fixture.headings[cellIndex];
    const record = customRecords[rowIndex];
    const evidenceField = field === 'Source' ? customFields[0] : field;
    const item = record.evidence[evidenceField];
    setEvidence({ field, record: customDomains[rowIndex], value: fixture.rows[rowIndex][cellIndex], quote: item?.quote ?? 'Source page retained.', sourceUrl: item?.sourceUrl ?? `https://${customDomains[rowIndex]}`, captureLabel: `${customDomains[rowIndex]} pricing page`, kind: 'pricing' });
  }

  return (
    <section className="panel scenario-review">
      <div className="review-summary">
        <span>PREVIEW COMPLETE</span>
        <strong>
          {supportedCount} of {fixture.rows.length} supported {fixture.rows.length === 1 ? 'record' : 'records'} ready to review.
        </strong>
      </div>

      {feedback ? (
        <p className="review-feedback" role="status">
          {feedback}
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {fixture.headings.map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fixture.rows.map((row, rowIndex) => (
              <tr key={row.join('|')}>
                {row.map((cell, cellIndex) => (
                  <td key={`${fixture.headings[cellIndex]}-${cell}`}>
                    <button
                      className="value-evidence-button"
                      type="button"
                      onClick={() => openEvidence(rowIndex, cellIndex)}
                    >
                      {cell}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="review-footer">
        <span>Evidence retained with every supported value</span>
        <DatasetExportMenu dataset={{ title: scenario === 'research' ? 'SaaS pricing research' : scenario, records: datasetRecords }} />
        <Button
          variant="primary"
          onClick={() => {
            if (scenario === 'monitor') {
              onCreateMonitor?.();
              return;
            }
            setFeedback(`Dataset saved to ${workspaceName}.`);
            onSaved?.(datasetRecords, savedFields);
          }}
        >
          {scenario === 'monitor' ? 'Create monitor' : 'Save dataset'}
        </Button>
      </footer>
      <EvidencePanel evidence={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
