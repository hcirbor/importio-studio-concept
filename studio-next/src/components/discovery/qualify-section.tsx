'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { PageHead, Status, TablePanel, type TableRow } from '../workspace/shared';

export function QualifySection({ showHeader = true, onBack, selectedCandidates }: { showHeader?: boolean; onBack?: () => void; selectedCandidates?: string[] }) {
  const studio = useStudio((snapshot) => ({ candidates: snapshot.fixtures.candidates, qualificationRows: snapshot.fixtures.qualificationRows, readyCandidateIds: snapshot.fixtures.readyCandidateIds, addDataset: snapshot.auth.addDataset }));
  const fixtures = studio;
  const [saved, setSaved] = useState(false);
  const [extended, setExtended] = useState(false);
  const selectedNames = selectedCandidates ?? fixtures.candidates.map((candidate) => candidate.name);
  const qualificationRows: TableRow[] = fixtures.qualificationRows.map((row) => ({ id: row.id, cells: [row.name, ...row.verdicts.map((verdict, index) => <Status key={`${row.id}-${index}`} tone={verdict === 'Unresolved' ? 'warning' : verdict === 'Not supported' ? 'danger' : 'success'}>{verdict}</Status>)] }));
  const readyCandidateIds = new Set(fixtures.readyCandidateIds);
  const selectedRows = qualificationRows.filter((row) => selectedNames.includes(String(row.cells[0])));
  const readyRows = selectedRows.filter((row) => readyCandidateIds.has(row.id));
  const candidateParam = readyRows.map((row) => row.id).join(',');

  function saveCandidates() {
    studio.addDataset({ id: 'qualified-candidates', version: 'DATASET · V1', title: 'Qualified candidates', detail: `${readyRows.length} records · qualification evidence retained`, status: 'Validated', tone: 'success', href: '/datasets/qualified-candidates', recordCount: readyRows.length, fields: ['Company', 'Qualification'], lastUpdated: 'Just now', updatedAt: Date.now(), unresolvedCount: 0, sourceWorkflow: 'Company qualification', records: readyRows.map((row) => ({ id: row.id, values: { Company: String(row.cells[0]), Qualification: 'Qualified' }, evidence: { Qualification: { sourceUrl: `https://${row.id}.example`, quote: 'Qualification criteria supported by retained public evidence.' } } })) });
    setSaved(true);
  }

  return <>{showHeader ? <PageHead group="Discovery" title="Qualifications" description="Criterion verdicts with evidence; unresolved is never rejection." /> : null}<TablePanel title="Selected candidates" headings={['Candidate', 'EU presence', 'Wholesale', 'Contact published']} rows={selectedRows} />{extended ? <p className="review-feedback" role="status">Search extended · 18 more candidates queued for qualification.</p> : null}<div className="page-action-row"><span>{readyRows.length} candidate{readyRows.length === 1 ? '' : 's'} {readyRows.length === 1 ? 'is' : 'are'} ready for a follow-up workflow.</span>{onBack ? <Button variant="secondary" onClick={onBack}>Back to candidates</Button> : <Button variant="secondary" asChild><Link href="/search?tab=companies">Back to candidates</Link></Button>}<Button variant="secondary" disabled={extended} onClick={() => setExtended(true)}>{extended ? 'Search extended' : 'Extend search'}</Button>{readyRows.length ? <Button variant="secondary" disabled={saved} onClick={saveCandidates}>{saved ? 'Saved to dataset' : 'Save qualified candidates'}</Button> : null}{readyRows.length ? <Button variant="primary" asChild><Link href={`/build?template=discover&input=prior&candidates=${candidateParam}`}>Use qualified candidates</Link></Button> : <Button variant="primary" disabled>Use qualified candidates</Button>}</div></>;
}
