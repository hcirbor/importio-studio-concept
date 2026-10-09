'use client';

import { useState } from 'react';
import { Button } from '@/components/design-system';
import { downloadJson } from '@/lib/download-json';
import { DatasetReview } from './dataset-review';
import type { WorkflowTemplateKey } from './workflow-config';

type ReviewFixture = {
  headings: string[];
  rows: string[][];
};

const reviewFixtures: Partial<Record<WorkflowTemplateKey, ReviewFixture>> = {
  research: {
    headings: ['Company', 'Pricing URL', 'Starting price', 'Free plan', 'Evidence'],
    rows: [
      ['HubSpot', 'hubspot.com/pricing', '$20 / month', 'Yes', 'Supported · plan card'],
      ['Mailchimp', 'mailchimp.com/pricing', '$13 / month', 'Yes', 'Supported · pricing page'],
      ['Brevo', 'brevo.com/pricing', 'Pending input', '—', 'Cookie decision required'],
    ],
  },
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

export function WorkflowScenarioReview({ scenario }: { scenario: WorkflowTemplateKey }) {
  const [feedback, setFeedback] = useState('');

  if (scenario === 'compare') {
    return <DatasetReview />;
  }

  const fixture = reviewFixtures[scenario] ?? reviewFixtures.collect!;

  function exportRows() {
    downloadJson(`${scenario}-preview.json`, fixture.rows);
    setFeedback('Preview exported as JSON.');
  }

  return (
    <section className="panel scenario-review">
      <div className="review-summary">
        <span>PREVIEW COMPLETE</span>
        <strong>
          {fixture.rows.length} supported {fixture.rows.length === 1 ? 'record' : 'records'} ready
          to review.
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
                  <td key={`${fixture.headings[cellIndex]}-${cell}`}>{cell}</td>
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
          onClick={() => setFeedback('Dataset saved to the Studio workspace.')}
        >
          Save dataset
        </Button>
      </footer>
    </section>
  );
}
