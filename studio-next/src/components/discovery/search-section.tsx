'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Eyebrow, Input } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { Feedback, PageHead, SelectField } from '../workspace/shared';

const initialSearchQuery = 'Trailhead 2P Tent price Europe';

export function SearchSection({ showHeader = true }: { showHeader?: boolean }) {
  const auth = useStudio((snapshot) => ({ sources: snapshot.auth.sources, addSource: snapshot.auth.addSource }));
  const execution = useStudio((snapshot) => snapshot.execution);
  const searchResultsFixture = useStudio((snapshot) => snapshot.fixtures.searchResults);
  const router = useRouter();
  const [query, setQuery] = useState(initialSearchQuery);
  const [limit, setLimit] = useState('3');
  const [searchedQuery, setSearchedQuery] = useState(initialSearchQuery);
  const [searchResults, setSearchResults] = useState(searchResultsFixture);
  async function runSearch() { setSearchedQuery(query); setSearchResults(await execution.search(query)); }
  const feedback = searchedQuery !== initialSearchQuery ? `Showing ranked demo sources for “${searchedQuery}”.` : auth.sources.length ? `${auth.sources.length} source${auth.sources.length === 1 ? '' : 's'} added to the next workflow.` : undefined;

  return <>{showHeader ? <PageHead group="Build" title="Pages" description="Ranked sources to inspect, not verified answers." /> : null}<section className="panel search-bar"><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search query" /><SelectField label="Results limit" value={limit} onValueChange={setLimit} options={[{ value: '3', label: '3 results' }, { value: '5', label: '5 results' }]} /><Input defaultValue="English" aria-label="Language" /><Button variant="primary" onClick={() => void runSearch()}>Search</Button></section><Feedback tone="info">{feedback}</Feedback><section className="search-results">{searchResults.slice(0, Number(limit)).map((result, index) => <article className="panel search-result" key={result.domain}><div><Eyebrow>{String(index + 1).padStart(2, '0')} · {result.domain}</Eyebrow><h2>{result.title}</h2><p>{result.description}</p></div><div><Button variant="secondary" onClick={() => auth.addSource(result.url)}>{auth.sources.includes(result.url) ? 'Added' : 'Add to sources'}</Button><Button variant="primary" onClick={() => router.push('/build?template=extract')}>Extract from this page</Button></div></article>)}</section></>;
}
