'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/design-system';
import { useStudio, type DatasetRecord } from '@/lib/data';
import { formatFieldLabel, matchingFieldNames, normalizeFieldName } from '@/lib/workflow/fields';
import { sourceDomain } from '@/lib/web/source-domain';
import { DatasetReview } from './dataset-review';
import { DatasetExportMenu } from './dataset-export-menu';
import { EvidencePanel, type EvidenceDetail } from './evidence-panel';
import { ActionBar } from './action-bar';
import type { WorkflowTemplateKey } from './workflow-config';

type ReviewFixture = {
  headings: string[];
  rows: Array<Array<string | null>>;
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

function evidenceForCell(scenario: WorkflowTemplateKey, fixture: ReviewFixture, row: Array<string | null>, cellIndex: number): EvidenceDetail {
  const field = fixture.headings[cellIndex];
  const value = row[cellIndex];
  const record = String(row[0] ?? 'Record');
  const sourceUrl = scenario === 'research'
    ? `https://${String(row[1] ?? '')}`
    : scenario === 'discover'
      ? 'https://worthington-directory.example/outdoor-equipment'
      : 'https://northwind-outdoors.example/tents/trailhead-2p';
  const pending = value === null || value === '—' || value === 'Pending input' || value === 'Cookie decision required';
  return {
    field,
    record,
    value: value ?? 'null',
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

function fixtureHeadingForField(field: string, headings: string[]) {
  const wanted = matchingFieldNames(field);
  return headings.findIndex((heading) => wanted.includes(normalizeFieldName(heading)));
}

function fixtureSource(scenario: WorkflowTemplateKey, row: Array<string | null>) {
  if (scenario === 'research') return String(row[1] ?? '').replace(/^https?:\/\//, '').split('/')[0];
  if (scenario === 'discover') return 'worthington-directory.example';
  return 'northwind-outdoors.example';
}

function sourceFromRecord(record: DatasetRecord) {
  const sourceUrl = Object.values(record.evidence).find((item) => item.sourceUrl)?.sourceUrl ?? '';
  try {
    return sourceDomain(sourceUrl);
  } catch {
    return sourceUrl;
  }
}

export function WorkflowScenarioReview({
  scenario,
  researchResolved = false,
  onSaved,
  onCreateMonitor,
  workspaceName = 'Import.io Studio',
  customDomains = [],
  customFields = [],
  datasetName,
  savedDatasetId = '',
  runId,
  back,
  monitorCreated = false,
}: {
  scenario: WorkflowTemplateKey;
  researchResolved?: boolean;
  onSaved?: (records?: DatasetRecord[], fields?: string[]) => void;
  onCreateMonitor?: () => void;
  workspaceName?: string;
  customDomains?: string[];
  customFields?: string[];
  datasetName: string;
  savedDatasetId?: string;
  runId?: string;
  back?: () => void;
  monitorCreated?: boolean;
}) {
  const execution = useStudio((snapshot) => snapshot.execution);
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [engineResult, setEngineResult] = useState<{ runId: string; records: DatasetRecord[] }>();
  const engineRecords = engineResult && engineResult.runId === runId ? engineResult.records : [];

  useEffect(() => {
    if (!runId || !customDomains.length) return;
    let active = true;
    void execution.evidence(runId).then((records) => {
      if (active) setEngineResult({ runId, records });
    });
    return () => { active = false; };
  }, [customDomains.length, execution, runId]);

  if (scenario === 'compare') {
    return (
      <DatasetReview
        fields={customFields}
        onSaved={onSaved}
        workspaceName={workspaceName}
        datasetName={datasetName}
        savedDatasetId={savedDatasetId}
        back={back}
      />
    );
  }

  const baseFixture = scenario === 'research' ? researchFixture(researchResolved) : reviewFixtures[scenario] ?? reviewFixtures.collect!;
  const savedFields = (customFields.length ? customFields : baseFixture.headings.filter((heading) => !['Evidence', 'Source'].includes(heading)))
    .filter((field) => normalizeFieldName(field) !== 'source');
  const customRecords = customDomains.length ? engineRecords : [];
  const datasetRecords: DatasetRecord[] = customRecords.length ? customRecords : baseFixture.rows.map((row, rowIndex) => {
    const source = fixtureSource(scenario, row);
    const values = Object.fromEntries(savedFields.map((field) => {
      if (scenario === 'monitor') {
        const key = normalizeFieldName(field);
        if (key === 'price') return [field, '€249'];
        if (key === 'availability' || key === 'stock' || key === 'status') return [field, 'In stock'];
      }
      const fieldIndex = fixtureHeadingForField(field, baseFixture.headings);
      const value = fieldIndex >= 0 ? row[fieldIndex] : null;
      return [field, value === '—' || value === 'Pending input' || value === 'Cookie decision required' ? null : value ?? null];
    }));
    const evidence = Object.fromEntries(savedFields.map((field) => {
      const fieldIndex = fixtureHeadingForField(field, baseFixture.headings);
      if (fieldIndex < 0) return [field, { sourceUrl: `https://${source}`, quote: 'Not stated · unknown' }];
      const detail = evidenceForCell(scenario, baseFixture, row, fieldIndex);
      return [field, { sourceUrl: detail.sourceUrl, quote: values[field] === null ? 'Not stated · unknown' : detail.quote }];
    }));
    return { id: `${scenario}-${rowIndex + 1}`, values, evidence };
  });
  const fixture: ReviewFixture = {
    headings: ['source', ...savedFields],
    rows: datasetRecords.map((record) => [sourceFromRecord(record), ...savedFields.map((field) => record.values[field])]),
  };
  const supportedCount = scenario === 'research' && !researchResolved && !customRecords.length ? 2 : fixture.rows.length;

  function openEvidence(rowIndex: number, cellIndex: number) {
    const field = fixture.headings[cellIndex];
    const record = datasetRecords[rowIndex];
    const evidenceField = field === 'source' ? savedFields[0] : field;
    const item = evidenceField ? record.evidence[evidenceField] : undefined;
    const source = sourceFromRecord(record);
    const value = fixture.rows[rowIndex][cellIndex];
    setEvidence({ field, record: source, value: value ?? 'null', quote: item?.quote ?? 'Source page retained.', sourceUrl: item?.sourceUrl ?? `https://${source}`, captureLabel: `${source} source page`, kind: scenario === 'research' ? 'pricing' : 'product' });
  }

  return (
    <section className="panel scenario-review">
      <div className="review-summary">
        <span>PREVIEW COMPLETE</span>
        <strong>
          {supportedCount} of {fixture.rows.length} supported {fixture.rows.length === 1 ? 'record' : 'records'} ready to review.
        </strong>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {fixture.headings.map((heading) => (
                <th key={heading}>{formatFieldLabel(heading)}</th>
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
                      {cell === null ? <><code>null</code><span className="unknown-value">Not stated · unknown</span></> : cell}
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
        <DatasetExportMenu dataset={{ title: datasetName, records: datasetRecords }} />
      </footer>
      <EvidencePanel evidence={evidence} onClose={() => setEvidence(null)} />
      <ActionBar
        status={monitorCreated
          ? 'Monitor created'
          : savedDatasetId
            ? 'Dataset saved'
            : supportedCount < fixture.rows.length
              ? 'Review required'
              : 'Ready to save'}
        summary={`${supportedCount} of ${fixture.rows.length} supported ${fixture.rows.length === 1 ? 'record' : 'records'}.`}
        secondary={back ? (
          <Button variant="secondary" onClick={back}>
            Back to run
          </Button>
        ) : undefined}
        primary={monitorCreated ? (
          <Button variant="primary" asChild>
            <Link href="/monitors">Open monitors</Link>
          </Button>
        ) : savedDatasetId ? (
          <Button variant="primary" asChild>
            <Link href={`/datasets/${savedDatasetId}`}>Open dataset</Link>
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              if (scenario === 'monitor') {
                onCreateMonitor?.();
                return;
              }
              toast.success(`Dataset saved to ${workspaceName}.`);
              onSaved?.(datasetRecords, savedFields);
            }}
          >
            {scenario === 'monitor' ? 'Create monitor' : 'Save dataset'}
          </Button>
        )}
      />
    </section>
  );
}
