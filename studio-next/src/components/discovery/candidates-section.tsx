'use client';

import { useState } from 'react';
import { Button, Eyebrow, Input } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { Feedback, PageHead, SelectField } from '../workspace/shared';
import { QualifySection } from './qualify-section';
import { useQualificationView } from './use-qualification-view';

export function CandidatesSection({ showHeader = true }: { showHeader?: boolean }) {
  const candidates = useStudio((snapshot) => snapshot.fixtures.candidates);
  const [entityType, setEntityType] = useState('Supplier');
  const [query, setQuery] = useState('European outdoor equipment suppliers');
  const [limit, setLimit] = useState('6');
  const [conditions, setConditions] = useState(['EU presence', 'Wholesale']);
  const [newCondition, setNewCondition] = useState('');
  const [selected, setSelected] = useState(candidates.map((candidate) => candidate.name));
  const [expandedEvidence, setExpandedEvidence] = useState<string>();
  const [message, setMessage] = useState('');
  const { showQualifications, setQualificationView } = useQualificationView();
  const estimatedMatches = Math.max(6, conditions.length * 18);

  function addCondition() {
    const condition = newCondition.trim();
    if (!condition || conditions.includes(condition)) return;
    setConditions((current) => [...current, condition]); setNewCondition('');
  }
  function toggleCandidate(name: string) { setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]); }

  return <>{showHeader ? <PageHead group="Build" title="Companies" description="Discover first; qualify selected candidates separately." /> : null}<section className="panel candidate-builder"><div className="form-grid"><label>ENTITY TYPE<SelectField label="Entity type" value={entityType} onValueChange={setEntityType} options={['Supplier', 'Company', 'Product'].map((value) => ({ value, label: value }))} /></label><label>QUERY<Input value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>LIMIT<Input type="number" value={limit} onChange={(event) => setLimit(event.target.value)} /></label></div><div><Eyebrow>Match conditions</Eyebrow><div className="condition-row">{conditions.map((condition) => <Button key={condition} className="chip-button" variant="ghost" size="sm" onClick={() => setConditions((current) => current.filter((item) => item !== condition))} aria-label={`Remove ${condition}`}>{condition} ×</Button>)}<Input value={newCondition} onChange={(event) => setNewCondition(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addCondition()} placeholder="Add condition" /><Button variant="secondary" size="sm" onClick={addCondition}>Add</Button></div></div><div className="panel-actions"><span><strong>{estimatedMatches}</strong> estimated matches</span><Button variant="secondary" onClick={() => setMessage(`Preview: ${estimatedMatches} ${entityType.toLowerCase()} matches for “${query}”.`)}>Preview count</Button><Button variant="primary" onClick={() => setMessage(`Discovery complete. Showing the top ${Math.min(Number(limit) || 6, candidates.length)} candidates.`)}>Discover</Button></div></section><Feedback tone="info">{message}</Feedback><section className="candidate-grid">{candidates.map((candidate) => <article className="panel candidate-card" key={candidate.name}><input type="checkbox" checked={selected.includes(candidate.name)} onChange={() => toggleCandidate(candidate.name)} aria-label={`Select ${candidate.name}`} /><div><Eyebrow>Unqualified candidate</Eyebrow><h2>{candidate.name}</h2><p>{candidate.domain} · {candidate.detail}</p>{expandedEvidence === candidate.name ? <p className="candidate-evidence">Directory profile, business address and wholesale catalogue retained.</p> : null}</div><Button variant="ghost" size="sm" onClick={() => setExpandedEvidence(expandedEvidence === candidate.name ? undefined : candidate.name)}>Evidence</Button></article>)}</section><div className="page-action-row"><span>{selected.length} unqualified candidate{selected.length === 1 ? '' : 's'} selected</span>{selected.length ? <Button variant="primary" onClick={() => setQualificationView(true)}>Qualify selected</Button> : <Button variant="primary" disabled>Qualify selected</Button>}</div>{showQualifications ? <QualifySection showHeader={false} selectedCandidates={selected} onBack={() => setQualificationView(false)} /> : null}</>;
}
