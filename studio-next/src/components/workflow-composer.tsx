'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Globe2,
  Hand,
  ListFilter,
  Sparkles,
  Tags,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Eyebrow,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/design-system';
import { resolveWorkflowTemplate, visibleStarterKeys, workflowTemplates, type WorkflowTemplateKey } from './workflow-config';
import { RunSession } from './run-session';
import { WorkflowScenarioReview } from './workflow-scenario-review';

const inputMethods = [
  ['urls', 'Paste URLs or domains'],
  ['csv', 'Upload CSV'],
  ['dataset', 'Existing dataset'],
  ['runtime', 'API at runtime'],
  ['discover', 'Discover live web'],
  ['research', 'Prior research'],
] as const;

type InputMethod = (typeof inputMethods)[number][0];
type ComposerTool = 'Sources' | 'Browser actions' | 'Fields' | 'Limits' | 'Rules' | 'Improve prompt';

const templateFields: Record<WorkflowTemplateKey, string> = {
  compare: 'retailer, product, price',
  research: 'company, pricing_url, starting_price, free_plan, free_trial, plan_details',
  extract: 'product_name, price, availability, url',
  collect: 'product_name, price, availability, url',
  discover: 'company, location, product_categories, minimum_order',
  monitor: 'price, availability',
};

function parseCsvRows(text: string) {
  return text.replace(/\r/g, '').split('\n').filter((line) => line.trim()).map((line) => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === ',' && !quoted) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += character;
      }
    }
    cells.push(cell.trim());
    return cells;
  });
}

function ToolSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="tool-field">
      <span>{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem value={option} key={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
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
  const [datasetColumn, setDatasetColumn] = useState('website_url');
  const [runtimeKey, setRuntimeKey] = useState('product_url');
  const [runtimeType, setRuntimeType] = useState('Array of URLs');
  const [discoveryQuery, setDiscoveryQuery] = useState('Official pricing pages for the supplied companies');
  const [discoveryEntity, setDiscoveryEntity] = useState('Company');
  const [discoveryLimit, setDiscoveryLimit] = useState('10');
  const [researchSet, setResearchSet] = useState('SaaS pricing research · 74 records');
  const [researchPolicy, setResearchPolicy] = useState('Use as leads; re-verify every fact');
  const [guidedFeedback, setGuidedFeedback] = useState('');
  const [csvFileLabel, setCsvFileLabel] = useState('');
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvColumn, setCsvColumn] = useState('');
  const [csvHeaderMode, setCsvHeaderMode] = useState('First row contains column names');
  const [csvDragging, setCsvDragging] = useState(false);
  const [researchResolved, setResearchResolved] = useState(false);
  const [datasetSaved, setDatasetSaved] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
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
    setResearchResolved(false);
    setDatasetSaved(false);
    setSourcePulse(true);
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  function chooseInputMethod(method: InputMethod) {
    setInputMethod(method);
    setGuidedFeedback('');
    setSourcePulse(false);
    requestAnimationFrame(() => setSourcePulse(true));
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  function applyCsvColumn(header: string, headers = csvHeaders, rows = csvRows) {
    setCsvColumn(header);
    const columnIndex = Math.max(0, headers.indexOf(header));
    setSources(rows.map((row) => row[columnIndex]?.trim()).filter(Boolean).join('\n'));
  }
  function configureCsv(rows: string[][], headerMode: string) {
    if (!rows.length) return;
    const rawHeaders = headerMode === 'First row contains column names'
      ? rows[0].map((header, index) => header || `Column ${index + 1}`)
      : rows[0].map((_, index) => `Column ${index + 1}`);
    const headerCounts = new Map<string, number>();
    const headers = rawHeaders.map((header) => {
      const occurrence = (headerCounts.get(header) ?? 0) + 1;
      headerCounts.set(header, occurrence);
      return occurrence === 1 ? header : `${header} (${occurrence})`;
    });
    const dataRows = headerMode === 'First row contains column names' ? rows.slice(1) : rows;
    const likelyIndex = headers.findIndex((header) => /url|domain|website/i.test(header));
    const selectedHeader = headers[likelyIndex >= 0 ? likelyIndex : 0];
    setCsvHeaderMode(headerMode);
    setCsvHeaders(headers);
    setCsvRows(dataRows);
    applyCsvColumn(selectedHeader, headers, dataRows);
  }
  async function loadCsvFile(file: File) {
    const rows = parseCsvRows(await file.text());
    setCsvFileLabel(`${file.name} · ${Math.max(1, Math.ceil(file.size / 1024))} KB`);
    setCsvRawRows(rows);
    configureCsv(rows, csvHeaderMode);
  }
  function loadSampleCsv() {
    const rows = parseCsvRows('company,website_url,category\nNorthwind Outdoors,https://northwind-outdoors.example/tents,Tents\nSummit Supply,https://summit-supply.example/camping,Camping\nTrail Shop,https://trail-shop.example/search?q=trailhead,Outdoor retail');
    setCsvFileLabel('retailer-sample.csv · sample data');
    setCsvRawRows(rows);
    configureCsv(rows, 'First row contains column names');
  }
  function useDatasetInput() {
    const sampleSources = datasetSelection.startsWith('Competitor')
      ? workflowTemplates.compare.sourceUrls
      : datasetSelection.startsWith('Outdoor')
        ? workflowTemplates.collect.sourceUrls
        : workflowTemplates.monitor.sourceUrls;
    setSources(sampleSources.join('\n'));
    setGuidedFeedback(`${datasetColumn} selected from ${datasetSelection}. Original rows will remain unchanged.`);
  }
  function addRuntimeTestValues() {
    setSources(workflowTemplates.compare.sourceUrls.join('\n'));
    setGuidedFeedback(`3 local test values added for inputs.${runtimeKey}. The saved workflow will still require ${runtimeType.toLowerCase()} at runtime.`);
  }
  function useDiscoveryInput() {
    setSources(`https://search.import.io/?q=${encodeURIComponent(discoveryQuery)}`);
    setPrompt(`Discover up to ${discoveryLimit} ${discoveryEntity.toLowerCase()} candidates for: ${discoveryQuery}. Return source URLs and supporting evidence.`);
    setGuidedFeedback(`Live-web discovery added with a ${discoveryLimit}-candidate limit. Qualification remains a separate step.`);
  }
  function usePriorResearch() {
    setSources('https://example.com/suppliers\nhttps://northwind.example\nhttps://summit.example');
    setPrompt('Revisit candidates from the selected prior research and re-verify every requested fact against live sources.');
    setGuidedFeedback(`${researchSet} added as labelled context. ${researchPolicy}.`);
  }
  const sourceCount = useMemo(() => new Set(sources.split('\n').map((source) => source.trim()).filter(Boolean)).size, [sources]);
  const fieldCount = useMemo(() => fields.split(',').map((field) => field.trim()).filter(Boolean).length, [fields]);
  const fieldNames = useMemo(() => fields.split(',').map((field) => field.trim()).filter(Boolean), [fields]);
  const sourceDomains = useMemo(() => sources.split('\n').map((source) => source.trim()).filter(Boolean).map((source) => {
    try {
      return new URL(source.includes('://') ? source : `https://${source}`).hostname;
    } catch {
      return source;
    }
  }), [sources]);
  const estimate = `${sourceCount} ${sourceCount === 1 ? 'query' : 'queries'} · ${(sourceCount * 0.6).toFixed(1)} browser minutes · estimated cost $${(sourceCount * 0.007).toFixed(2)}`;
  const urlSourceLabel = `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`;
  const guidedSourceLabel = inputMethod === 'urls'
    ? urlSourceLabel
    : inputMethod === 'csv'
      ? `CSV · ${csvRows.length || 120} rows`
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
      ? <section className="csv-input-card"><input ref={csvInputRef} className="csv-hidden-input" type="file" accept=".csv,text/csv" aria-label="Upload CSV" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadCsvFile(file); }} /><div className={csvDragging ? 'csv-drop-zone dragging' : 'csv-drop-zone'} onDragOver={(event) => { event.preventDefault(); setCsvDragging(true); }} onDragLeave={() => setCsvDragging(false)} onDrop={(event) => { event.preventDefault(); setCsvDragging(false); const file = event.dataTransfer.files?.[0]; if (file) void loadCsvFile(file); }}><div className="csv-drop-copy"><strong>{csvFileLabel || 'Drop a CSV here or choose a file'}</strong><p>Nothing is uploaded. Studio reads the header and sample rows locally in your browser.</p></div><Button variant="primary" type="button" onClick={() => csvInputRef.current?.click()}>{csvFileLabel ? 'Replace CSV' : 'Choose CSV'}</Button></div><Button variant="ghost" type="button" className="csv-sample" onClick={loadSampleCsv}>Try a sample CSV instead</Button>{csvHeaders.length ? <div className="csv-mapping"><div className="csv-mapping-controls"><ToolSelect label="Use this column as the URL or domain" value={csvColumn} onValueChange={(value) => applyCsvColumn(value)} options={csvHeaders} /><ToolSelect label="Header row" value={csvHeaderMode} onValueChange={(value) => configureCsv(csvRawRows, value)} options={['First row contains column names','No header row']} /></div><div className="csv-preview"><table><thead><tr>{csvHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{csvRows.slice(0, 3).map((row, rowIndex) => <tr key={rowIndex}>{csvHeaders.map((header, columnIndex) => <td key={`${header}-${columnIndex}`}>{row[columnIndex] || '—'}</td>)}</tr>)}</tbody></table></div></div> : null}</section>
      : inputMethod === 'dataset'
        ? <section className="guided-source-card"><div className="guided-source-intro"><Eyebrow>Existing dataset</Eyebrow><strong>Use rows from a Studio dataset</strong><p>Map the column that contains each URL or domain. The selected dataset remains unchanged.</p></div><div className="guided-option-controls"><div className="guided-option-grid"><ToolSelect label="Dataset" value={datasetSelection} onValueChange={(value) => { setDatasetSelection(value); setGuidedFeedback(''); }} options={['Competitor prices · v4','Outdoor catalogue · v12','MAP watch · v7']} /><ToolSelect label="Input column" value={datasetColumn} onValueChange={(value) => { setDatasetColumn(value); setGuidedFeedback(''); }} options={['website_url','domain','profile_url']} /></div><Button variant="secondary" type="button" onClick={useDatasetInput}>Use selected column</Button>{guidedFeedback ? <p className="guided-option-status" role="status">{guidedFeedback}</p> : null}</div></section>
        : inputMethod === 'runtime'
          ? <section className="guided-source-card"><div className="guided-source-intro"><Eyebrow>Runtime input</Eyebrow><strong>Accept values when the workflow is called</strong><p>Studio validates the required parameter before a run starts.</p></div><div className="guided-option-controls"><div className="guided-option-grid"><label className="tool-field"><span>Runtime parameter</span><Input value={runtimeKey} onChange={(event) => { setRuntimeKey(event.target.value); setGuidedFeedback(''); }} aria-label="Runtime parameter" /></label><ToolSelect label="Value type" value={runtimeType} onValueChange={(value) => { setRuntimeType(value); setGuidedFeedback(''); }} options={['Array of URLs','Single URL','Dataset ID']} /></div><small>The saved workflow will require <code>inputs.{runtimeKey || 'product_url'}</code>.</small><Button variant="secondary" type="button" onClick={addRuntimeTestValues}>Add test values</Button>{guidedFeedback ? <p className="guided-option-status" role="status">{guidedFeedback}</p> : null}</div></section>
          : inputMethod === 'discover'
            ? <section className="guided-source-card"><div className="guided-source-intro"><Eyebrow>Live discovery</Eyebrow><strong>Let Studio find candidate sources</strong><p>Discovery finds candidates only. Qualification remains a separate, evidence-backed step.</p></div><div className="guided-option-controls"><div className="guided-option-grid guided-option-grid-three"><label className="tool-field"><span>Search query</span><Input value={discoveryQuery} onChange={(event) => { setDiscoveryQuery(event.target.value); setGuidedFeedback(''); }} aria-label="Discovery query" /></label><ToolSelect label="Entity type" value={discoveryEntity} onValueChange={(value) => { setDiscoveryEntity(value); setGuidedFeedback(''); }} options={['Company','Product','Any web result']} /><ToolSelect label="Result limit" value={discoveryLimit} onValueChange={(value) => { setDiscoveryLimit(value); setGuidedFeedback(''); }} options={['10','20','50']} /></div><Button variant="secondary" type="button" onClick={useDiscoveryInput}>Use live-web discovery</Button>{guidedFeedback ? <p className="guided-option-status" role="status">{guidedFeedback}</p> : null}</div></section>
            : <section className="guided-source-card"><div className="guided-source-intro"><Eyebrow>Prior research</Eyebrow><strong>Continue from reviewed research</strong><p>Reuse retained leads as labelled context, then verify every requested fact against live sources.</p></div><div className="guided-option-controls"><div className="guided-option-grid guided-option-grid-three"><ToolSelect label="Prior research" value={researchSet} onValueChange={(value) => { setResearchSet(value); setGuidedFeedback(''); }} options={['SaaS pricing research · 74 records','Retailer coverage study · 128 records','Supplier discovery · 42 records']} /><ToolSelect label="Reuse policy" value={researchPolicy} onValueChange={(value) => { setResearchPolicy(value); setGuidedFeedback(''); }} options={['Use as leads; re-verify every fact','Use only to seed discovery']} /><div className="guided-retention"><span>Retention</span><strong>24 days remaining</strong></div></div><Button variant="secondary" type="button" onClick={usePriorResearch}>Use selected research</Button>{guidedFeedback ? <p className="guided-option-status" role="status">{guidedFeedback}</p> : null}</div></section>;

  const stepper = (
    <div className="stepper" aria-label="Workflow progress">
      {['Describe', 'Review plan', 'Watch run', 'Review data'].map((label, index) => (
        <div className="step-segment" key={label}>
          <Button
            variant="ghost"
            className={index === stage ? 'step active' : index < stage ? 'step done' : 'step'}
            onClick={() => index <= stage && setStage(index)}
            disabled={index > stage}
          >
            <i>{index < stage ? '✓' : index + 1}</i>
            {label}
          </Button>
          {index < 3 ? <i className="step-line" /> : null}
        </div>
      ))}
    </div>
  );

  const runId = selected === 'research'
    ? 'run_batch_91af'
    : selected === 'collect'
      ? 'run_collect'
      : selected === 'discover'
        ? 'run_discover'
        : selected === 'extract'
          ? 'run_extract'
          : selected === 'monitor'
            ? 'run_monitor'
            : 'run_7f3a';

  if (stage === 1) {
    return (
      <>
        {stepper}
        <section className="workflow-stage plan-stage">
          <header className="stage-head">
            <div>
              <Eyebrow>Review plan</Eyebrow>
              <h1>Confirm what Studio will do.</h1>
              <p>Review the sources, browser work and output before anything runs.</p>
            </div>
            <Badge tone="info">{template.type}</Badge>
          </header>

          <div className="plan-grid">
            <article className="panel plan-steps">
              <div className="section-head">
                <h2>Plan</h2>
                <span>{sourceLabel}</span>
              </div>
              <ol>
                <li>
                  <span>1</span>
                  <div>
                    <strong>Open approved sources</strong>
                    <p>Visit only the supplied URLs and retain each final URL.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Inspect the relevant content</strong>
                    <p>Read product, pricing or directory content required by the request.</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Return supported records</strong>
                    <p>
                      Produce {fieldCount} fields with a source quote for every supported value.
                    </p>
                  </div>
                </li>
              </ol>
            </article>

            <aside className="panel plan-contract">
              <div className="section-head">
                <h2>Run contract</h2>
              </div>
              <dl className="detail-list">
                <div><dt>Workflow</dt><dd>{template.type}</dd></div>
                <div><dt>Sources</dt><dd>{sourceLabel}</dd></div>
                <div><dt>Fields</dt><dd>{fieldCount}</dd></div>
                <div><dt>Missing data</dt><dd>{missingData}</dd></div>
                <div><dt>Evidence</dt><dd>{evidence}</dd></div>
              </dl>
              <div className="plan-contract-details">
                <div><span>Source domains</span><ul>{sourceDomains.map((domain) => <li key={domain}>{domain}</li>)}</ul></div>
                <div><span>Field names</span><ul>{fieldNames.map((field) => <li key={field}>{field.replaceAll('_', ' ')}</li>)}</ul></div>
                <p>{estimate}</p>
              </div>
              <div className="stage-actions">
                <Button variant="secondary" onClick={() => setStage(0)}>Back to describe</Button>
                <Button variant="primary" onClick={() => setStage(2)}>Approve and run →</Button>
              </div>
            </aside>
          </div>
        </section>
      </>
    );
  }

  if (stage === 2) {
    const isRunning = selected === 'research' && !researchResolved;

    return (
      <>
        {stepper}
        <section className="workflow-stage">
          <header className="stage-head">
            <div>
              <Eyebrow>Watch run</Eyebrow>
              <h1>
                {isRunning
                  ? `${template.type} is working through the approved sources.`
                  : `${template.type} run complete.`}
              </h1>
              <p>
                {isRunning
                  ? 'Follow each worker, replay captured steps and resolve input when needed.'
                  : 'Replay every captured step, then inspect the records and retained evidence.'}
              </p>
            </div>
            <Badge tone={isRunning ? 'info' : 'success'}>
              {isRunning ? 'Running' : 'Completed'}
            </Badge>
          </header>

          <RunSession runId={runId} researchResolved={researchResolved} onResearchResolved={() => setResearchResolved(true)} />

          <div className="stage-actions">
            <Button variant="secondary" onClick={() => setStage(1)}>Review plan</Button>
            <Button variant="primary" disabled={isRunning} onClick={() => setStage(3)}>Review data →</Button>
          </div>
        </section>
      </>
    );
  }

  if (stage === 3) {
    const needsReview = selected === 'compare' || (selected === 'research' && !researchResolved);

    return (
      <>
        {stepper}
        <section className="workflow-stage">
          <header className="stage-head">
            <div>
              <Eyebrow>Review data</Eyebrow>
              <h1>Check the records and their evidence.</h1>
              <p>Every supported value stays linked to the page and capture it came from.</p>
            </div>
            <Badge tone={needsReview ? 'warning' : 'success'}>
              {needsReview ? '1 field needs review' : 'Ready to save'}
            </Badge>
          </header>

          <WorkflowScenarioReview scenario={selected} researchResolved={researchResolved} onSaved={() => setDatasetSaved(true)} />

          <div className="stage-actions">
            <Button variant="secondary" onClick={() => setStage(2)}>Back to run</Button>
            {datasetSaved ? <Button variant="primary" asChild><Link href="/datasets/competitor-prices">Open saved dataset</Link></Button> : null}
          </div>
        </section>
      </>
    );
  }

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
            {mode === 'prompt' ? <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Workflow request" placeholder="e.g. Compare the price and availability of the Trailhead 2P Tent on these retailer pages. Return one row per seller with the source quote." /> : <div className="guided-composer"><section className="input-method-panel"><strong>How will you provide inputs?</strong><div className="input-methods" role="tablist" aria-label="Input method">{inputMethods.map(([key,label]) => <Button variant="secondary" size="sm" role="tab" aria-selected={inputMethod === key} className={inputMethod === key ? 'input-method-button active' : 'input-method-button'} onClick={() => chooseInputMethod(key)} key={key}>{label}</Button>)}</div><p>{inputMethod === 'urls' ? `${sourceCount} valid inputs · 0 duplicates · 0 invalid` : inputMethod === 'csv' ? csvRows.length ? `${csvRows.length} CSV rows ready · ${new Set(sources.split('\n').filter(Boolean)).size} unique inputs · column ${csvColumn}` : 'Choose a CSV to detect its columns and preview the rows' : guidedSourceLabel}</p></section><div className="guided-input-detail">{guidedInputDetail}</div><label className="guided-field"><strong>What do you want to know?</strong><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Guided workflow request" /></label></div>}
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
              {activeTool === 'Sources' ? <div className="source-editor"><div className="source-preview-chips" aria-label={`${sourceCount} configured sources`}>{sources.split('\n').map((source) => source.trim()).filter(Boolean).map((source, index) => <span key={`${source}-${index}`}>{source.replace(/^https?:\/\//, '')}</span>)}</div><label className="tool-field tool-field-wide"><span>Sources</span><Textarea value={sources} onChange={(event) => setSources(event.target.value)} aria-label="Sources" /></label></div> : null}
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
          <Button variant="secondary" className="template-pill" asChild>
            <Link href="/datasets?type=enrichment&create=csv"><Database size={14} style={{display:'inline',marginRight:8}} />Enrich a CSV</Link>
          </Button>
          <Dialog open={templateBrowserOpen} onOpenChange={setTemplateBrowserOpen}>
            <DialogTrigger asChild><Button variant="ghost" className="template-pill" style={{border:0,color:'var(--io-color-link)'}}>Browse all templates →</Button></DialogTrigger>
            <DialogContent className="template-browser-dialog">
              <DialogHeader><DialogTitle>Browse workflow templates</DialogTitle><DialogDescription>Choose a starting point. Studio will insert its request, sources, fields and rules into this builder.</DialogDescription></DialogHeader>
              <div className="template-browser-grid">
                {(Object.keys(workflowTemplates) as WorkflowTemplateKey[]).map((key) => {
                  const item = workflowTemplates[key];
                  return <Button variant="secondary" className={selected === key ? 'template-browser-option active' : 'template-browser-option'} onClick={() => { applyTemplate(key); setTemplateBrowserOpen(false); }} key={key}><span><Eyebrow>{item.type}</Eyebrow><strong>{item.label}</strong><small>{item.description}</small></span><span aria-hidden="true">→</span></Button>;
                })}
                <Button variant="secondary" className="template-browser-option" asChild>
                  <Link href="/datasets?type=enrichment&create=csv"><span><Eyebrow>Enrich</Eyebrow><strong>Enrich a CSV</strong><small>Upload a bounded list and add evidence-backed fields to each row.</small></span><span aria-hidden="true">→</span></Link>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </aside> : <aside className="templates-closed"><Button variant="secondary" onClick={() => setTemplateVisibility(true)} aria-label="Show templates" title="Show templates"><ChevronLeft size={14}/> Templates</Button></aside>}
      </div>
    </>
  );
}
