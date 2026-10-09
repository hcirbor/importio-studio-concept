'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Eyebrow, Input } from '@/components/design-system';
import { Feedback, PageHead, SelectField, Status, TablePanel, type TableRow } from './shared';

const initialSearchQuery = 'Trailhead 2P Tent price Europe';

const searchResults = [
  {
    domain: 'northwind-outdoors.example',
    title: 'Trailhead 2P Tent — Northwind Outdoors',
    description: 'Product page with current EUR price, stock status and delivery guidance.',
  },
  {
    domain: 'summit-supply.example',
    title: 'Trailhead Two-Person Tent — Summit Supply',
    description: 'Retail listing with price, low-stock notice and product specifications.',
  },
  {
    domain: 'trail-shop.example',
    title: 'Trailhead 2 Person — Trail Shop',
    description: 'Product detail page with price and availability requiring review.',
  },
];

const candidates = [
  { name: 'Northwind Trade', domain: 'northwind.example', detail: 'Outdoor equipment supplier · Rotterdam' },
  { name: 'Summit Supply Europe', domain: 'summit.example', detail: 'Wholesale distributor · Lyon' },
  { name: 'Alpine Trade', domain: 'alpine.example', detail: 'Outdoor catalogue · Innsbruck' },
];

const qualificationRows: TableRow[] = [
  {
    id: 'northwind-trade',
    cells: [
      'Northwind Trade',
      <Status key="eu">Supported</Status>,
      <Status key="wholesale">Supported</Status>,
      <Status key="contact">Supported</Status>,
    ],
  },
  {
    id: 'summit-supply-europe',
    cells: [
      'Summit Supply Europe',
      <Status key="eu">Supported</Status>,
      <Status key="wholesale">Supported</Status>,
      <Status key="contact" tone="warning">Unresolved</Status>,
    ],
  },
  {
    id: 'alpine-trade',
    cells: [
      'Alpine Trade',
      <Status key="eu">Supported</Status>,
      <Status key="wholesale" tone="danger">Not supported</Status>,
      <Status key="contact" tone="warning">Unresolved</Status>,
    ],
  },
];

export function SearchSection() {
  const router = useRouter();
  const [query, setQuery] = useState(initialSearchQuery);
  const [limit, setLimit] = useState('3');
  const [searchedQuery, setSearchedQuery] = useState(initialSearchQuery);
  const [addedSources, setAddedSources] = useState<string[]>([]);

  const feedback = searchedQuery !== initialSearchQuery
    ? `Showing ranked demo sources for “${searchedQuery}”.`
    : addedSources.length
      ? `${addedSources.length} source${addedSources.length === 1 ? '' : 's'} added to the next workflow.`
      : undefined;

  function addSource(domain: string) {
    setAddedSources((current) => current.includes(domain) ? current : [...current, domain]);
  }

  return (
    <>
      <PageHead group="Discovery" title="Search" description="Ranked sources to inspect, not verified answers." />
      <section className="panel search-bar">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search query" />
        <SelectField
          label="Results limit"
          value={limit}
          onValueChange={setLimit}
          options={[
            { value: '3', label: '3 results' },
            { value: '5', label: '5 results' },
          ]}
        />
        <Input defaultValue="English" aria-label="Language" />
        <Button variant="primary" onClick={() => setSearchedQuery(query)}>Search</Button>
      </section>
      <Feedback tone="info">{feedback}</Feedback>
      <section className="search-results">
        {searchResults.slice(0, Number(limit)).map((result, index) => (
          <article className="panel search-result" key={result.domain}>
            <div>
              <Eyebrow>{String(index + 1).padStart(2, '0')} · {result.domain}</Eyebrow>
              <h2>{result.title}</h2>
              <p>{result.description}</p>
            </div>
            <div>
              <Button variant="secondary" onClick={() => addSource(result.domain)}>
                {addedSources.includes(result.domain) ? 'Added' : 'Add to sources'}
              </Button>
              <Button variant="primary" onClick={() => router.push('/build?template=extract')}>
                Extract from this page
              </Button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

export function CandidatesSection() {
  const [entityType, setEntityType] = useState('Supplier');
  const [query, setQuery] = useState('European outdoor equipment suppliers');
  const [limit, setLimit] = useState('6');
  const [conditions, setConditions] = useState(['EU presence', 'Wholesale']);
  const [newCondition, setNewCondition] = useState('');
  const [selected, setSelected] = useState(candidates.map((candidate) => candidate.name));
  const [expandedEvidence, setExpandedEvidence] = useState<string>();
  const [message, setMessage] = useState('');
  const estimatedMatches = Math.max(6, conditions.length * 18);

  function addCondition() {
    const condition = newCondition.trim();
    if (!condition || conditions.includes(condition)) return;
    setConditions((current) => [...current, condition]);
    setNewCondition('');
  }

  function toggleCandidate(name: string) {
    setSelected((current) => (
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    ));
  }

  return (
    <>
      <PageHead group="Discovery" title="Candidates" description="Discover first; qualify selected candidates separately." />
      <section className="panel candidate-builder">
        <div className="form-grid">
          <label>
            ENTITY TYPE
            <SelectField
              label="Entity type"
              value={entityType}
              onValueChange={setEntityType}
              options={['Supplier', 'Company', 'Product'].map((value) => ({ value, label: value }))}
            />
          </label>
          <label>
            QUERY
            <Input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label>
            LIMIT
            <Input type="number" value={limit} onChange={(event) => setLimit(event.target.value)} />
          </label>
        </div>
        <div>
          <Eyebrow>Match conditions</Eyebrow>
          <div className="condition-row">
            {conditions.map((condition) => (
              <Button
                key={condition}
                className="chip-button"
                variant="ghost"
                size="sm"
                onClick={() => setConditions((current) => current.filter((item) => item !== condition))}
                aria-label={`Remove ${condition}`}
              >
                {condition} ×
              </Button>
            ))}
            <Input
              value={newCondition}
              onChange={(event) => setNewCondition(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && addCondition()}
              placeholder="Add condition"
            />
            <Button variant="secondary" size="sm" onClick={addCondition}>Add</Button>
          </div>
        </div>
        <div className="panel-actions">
          <span><strong>{estimatedMatches}</strong> estimated matches</span>
          <Button
            variant="secondary"
            onClick={() => setMessage(`Preview: ${estimatedMatches} ${entityType.toLowerCase()} matches for “${query}”.`)}
          >
            Preview count
          </Button>
          <Button
            variant="primary"
            onClick={() => setMessage(`Discovery complete. Showing the top ${Math.min(Number(limit) || 6, candidates.length)} bounded demo candidates.`)}
          >
            Discover
          </Button>
        </div>
      </section>
      <Feedback tone="info">{message}</Feedback>
      <section className="candidate-grid">
        {candidates.map((candidate) => (
          <article className="panel candidate-card" key={candidate.name}>
            <input
              type="checkbox"
              checked={selected.includes(candidate.name)}
              onChange={() => toggleCandidate(candidate.name)}
              aria-label={`Select ${candidate.name}`}
            />
            <div>
              <Eyebrow>Unqualified candidate</Eyebrow>
              <h2>{candidate.name}</h2>
              <p>{candidate.domain} · {candidate.detail}</p>
              {expandedEvidence === candidate.name ? (
                <p className="candidate-evidence">Directory profile, business address and wholesale catalogue retained.</p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedEvidence(expandedEvidence === candidate.name ? undefined : candidate.name)}
            >
              Evidence
            </Button>
          </article>
        ))}
      </section>
      <div className="page-action-row">
        <span>{selected.length} unqualified candidate{selected.length === 1 ? '' : 's'} selected</span>
        {selected.length ? (
          <Button variant="primary" asChild><Link href="/qualify">Qualify selected</Link></Button>
        ) : (
          <Button variant="primary" disabled>Qualify selected</Button>
        )}
      </div>
    </>
  );
}

export function QualifySection() {
  return (
    <>
      <PageHead
        group="Discovery"
        title="Qualifications"
        description="Criterion verdicts with evidence; unresolved is never rejection."
      />
      <TablePanel
        title="Selected candidates"
        headings={['Candidate', 'EU presence', 'Wholesale', 'Contact published']}
        rows={qualificationRows}
      />
      <div className="page-action-row">
        <span>2 candidates are ready for a follow-up workflow.</span>
        <Button variant="secondary" asChild><Link href="/candidates">Back to candidates</Link></Button>
        <Button variant="primary" asChild>
          <Link href="/build?template=discover&input=prior">Use qualified candidates</Link>
        </Button>
      </div>
    </>
  );
}
