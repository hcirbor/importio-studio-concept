'use client';

import { useState } from 'react';
import { Button } from '@/components/design-system';
import { downloadJson } from '@/lib/download-json';
import { DatasetReview } from './dataset-review';
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
        : `${record} — ${field.toLowerCase()}: ${value}.`,
    sourceUrl,
    captureLabel: scenario === 'research' ? `${record} pricing page` : `${record} source page`,
    kind: scenario === 'research' ? 'pricing' : 'product',
  };
}

export function WorkflowScenarioReview({
  scenario,
  researchResolved = false,
  onSaved,
}: {
  scenario: WorkflowTemplateKey;
  researchResolved?: boolean;
  onSaved?: () => void;
}) {
  const [feedback, setFeedback] = useState('');
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);

  if (scenario === 'compare') {
    return <DatasetReview onSaved={onSaved} />;
  }

  const fixture = scenario === 'research' ? researchFixture(researchResolved) : reviewFixtures[scenario] ?? reviewFixtures.collect!;
  const supportedCount = scenario === 'research' && !researchResolved ? 2 : fixture.rows.length;

  function exportRows() {
    downloadJson(`${scenario}-preview.json`, fixture.rows);
    setFeedback('Preview exported as JSON.');
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
            {fixture.rows.map((row) => (
              <tr key={row.join('|')}>
                {row.map((cell, cellIndex) => (
                  <td key={`${fixture.headings[cellIndex]}-${cell}`}>
                    <button
                      className="value-evidence-button"
                      type="button"
                      onClick={() => setEvidence(evidenceForCell(scenario, fixture, row, cellIndex))}
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
        <Button variant="secondary" onClick={exportRows}>
          Export JSON
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            setFeedback('Dataset saved to the Studio workspace.');
            onSaved?.();
          }}
        >
          Save dataset
        </Button>
      </footer>
      <EvidencePanel evidence={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
