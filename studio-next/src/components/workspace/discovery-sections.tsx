'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, Eyebrow, Input } from '@/components/design-system';
import { Feedback, PageHead, SelectField, Status, TablePanel, type TableRow } from './shared';
import { useStudio } from '@/lib/data';

const initialSearchQuery = 'Trailhead 2P Tent price Europe';

export function SearchSection({ showHeader = true }: { showHeader?: boolean }) {
  const { auth, execution, fixtures } = useStudio((snapshot) => snapshot);
  const router = useRouter();
  const [query, setQuery] = useState(initialSearchQuery);
  const [limit, setLimit] = useState('3');
  const [searchedQuery, setSearchedQuery] = useState(initialSearchQuery);
  const [searchResults, setSearchResults] = useState(fixtures.searchResults);

  async function runSearch() {
    setSearchedQuery(query);
    setSearchResults(await execution.search(query));
  }

  const feedback = searchedQuery !== initialSearchQuery
    ? `Showing ranked demo sources for “${searchedQuery}”.`
    : auth.sources.length
      ? `${auth.sources.length} source${auth.sources.length === 1 ? '' : 's'} added to the next workflow.`
      : undefined;

  return (
    <>
      {showHeader ? <PageHead group="Build" title="Pages" description="Ranked sources to inspect, not verified answers." /> : null}
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
        <Button variant="primary" onClick={() => void runSearch()}>Search</Button>
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
              <Button variant="secondary" onClick={() => auth.addSource(result.url)}>
                {auth.sources.includes(result.url) ? 'Added' : 'Add to sources'}
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

export function CandidatesSection({ showHeader = true }: { showHeader?: boolean }) {
  const candidates = useStudio((snapshot) => snapshot.fixtures.candidates);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entityType, setEntityType] = useState('Supplier');
  const [query, setQuery] = useState('European outdoor equipment suppliers');
  const [limit, setLimit] = useState('6');
  const [conditions, setConditions] = useState(['EU presence', 'Wholesale']);
  const [newCondition, setNewCondition] = useState('');
  const [selected, setSelected] = useState(candidates.map((candidate) => candidate.name));
  const [expandedEvidence, setExpandedEvidence] = useState<string>();
  const [message, setMessage] = useState('');
  const [showQualifications, setShowQualifications] = useState(searchParams.get('view') === 'qualified');
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

  function setQualificationView(open: boolean) {
    setShowQualifications(open);
    const next = new URLSearchParams(searchParams.toString());
    if (open) next.set('view', 'qualified');
    else next.delete('view');
    router.replace(`/search?${next.toString()}`, { scroll: false });
  }

  return (
    <>
      {showHeader ? <PageHead group="Build" title="Companies" description="Discover first; qualify selected candidates separately." /> : null}
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
            onClick={() => setMessage(`Discovery complete. Showing the top ${Math.min(Number(limit) || 6, candidates.length)} candidates.`)}
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
          <Button variant="primary" onClick={() => setQualificationView(true)}>Qualify selected</Button>
        ) : (
          <Button variant="primary" disabled>Qualify selected</Button>
        )}
      </div>
      {showQualifications ? (
        <QualifySection
          showHeader={false}
          selectedCandidates={selected}
          onBack={() => setQualificationView(false)}
        />
      ) : null}
    </>
  );
}

export function QualifySection({
  showHeader = true,
  onBack,
  selectedCandidates,
}: {
  showHeader?: boolean;
  onBack?: () => void;
  selectedCandidates?: string[];
}) {
  const fixtures = useStudio((snapshot) => snapshot.fixtures);
  const selectedNames = selectedCandidates ?? fixtures.candidates.map((candidate) => candidate.name);
  const qualificationRows: TableRow[] = fixtures.qualificationRows.map((row) => ({
    id: row.id,
    cells: [row.name, ...row.verdicts.map((verdict, index) => <Status key={`${row.id}-${index}`} tone={verdict === 'Unresolved' ? 'warning' : verdict === 'Not supported' ? 'danger' : 'success'}>{verdict}</Status>)],
  }));
  const readyCandidateIds = new Set(fixtures.readyCandidateIds);
  const selectedRows = qualificationRows.filter((row) => selectedNames.includes(String(row.cells[0])));
  const readyRows = selectedRows.filter((row) => readyCandidateIds.has(row.id));
  const candidateParam = readyRows.map((row) => row.id).join(',');

  return (
    <>
      {showHeader ? <PageHead
        group="Discovery"
        title="Qualifications"
        description="Criterion verdicts with evidence; unresolved is never rejection."
      /> : null}
      <TablePanel
        title="Selected candidates"
        headings={['Candidate', 'EU presence', 'Wholesale', 'Contact published']}
        rows={selectedRows}
      />
      <div className="page-action-row">
        <span>{readyRows.length} candidate{readyRows.length === 1 ? '' : 's'} {readyRows.length === 1 ? 'is' : 'are'} ready for a follow-up workflow.</span>
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>Back to candidates</Button>
        ) : (
          <Button variant="secondary" asChild><Link href="/search?tab=companies">Back to candidates</Link></Button>
        )}
        {readyRows.length ? (
          <Button variant="primary" asChild>
            <Link href={`/build?template=discover&input=prior&candidates=${candidateParam}`}>Use qualified candidates</Link>
          </Button>
        ) : <Button variant="primary" disabled>Use qualified candidates</Button>}
      </div>
    </>
  );
}
