'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, ChevronLeft, ChevronRight, Database, FileText, Globe2, Hand, ListFilter, Sparkles, Tags, X } from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, Eyebrow, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger, Textarea } from '@/components/design-system';
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
type ComposerTool = 'Sources' | 'Browser actions' | 'Fields' | 'Limits' | 'Rules' | 'Improve prompt';

const templateFields: Record<WorkflowTemplateKey, string> = {
  compare: 'retailer, product, price',
  research: 'company, pricing_url, starting_price, free_plan, free_trial, plan_details',
  extract: 'product_name, price, availability, url',
  collect: 'product_name, price, availability, url',
  discover: 'company, location, product_categories, minimum_order',
  monitor: 'price, availability',
};

function ToolSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (value: string) => void; options: string[] }) {
  return <label className="tool-field"><span>{label}</span><Select value={value} onValueChange={onValueChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem value={option} key={option}>{option}</SelectItem>)}</SelectContent></Select></label>;
}

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
  const initialInput: InputMethod = searchParams.get('input') === 'prior' ? 'research' : 'urls';
  return <WorkflowComposerContent key={`${initialTemplate}-${initialInput}`} initialTemplate={initialTemplate} initialInput={initialInput} />;
}

function WorkflowComposerContent({ initialTemplate, initialInput }: { initialTemplate: WorkflowTemplateKey; initialInput: InputMethod }) {
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState(initialInput === 'research' ? 'guided' : 'prompt');
  const [selected, setSelected] = useState<WorkflowTemplateKey>(initialTemplate);
  const [prompt, setPrompt] = useState<string>(workflowTemplates[initialTemplate].text);
  const [sources, setSources] = useState<string>(workflowTemplates[initialTemplate].sourceUrls.join('\n'));
  const [inputMethod, setInputMethod] = useState<InputMethod>(initialInput);
  const [sourcePulse, setSourcePulse] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ComposerTool | null>(null);
  const [fields, setFields] = useState(templateFields[initialTemplate]);
  const [access, setAccess] = useState('Approved public sources');
  const [downloads, setDownloads] = useState('Block downloads');
  const [region, setRegion] = useState('Automatic');
  const [missingData, setMissingData] = useState('Use null; never invent');
  const [evidence, setEvidence] = useState('Source quote per value');
  const [deduplication, setDeduplication] = useState('Canonical URL + primary key');
  const [validation, setValidation] = useState('Require type match');
  const [maxPages, setMaxPages] = useState('3');
  const [maxRecords, setMaxRecords] = useState('10');
  const [timeout, setTimeoutValue] = useState('5 minutes');
  const [datasetSelection, setDatasetSelection] = useState('Competitor prices · v4');
  const [runtimeKey, setRuntimeKey] = useState('product_url');
  const [discoveryQuery, setDiscoveryQuery] = useState('Official pricing pages for the supplied companies');
  const [researchSet, setResearchSet] = useState('SaaS pricing research · 74 records');
  const template = useMemo(() => workflowTemplates[selected], [selected]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('studio:workflow-title', { detail: template.title }));
  }, [template.title]);
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
    setFields(templateFields[key]);
    setInputMethod('urls');
    setActiveTool(null);
    setSourcePulse(true);
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  function chooseInputMethod(method: InputMethod) {
    setInputMethod(method);
    setSourcePulse(false);
    requestAnimationFrame(() => setSourcePulse(true));
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  const sourceCount = useMemo(() => new Set(sources.split('\n').map((source) => source.trim()).filter(Boolean)).size, [sources]);
  const fieldCount = useMemo(() => fields.split(',').map((field) => field.trim()).filter(Boolean).length, [fields]);
  const urlSourceLabel = `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`;
  const guidedSourceLabel = inputMethod === 'urls'
    ? urlSourceLabel
    : inputMethod === 'csv'
      ? 'CSV · 120 rows'
      : inputMethod === 'dataset'
        ? 'Dataset · Competitor prices'
        : inputMethod === 'runtime'
          ? 'Inputs at runtime'
          : inputMethod === 'discover'
            ? 'Discover sources'
            : 'Prior research · 74 records';
  const sourceLabel = mode === 'prompt' ? urlSourceLabel : guidedSourceLabel;
  const improvedPrompt = prompt.trim()
    ? `${prompt.trim().replace(/[.\s]+$/, '')}. Return only supported values and retain a source quote for every field.`
    : `Compare the current price and availability of the Trailhead 2P Tent. Return one supported record per retailer.`;

  function toggleTool(tool: ComposerTool) {
    setActiveTool((current) => current === tool ? null : tool);
  }

  function acceptRewrite() {
    setPrompt(improvedPrompt);
    setActiveTool(null);
  }

  const guidedInputDetail = inputMethod === 'urls'
    ? <label className="guided-field"><strong>Source URLs</strong><textarea value={sources} onChange={(event) => setSources(event.target.value)} aria-label="Source URLs" /><small>Paste up to 50 public HTTPS URLs or domains, one per line.</small></label>
    : inputMethod === 'csv'
      ? <section className="guided-source-card"><div><Eyebrow>CSV input</Eyebrow><strong>Upload a bounded list of source records</strong><p>Map a URL or domain column after the file is selected.</p></div><Input type="file" accept=".csv,text/csv" aria-label="Upload CSV" /></section>
      : inputMethod === 'dataset'
        ? <section className="guided-source-card"><div><Eyebrow>Existing dataset</Eyebrow><strong>Use rows from a Studio dataset</strong><p>The selected dataset remains unchanged.</p></div><ToolSelect label="Dataset" value={datasetSelection} onValueChange={setDatasetSelection} options={['Competitor prices · v4','Outdoor catalogue · v12','MAP watch · v7']} /></section>
        : inputMethod === 'runtime'
          ? <section className="guided-source-card"><div><Eyebrow>Runtime input</Eyebrow><strong>Accept values when the workflow is called</strong><p>Studio will validate this required input before a run starts.</p></div><label className="tool-field"><span>Input key</span><Input value={runtimeKey} onChange={(event) => setRuntimeKey(event.target.value)} aria-label="Runtime input key" /></label></section>
          : inputMethod === 'discover'
            ? <section className="guided-source-card"><div><Eyebrow>Live discovery</Eyebrow><strong>Let Studio find candidate sources</strong><p>Discovered domains are shown in the plan before anything runs.</p></div><label className="tool-field"><span>Discovery query</span><Input value={discoveryQuery} onChange={(event) => setDiscoveryQuery(event.target.value)} aria-label="Discovery query" /></label></section>
            : <section className="guided-source-card"><div><Eyebrow>Prior research</Eyebrow><strong>Continue from reviewed research</strong><p>74 retained records · 6 fields · evidence available</p></div><ToolSelect label="Research set" value={researchSet} onValueChange={setResearchSet} options={['SaaS pricing research · 74 records','Retailer coverage study · 128 records','Supplier discovery · 42 records']} /></section>;

  const stepper = <div className="stepper" aria-label="Workflow progress">
    {['Describe', 'Review plan', 'Watch run', 'Review data'].map((label, index) => <div className="step-segment" key={label}><Button variant="ghost" className={index === stage ? 'step active' : index < stage ? 'step done' : 'step'} onClick={() => index <= stage && setStage(index)} disabled={index > stage}><i>{index < stage ? '✓' : index + 1}</i>{label}</Button>{index < 3 ? <i className="step-line" /> : null}</div>)}
  </div>;
  const runId = selected === 'research' ? 'run_batch_91af' : selected === 'collect' ? 'run_collect' : selected === 'discover' ? 'run_discover' : selected === 'extract' ? 'run_extract' : selected === 'monitor' ? 'run_monitor' : 'run_7f3a';

  if (stage === 1) return <>{stepper}<section className="workflow-stage"><header className="stage-head"><div><Eyebrow>Review plan</Eyebrow><h1>Confirm what Studio will do.</h1><p>Review the sources, browser work and output before anything runs.</p></div><Badge tone="info">{template.type}</Badge></header><div className="plan-grid"><article className="panel plan-steps"><div className="section-head"><h2>Plan</h2><span>{sourceLabel}</span></div><ol><li><span>1</span><div><strong>Open approved sources</strong><p>Visit only the supplied URLs and retain each final URL.</p></div></li><li><span>2</span><div><strong>Inspect the relevant content</strong><p>Read product, pricing or directory content required by the request.</p></div></li><li><span>3</span><div><strong>Return supported records</strong><p>Produce {fieldCount} fields with a source quote for every supported value.</p></div></li></ol></article><aside className="panel plan-contract"><div className="section-head"><h2>Run contract</h2></div><dl className="detail-list"><div><dt>Workflow</dt><dd>{template.type}</dd></div><div><dt>Sources</dt><dd>{sourceLabel}</dd></div><div><dt>Fields</dt><dd>{fieldCount}</dd></div><div><dt>Missing data</dt><dd>{missingData}</dd></div><div><dt>Evidence</dt><dd>{evidence}</dd></div></dl></aside></div><div className="stage-actions"><Button variant="secondary" onClick={() => setStage(0)}>Back to describe</Button><Button variant="primary" onClick={() => setStage(2)}>Approve and run →</Button></div></section></>;

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
          <Tabs value={mode} onValueChange={(value) => { setMode(value); setActiveTool(null); }}>
            <TabsList><TabsTrigger value="prompt">Full prompt</TabsTrigger><TabsTrigger value="guided">Guided setup</TabsTrigger></TabsList>
          </Tabs>
          <div className={mode === 'prompt' ? 'composer prompt-mode' : 'composer guided-mode'}>
            {mode === 'prompt' ? <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Workflow request" placeholder="e.g. Compare the price and availability of the Trailhead 2P Tent on these retailer pages. Return one row per seller with the source quote." /> : <div className="guided-composer"><section className="input-method-panel"><strong>How will you provide inputs?</strong><div className="input-methods" role="tablist" aria-label="Input method">{inputMethods.map(([key,label]) => <Button variant="secondary" size="sm" role="tab" aria-selected={inputMethod === key} className={inputMethod === key ? 'input-method-button active' : 'input-method-button'} onClick={() => chooseInputMethod(key)} key={key}>{label}</Button>)}</div><p>{inputMethod === 'urls' ? `${sourceCount} valid inputs · 0 duplicates · 0 invalid` : guidedSourceLabel}</p></section><div className="guided-input-detail">{guidedInputDetail}</div><label className="guided-field"><strong>What do you want to know?</strong><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Guided workflow request" /></label></div>}
            {mode === 'prompt' ? <div className="composer-tools"><div className="composer-tool-list">
              {([
                ['Sources', Globe2],
                ['Browser actions', Hand],
                ['Fields', Database],
                ['Limits', ListFilter],
                ['Rules', FileText],
                ['Improve prompt', Sparkles],
              ] as const).map(([tool, Icon]) => <Button variant="ghost" size="sm" className={`${activeTool === tool ? 'active ' : ''}${tool === 'Improve prompt' ? 'improve-tool' : ''}`.trim()} aria-label={tool} title={tool} aria-expanded={activeTool === tool} aria-controls="workflow-tool-panel" onClick={() => toggleTool(tool)} key={tool}><Icon size={16} /><span>{tool}</span></Button>)}
            </div><div className="composer-submit">{prompt.trim() ? <span className="keyboard-hint">⌘↵ to plan</span> : null}<Button variant="primary" className="send" aria-label="Plan workflow" title={prompt.trim() || sourceCount ? 'Plan workflow' : 'Add a source or say what to find'} disabled={!prompt.trim() && sourceCount === 0} onClick={() => setStage(1)}><ArrowUp size={17} /></Button></div></div> : null}
            {mode === 'prompt' && activeTool ? <section className="composer-tool-panel" id="workflow-tool-panel" aria-labelledby="workflow-tool-title">
              <header><div><h2 id="workflow-tool-title">{activeTool}</h2><p>{activeTool === 'Sources' ? 'Add public HTTPS URLs or domains, one per line.' : activeTool === 'Browser actions' ? 'Choose how Studio may navigate the public web.' : activeTool === 'Fields' ? 'Make the expected output explicit.' : activeTool === 'Limits' ? 'Bound browser work before the plan is approved.' : activeTool === 'Rules' ? 'Set evidence and missing-data behavior.' : 'Review the proposed rewrite before changing your draft.'}</p></div><Button variant="ghost" size="icon" aria-label={`Close ${activeTool}`} onClick={() => setActiveTool(null)}><X size={16} /></Button></header>
              {activeTool === 'Sources' ? <label className="tool-field tool-field-wide"><span>Sources</span><Textarea value={sources} onChange={(event) => setSources(event.target.value)} aria-label="Sources" /></label> : null}
              {activeTool === 'Browser actions' ? <div className="tool-grid"><ToolSelect label="Access" value={access} onValueChange={setAccess} options={['Approved public sources','Public web discovery','Approved domains only']} /><ToolSelect label="Downloads" value={downloads} onValueChange={setDownloads} options={['Block downloads','Allow documents','Allow all downloads']} /><ToolSelect label="Region" value={region} onValueChange={setRegion} options={['Automatic','Europe','United States']} /></div> : null}
              {activeTool === 'Fields' ? <div className="tool-grid"><label className="tool-field tool-field-span-2"><span>Output fields</span><Input value={fields} onChange={(event) => setFields(event.target.value)} aria-label="Output fields" /></label><ToolSelect label="Missing values" value={missingData} onValueChange={setMissingData} options={['Use null; never invent','Omit missing fields','Send to review']} /><ToolSelect label="Validation" value={validation} onValueChange={setValidation} options={['Require type match','Coerce safe values','Review mismatches']} /></div> : null}
              {activeTool === 'Limits' ? <div className="tool-grid"><label className="tool-field"><span>Maximum pages</span><Input type="number" min="1" value={maxPages} onChange={(event) => setMaxPages(event.target.value)} /></label><label className="tool-field"><span>Maximum records</span><Input type="number" min="1" value={maxRecords} onChange={(event) => setMaxRecords(event.target.value)} /></label><ToolSelect label="Timeout" value={timeout} onValueChange={setTimeoutValue} options={['2 minutes','5 minutes','15 minutes']} /></div> : null}
              {activeTool === 'Rules' ? <div className="tool-grid"><ToolSelect label="Missing data" value={missingData} onValueChange={setMissingData} options={['Use null; never invent','Omit missing fields','Send to review']} /><ToolSelect label="Evidence" value={evidence} onValueChange={setEvidence} options={['Source quote per value','Page evidence per record','No evidence required']} /><ToolSelect label="Deduplication" value={deduplication} onValueChange={setDeduplication} options={['Canonical URL + primary key','Canonical URL only','Keep every result']} /></div> : null}
              {activeTool === 'Improve prompt' ? <div className="prompt-rewrite"><div className="prompt-rewrite-diff"><del>{prompt.trim() || 'No complete prompt yet.'}</del><ins>{improvedPrompt}</ins></div><div className="prompt-rewrite-actions"><Button variant="secondary" onClick={() => setActiveTool(null)}>Undo</Button><Button variant="primary" onClick={acceptRewrite}>Accept rewrite</Button></div></div> : null}
            </section> : null}
          </div>
          <div className="understood"><strong>STUDIO UNDERSTOOD</strong><Badge tone="info">{template.type}</Badge><span className={sourcePulse ? 'source-chip pulse' : 'source-chip'}><Badge tone="success">{sourceLabel}</Badge></span><Badge tone="success">{fieldCount} fields</Badge><Badge tone="success">{evidence}</Badge><Badge tone="success">{missingData}</Badge><Badge tone="warning">{maxPages ? `Capped at ${maxPages} pages` : 'No page limit set'}</Badge></div>
          <div className="builder-foot"><span>Nothing runs until you approve the plan.</span><span>Local mockup only · no extraction is submitted</span>{mode === 'guided' ? <Button variant="primary" onClick={() => setStage(1)}>Plan workflow →</Button> : null}</div>
        </div>
        {templatesOpen ? <aside className="templates"><div className="templates-head"><p>Start from</p><Button variant="ghost" size="icon" onClick={() => setTemplateVisibility(false)} aria-label="Hide templates" title="Hide templates"><ChevronRight size={15}/></Button></div>
          {visibleStarterKeys.map((key) => {
            const item = workflowTemplates[key];
            const Icon = key === 'research' ? Globe2 : key === 'extract' ? Tags : key === 'collect' ? Database : ListFilter;
            return <Button variant="secondary" className={selected === key ? 'template-pill active' : 'template-pill'} onClick={() => applyTemplate(key)} key={key}><Icon size={14} style={{display:'inline',marginRight:8}} />{item.label}</Button>;
          })}
          <Dialog open={templateBrowserOpen} onOpenChange={setTemplateBrowserOpen}>
            <DialogTrigger asChild><Button variant="ghost" className="template-pill" style={{border:0,color:'var(--io-color-link)'}}>Browse all templates →</Button></DialogTrigger>
            <DialogContent className="template-browser-dialog">
              <DialogHeader><DialogTitle>Browse workflow templates</DialogTitle><DialogDescription>Choose a starting point. Studio will insert its request, sources, fields and rules into this builder.</DialogDescription></DialogHeader>
              <div className="template-browser-grid">
                {(Object.keys(workflowTemplates) as WorkflowTemplateKey[]).map((key) => {
                  const item = workflowTemplates[key];
                  return <Button variant="secondary" className={selected === key ? 'template-browser-option active' : 'template-browser-option'} onClick={() => { applyTemplate(key); setTemplateBrowserOpen(false); }} key={key}><span><Eyebrow>{item.type}</Eyebrow><strong>{item.label}</strong><small>{item.description}</small></span><span aria-hidden="true">→</span></Button>;
                })}
              </div>
            </DialogContent>
          </Dialog>
        </aside> : <aside className="templates-closed"><Button variant="secondary" onClick={() => setTemplateVisibility(true)} aria-label="Show templates" title="Show templates"><ChevronLeft size={14}/> Templates</Button></aside>}
      </div>
    </>
  );
}
