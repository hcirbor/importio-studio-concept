'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, ChevronLeft, ChevronRight, Database, FileText, Globe2, Hand, ListFilter, Sparkles, Tags } from 'lucide-react';
import { Badge, Button, Eyebrow, Tabs, TabsList, TabsTrigger } from '@/components/design-system';
import { resolveWorkflowTemplate, visibleStarterKeys, workflowTemplates, type WorkflowTemplateKey } from './workflow-config';
import { RunSession } from './run-session';
import { DatasetReview } from './dataset-review';

const inputMethods = [
  ['urls', 'Paste URLs or domains'],
  ['csv', 'Upload CSV'],
  ['dataset', 'Existing dataset'],
  ['runtime', 'API at runtime'],
  ['discover', 'Discover live web'],
  ['research', 'Prior research'],
] as const;

type InputMethod = typeof inputMethods[number][0];

const reviewFixtures: Partial<Record<WorkflowTemplateKey, { headings: string[]; rows: string[][] }>> = {
  research: { headings: ['Company', 'Pricing URL', 'Starting price', 'Free plan', 'Evidence'], rows: [['HubSpot', 'hubspot.com/pricing', '$20 / month', 'Yes', 'Supported · plan card'], ['Mailchimp', 'mailchimp.com/pricing', '$13 / month', 'Yes', 'Supported · pricing page'], ['Brevo', 'brevo.com/pricing', 'Pending input', '—', 'Cookie decision required']] },
  collect: { headings: ['Product', 'Price', 'Availability', 'URL', 'Evidence'], rows: [['Summit Solo Tent', '€179', 'In stock', '/tents/summit-solo', 'Supported · page 1'], ['Trailhead 2P Tent', '€249', 'In stock', '/tents/trailhead-2p', 'Supported · page 2'], ['Basecamp 4 Tent', '€399', 'Low stock', '/tents/basecamp-4', 'Supported · page 2']] },
  extract: { headings: ['Product', 'Price', 'Availability', 'URL', 'Evidence'], rows: [['Trailhead 2P Tent', '€249', 'In stock', '/tents/trailhead-2p', 'Supported · product page']] },
  discover: { headings: ['Company', 'Location', 'Categories', 'Minimum order', 'Evidence'], rows: [['Northwind Trade', 'Rotterdam', 'Tents, packs', '€500', 'Supported · directory'], ['Summit Supply Europe', 'Lyon', 'Camping equipment', '€750', 'Supported · detail page'], ['Alpine Trade', 'Innsbruck', 'Outdoor equipment', '€400', 'Supported · detail page']] },
  monitor: { headings: ['Field', 'Baseline', 'Status', 'Source', 'Evidence'], rows: [['Price', '€249', 'Baseline saved', 'northwind-outdoors.example', 'Supported · product page'], ['Availability', 'In stock', 'Baseline saved', 'northwind-outdoors.example', 'Supported · product page']] },
};

function ScenarioReview({ scenario }: { scenario: WorkflowTemplateKey }) {
  const [feedback, setFeedback] = useState('');
  if (scenario === 'compare') return <DatasetReview />;
  const fixture = reviewFixtures[scenario] ?? reviewFixtures.collect!;
  const exportRows = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(fixture.rows, null, 2)], {type:'application/json'})); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${scenario}-preview.json`; anchor.click(); URL.revokeObjectURL(url); setFeedback('Preview exported as JSON.'); };
  return <section className="panel scenario-review"><div className="review-summary"><span>PREVIEW COMPLETE</span><strong>{fixture.rows.length} supported {fixture.rows.length === 1 ? 'record' : 'records'} ready to review.</strong></div>{feedback ? <p className="review-feedback" role="status">{feedback}</p> : null}<div className="table-scroll"><table className="data-table"><thead><tr>{fixture.headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{fixture.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div><footer className="review-footer"><span>Evidence retained with every supported value</span><Button variant="secondary" onClick={exportRows}>Export JSON</Button><Button variant="primary" onClick={() => setFeedback('Dataset saved to the Studio workspace.')}>Save dataset</Button></footer></section>;
}

export function WorkflowComposer() {
  const searchParams = useSearchParams();
  const initialTemplate = resolveWorkflowTemplate(searchParams.get('template'));
  return <WorkflowComposerContent key={initialTemplate} initialTemplate={initialTemplate} />;
}

function WorkflowComposerContent({ initialTemplate }: { initialTemplate: WorkflowTemplateKey }) {
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState('prompt');
  const [selected, setSelected] = useState<WorkflowTemplateKey>(initialTemplate);
  const [prompt, setPrompt] = useState<string>(workflowTemplates[initialTemplate].text);
  const [sources, setSources] = useState<string>(workflowTemplates[initialTemplate].sourceUrls.join('\n'));
  const [inputMethod, setInputMethod] = useState<InputMethod>('urls');
  const [sourcePulse, setSourcePulse] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [activeTool, setActiveTool] = useState('');
  const template = useMemo(() => workflowTemplates[selected], [selected]);
  useEffect(() => {
    const timer = window.setTimeout(() => setTemplatesOpen(sessionStorage.getItem('studio-templates-open') !== 'false'), 0);
    return () => window.clearTimeout(timer);
  }, []);
  function setTemplateVisibility(open: boolean) {
    setTemplatesOpen(open);
    sessionStorage.setItem('studio-templates-open', String(open));
  }
  function applyTemplate(key: WorkflowTemplateKey) {
    setSelected(key);
    setPrompt(workflowTemplates[key].text);
    setSources(workflowTemplates[key].sourceUrls.join('\n'));
    setInputMethod('urls');
    setSourcePulse(true);
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  function chooseInputMethod(method: InputMethod) {
    setInputMethod(method);
    setSourcePulse(false);
    requestAnimationFrame(() => setSourcePulse(true));
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  const sourceLabel = inputMethod === 'urls'
    ? `${template.sources} ${template.sources === 1 ? 'source' : 'sources'}`
    : inputMethod === 'csv'
      ? 'CSV · 120 rows'
      : inputMethod === 'dataset'
        ? 'Dataset · Competitor prices'
        : inputMethod === 'runtime'
          ? 'Inputs at runtime'
          : inputMethod === 'discover'
            ? 'Discover sources'
            : 'Prior research · 74 records';

  const stepper = <div className="stepper" aria-label="Workflow progress">
    {['Describe', 'Review plan', 'Watch run', 'Review data'].map((label, index) => <div className="step-segment" key={label}><Button variant="ghost" className={index === stage ? 'step active' : index < stage ? 'step done' : 'step'} onClick={() => index <= stage && setStage(index)} disabled={index > stage}><i>{index < stage ? '✓' : index + 1}</i>{label}</Button>{index < 3 ? <i className="step-line" /> : null}</div>)}
  </div>;
  const runId = selected === 'research' ? 'run_batch_91af' : selected === 'collect' ? 'run_collect' : selected === 'discover' ? 'run_discover' : selected === 'extract' ? 'run_extract' : selected === 'monitor' ? 'run_monitor' : 'run_7f3a';

  if (stage === 1) return <>{stepper}<section className="workflow-stage"><header className="stage-head"><div><Eyebrow>Review plan</Eyebrow><h1>Confirm what Studio will do.</h1><p>Review the sources, browser work and output before anything runs.</p></div><Badge tone="info">{template.type}</Badge></header><div className="plan-grid"><article className="panel plan-steps"><div className="section-head"><h2>Plan</h2><span>{template.sources} sources</span></div><ol><li><span>1</span><div><strong>Open approved sources</strong><p>Visit only the supplied URLs and retain each final URL.</p></div></li><li><span>2</span><div><strong>Inspect the relevant content</strong><p>Read product, pricing or directory content required by the request.</p></div></li><li><span>3</span><div><strong>Return supported records</strong><p>Produce {template.fields} fields with a source quote for every supported value.</p></div></li></ol></article><aside className="panel plan-contract"><div className="section-head"><h2>Run contract</h2></div><dl className="detail-list"><div><dt>Workflow</dt><dd>{template.type}</dd></div><div><dt>Sources</dt><dd>{sourceLabel}</dd></div><div><dt>Fields</dt><dd>{template.fields}</dd></div><div><dt>Missing data</dt><dd>Use null; never invent</dd></div><div><dt>Evidence</dt><dd>Source quote per value</dd></div></dl></aside></div><div className="stage-actions"><Button variant="secondary" onClick={() => setStage(0)}>Back to describe</Button><Button variant="primary" onClick={() => setStage(2)}>Approve and run →</Button></div></section></>;

  if (stage === 2) return <>{stepper}<section className="workflow-stage"><header className="stage-head"><div><Eyebrow>Watch run</Eyebrow><h1>{selected === 'research' ? `${template.type} is working through the approved sources.` : `${template.type} run complete.`}</h1><p>{selected === 'research' ? 'Follow each worker, replay captured steps and resolve input when needed.' : 'Replay every captured step, then inspect the records and retained evidence.'}</p></div><Badge tone={selected === 'research' ? 'info' : 'success'}>{selected === 'research' ? 'Running' : 'Completed'}</Badge></header><RunSession runId={runId} /><div className="stage-actions"><Button variant="secondary" onClick={() => setStage(1)}>Review plan</Button><Button variant="primary" onClick={() => setStage(3)}>Review data →</Button></div></section></>;

  if (stage === 3) return <>{stepper}<section className="workflow-stage"><header className="stage-head"><div><Eyebrow>Review data</Eyebrow><h1>Check the records and their evidence.</h1><p>Every supported value stays linked to the page and capture it came from.</p></div><Badge tone={selected === 'compare' || selected === 'research' ? 'warning' : 'success'}>{selected === 'compare' || selected === 'research' ? '1 field needs review' : 'Ready to save'}</Badge></header><ScenarioReview scenario={selected} /><div className="stage-actions"><Button variant="secondary" onClick={() => setStage(2)}>Back to run</Button><Button variant="primary" asChild><Link href="/datasets/competitor-prices">Open saved dataset</Link></Button></div></section></>;

  return (
    <>
      {stepper}
      <header className="builder-hero">
        <Eyebrow>New workflow</Eyebrow>
        <h1>What should Import.io do?</h1>
        <p>Describe the outcome. Studio plans the web work, then shows you the evidence.</p>
      </header>
      <div className={templatesOpen ? 'builder-layout' : 'builder-layout templates-collapsed'}>
        <div className="builder-main">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList><TabsTrigger value="prompt">Full prompt</TabsTrigger><TabsTrigger value="guided">Guided setup</TabsTrigger></TabsList>
          </Tabs>
          <div className={mode === 'prompt' ? 'composer prompt-mode' : 'composer guided-mode'}>
            {mode === 'prompt' ? <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Workflow request" placeholder="e.g. Compare the price and availability of the Trailhead 2P Tent on these retailer pages. Return one row per seller with the source quote." /> : <div className="guided-composer"><section className="input-method-panel"><strong>How will you provide inputs?</strong><div className="input-methods" role="tablist" aria-label="Input method">{inputMethods.map(([key,label]) => <Button variant="secondary" size="sm" role="tab" aria-selected={inputMethod === key} className={inputMethod === key ? 'active' : ''} onClick={() => chooseInputMethod(key)} key={key}>{label}</Button>)}</div><p>{inputMethod === 'urls' ? `${sources.split('\n').filter(Boolean).length} valid inputs · 0 duplicates · 0 invalid` : sourceLabel}</p></section>{inputMethod === 'urls' ? <label className="guided-field"><strong>Source URLs</strong><textarea value={sources} onChange={(event) => setSources(event.target.value)} aria-label="Source URLs" /><small>Paste up to 50 public HTTPS URLs or domains, one per line.</small></label> : null}<label className="guided-field"><strong>What do you want to know?</strong><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Guided workflow request" /></label></div>}
            {activeTool ? <p className="builder-tool-feedback" role="status">{activeTool} settings selected. This panel uses the current guided values.</p> : null}<div className="composer-tools"><div className="composer-tool-list"><Button variant="ghost" size="sm" onClick={() => setActiveTool('Sources')}><Globe2 size={16} /> Sources</Button><Button variant="ghost" size="sm" onClick={() => setActiveTool('Browser actions')}><Hand size={16} /> Browser actions</Button><Button variant="ghost" size="sm" onClick={() => setActiveTool('Fields')}><Database size={16} /> Fields</Button><Button variant="ghost" size="sm" onClick={() => setActiveTool('Limits')}><ListFilter size={16} /> Limits</Button><Button variant="ghost" size="sm" onClick={() => setActiveTool('Rules')}><FileText size={16} /> Rules</Button><Button variant="ghost" size="sm" onClick={() => { setPrompt((current) => current.trim()); setActiveTool('Prompt improvement'); }}><Sparkles size={16} /> Improve prompt</Button></div><div className="composer-submit">{prompt.trim() ? <span className="keyboard-hint">⌘↵ to plan</span> : null}<Button variant="primary" className="send" aria-label="Plan workflow" onClick={() => setStage(1)}><ArrowUp size={17} /></Button></div></div>
          </div>
          <div className="understood"><strong>STUDIO UNDERSTOOD</strong><Badge tone="info">{template.type}</Badge><span className={sourcePulse ? 'source-chip pulse' : 'source-chip'}><Badge tone="success">{sourceLabel}</Badge></span><Badge tone="success">{template.fields} fields</Badge><Badge tone="success">Source quote per value</Badge><Badge tone="success">Unknowns allowed</Badge></div>
          <div className="builder-foot"><span>Nothing runs until you approve the plan.</span><span>Local mockup only · no extraction is submitted</span>{mode === 'guided' ? <Button variant="primary" onClick={() => setStage(1)}>Plan workflow →</Button> : null}</div>
        </div>
        {templatesOpen ? <aside className="templates"><div className="templates-head"><p>Start from</p><Button variant="ghost" size="icon" onClick={() => setTemplateVisibility(false)} aria-label="Hide templates" title="Hide templates"><ChevronRight size={15}/></Button></div>
          {visibleStarterKeys.map((key) => {
            const item = workflowTemplates[key];
            const Icon = key === 'research' ? Globe2 : key === 'extract' ? Tags : key === 'collect' ? Database : ListFilter;
            return <Button variant="secondary" className={selected === key ? 'template-pill active' : 'template-pill'} onClick={() => applyTemplate(key)} key={key}><Icon size={14} style={{display:'inline',marginRight:8}} />{item.label}</Button>;
          })}
          <Button variant="ghost" className="template-pill" style={{border:0,color:'var(--io-color-link)'}} onClick={() => setActiveTool('Template library')}>Browse all templates →</Button>
        </aside> : <aside className="templates-closed"><Button variant="secondary" onClick={() => setTemplateVisibility(true)} aria-label="Show templates" title="Show templates"><ChevronLeft size={14}/> Templates</Button></aside>}
      </div>
    </>
  );
}
