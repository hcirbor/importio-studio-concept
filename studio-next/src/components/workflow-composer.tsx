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
  DialogFooter,
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
import { can, useAuth, viewerTooltip } from '@/lib/auth';
import type { DatasetRecord } from '@/lib/auth';

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

const workflowDraftKey = 'importio-studio-workflow-draft';

function uniqueRunId(existingIds: Set<string>) {
  let id = '';
  do {
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replaceAll('-', '').slice(0, 6)
      : Math.random().toString(36).slice(2, 8).padEnd(6, '0');
    id = `run_${random}`;
  } while (existingIds.has(id));
  return id;
}

function recordCountForScenario(scenario: WorkflowTemplateKey) {
  if (scenario === 'extract') return 1;
  if (scenario === 'monitor') return 2;
  return 3;
}

function templateSources(key: WorkflowTemplateKey, workspaceSources: string[]) {
  return [...new Set([...workflowTemplates[key].sourceUrls, ...workspaceSources])].join('\n');
}

const workflowPromptExamples = visibleStarterKeys.map((key) => ({
  key,
  text: workflowTemplates[key].text,
}));

function parsePromptSpecification(request: string) {
  const domains = Array.from(new Set(request.match(/\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}\b/gi)?.map((value) => value.toLowerCase()) ?? []));
  const fields = new Set<string>();
  const patterns: Array<[string, RegExp]> = [
    ['starting_price', /\bstarting\s+price\b/i],
    ['free_plan', /\bfree\s+plan\b/i],
    ['free_trial', /\b(?:free\s+trial(?:\s+length)?|trial(?:\s+length)?)\b/i],
    ['availability', /\b(?:stock|availability)\b/i],
    ['product_name', /\b(?:product\s+name|product|name)\b/i],
    ['url', /\burl\b/i],
    ['rating', /\brating\b/i],
    ['seller', /\bseller\b/i],
    ['MAP', /\bMAP\b/],
    ['plan', /\bplan\b/i],
    ['price', /\bprice\b/i],
  ];
  patterns.forEach(([name, pattern]) => { if (pattern.test(request)) fields.add(name); });
  if (fields.has('starting_price')) fields.delete('price');
  if (fields.has('free_plan') || fields.has('free_trial')) fields.delete('plan');
  const listed = request.match(/\b(?:return|extract|find)\s+([^.;]+)/i)?.[1];
  if (listed) {
    listed.split(/,|\band\b/i).map((item) => item.trim().replace(/\b(?:from|for|on)\b.*$/i, '').trim()).filter((item) => item && !domains.some((domain) => item.includes(domain))).forEach((item) => {
      const canonical = patterns.find(([, pattern]) => pattern.test(item))?.[0];
      if (canonical) fields.add(canonical);
      else if (item.length < 36) fields.add(item.toLowerCase().replace(/^(?:the|a|an)\s+/i, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    });
  }
  return { domains, fields: Array.from(fields) };
}

function inferWorkflowTemplate(request: string): WorkflowTemplateKey | null {
  if (/\b(?:pricing|compare)\b/i.test(request)) return 'research';
  if (/\b(?:catalogue|catalog|pagination)\b/i.test(request)) return 'collect';
  if (/\b(?:watch|changes?)\b/i.test(request)) return 'monitor';
  if (/\b(?:single|one|this)\s+(?:web\s+)?page\b/i.test(request)) return 'extract';
  const domains = parsePromptSpecification(request).domains;
  if (domains.length === 1 && (/\bpage\b/i.test(request) || /https?:\/\//i.test(request))) return 'extract';
  return null;
}

function sourceLabelForDataset(domain: string) {
  return domain.split('.')[0].split('-').filter(Boolean).map((part) => part.replace(/^./, (letter) => letter.toUpperCase())).join(' ');
}

function nextDatasetId(existingIds: string[]) {
  const used = new Set(existingIds);
  let index = 1;
  while (used.has(`saved-dataset-${index}`)) index += 1;
  return `saved-dataset-${index}`;
}

type WorkflowDraft = {
  dirty?: boolean;
  selected: WorkflowTemplateKey;
  mode: string;
  inputMethod: InputMethod;
  prompt: string;
  sources: string;
  fields: string;
  access: string;
  downloads: string;
  region: string;
  missingData: string;
  evidence: string;
  deduplication: string;
  validation: string;
  maxPages: string;
  maxRecords: string;
  timeout: string;
};

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
  const initialPrompt = searchParams.has('template') ? workflowTemplates[initialTemplate].text : '';
  return <WorkflowComposerContent key={`${initialTemplate}-${initialInput}`} initialTemplate={initialTemplate} initialInput={initialInput} initialPrompt={initialPrompt} />;
}

function WorkflowComposerContent({ initialTemplate, initialInput, initialPrompt }: { initialTemplate: WorkflowTemplateKey; initialInput: InputMethod; initialPrompt: string }) {
  const auth = useAuth();
  const mayRun = can(auth.session, 'run');
  const initialWorkspaceSources = useRef(auth.sources);
  const activeDraftKey = `${workflowDraftKey}:${auth.session?.workspaceId ?? 'signed-out'}`;
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState(initialInput === 'research' ? 'guided' : 'prompt');
  const [selected, setSelected] = useState<WorkflowTemplateKey>(initialTemplate);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [sources, setSources] = useState<string>(() => templateSources(initialTemplate, auth.sources));
  const [inputMethod, setInputMethod] = useState<InputMethod>(initialInput);
  const [sourcePulse, setSourcePulse] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ComposerTool | null>(null);
  const [fields, setFields] = useState(initialPrompt ? parsePromptSpecification(initialPrompt).fields.join(', ') : '');
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
  const [savedDatasetId, setSavedDatasetId] = useState('');
  const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
  const [monitorSchedule, setMonitorSchedule] = useState('Daily');
  const [monitorFields, setMonitorFields] = useState<string[]>(['Price', 'Availability']);
  const [monitorAlertWhen, setMonitorAlertWhen] = useState('Any change');
  const [monitorThreshold, setMonitorThreshold] = useState('€230');
  const [monitorNotifyVia, setMonitorNotifyVia] = useState<'Email'|'Slack'|'Webhook'>('Email');
  const [monitorCreated, setMonitorCreated] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [typedExample, setTypedExample] = useState('');
  const [demoStopped, setDemoStopped] = useState(Boolean(initialPrompt));
  const skipNextDraftSave = useRef(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const template = useMemo(() => workflowTemplates[selected], [selected]);
  const promptSpecification = useMemo(() => parsePromptSpecification(prompt), [prompt]);
  function markDraftDirty() {
    setDemoStopped(true);
    setDraftDirty(true);
  }
  function updateSetting<T>(setter: (value: T) => void, value: T) {
    markDraftDirty();
    setter(value);
  }
  function updatePrompt(value: string) {
    markDraftDirty();
    setPrompt(value);
    const parsed = parsePromptSpecification(value);
    const inferred = inferWorkflowTemplate(value);
    if (inferred) setSelected(inferred);
    if (parsed.domains.length) setSources(parsed.domains.map((domain) => `https://${domain}`).join('\n'));
    setFields(parsed.fields.join(', '));
  }
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('studio:workflow-title', { detail: template.title }));
  }, [template.title]);
  useEffect(() => {
    if (!auth.sources.length || promptSpecification.domains.length) return;
    const timer = window.setTimeout(() => setSources((current) => [...new Set([...current.split('\n').map((source) => source.trim()).filter(Boolean), ...auth.sources])].join('\n')), 0);
    return () => window.clearTimeout(timer);
  }, [auth.sources, promptSpecification.domains.length]);
  useEffect(() => {
    const timer = window.setTimeout(() => setTemplatesOpen(sessionStorage.getItem('studio-templates-open') !== 'false'), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const example = workflowPromptExamples[exampleIndex];
    if (demoStopped || prompt || mode !== 'prompt' || stage !== 0) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      const timer = window.setTimeout(() => setTypedExample(example.text), 0);
      return () => window.clearTimeout(timer);
    }

    let character = 0;
    let deleting = false;
    let timer = 0;
    const typeNextCharacter = () => {
      character += deleting ? -1 : 1;
      setTypedExample(example.text.slice(0, character));
      if (!deleting && character === example.text.length) {
        deleting = true;
        timer = window.setTimeout(typeNextCharacter, 1400);
      } else if (deleting && character === 0) {
        setExampleIndex((current) => (current + 1) % workflowPromptExamples.length);
      } else {
        timer = window.setTimeout(typeNextCharacter, deleting ? 10 : 18 + (character % 3) * 4);
      }
    };
    timer = window.setTimeout(() => {
      setTypedExample('');
      timer = window.setTimeout(typeNextCharacter, 220);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [demoStopped, exampleIndex, mode, prompt, stage]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = localStorage.getItem(activeDraftKey);
      if (stored) {
        try {
          const draft = JSON.parse(stored) as WorkflowDraft;
          const storedPrompt = draft.prompt ?? '';
          const isGeneratedPrompt = workflowPromptExamples.some((example) => example.text === storedPrompt) || Object.values(workflowTemplates).some((item) => item.text === storedPrompt);
          const hasUserDraft = draft.dirty ?? (Boolean(storedPrompt.trim()) && !isGeneratedPrompt);
          if (hasUserDraft && !initialPrompt) {
            if (draft.selected && workflowTemplates[draft.selected]) setSelected(draft.selected);
            if (draft.mode === 'prompt' || draft.mode === 'guided') setMode(draft.mode);
            if (inputMethods.some(([key]) => key === draft.inputMethod)) setInputMethod(draft.inputMethod);
            setPrompt(storedPrompt);
            setSources(draft.sources ?? templateSources(initialTemplate, initialWorkspaceSources.current));
            setFields(draft.fields ?? templateFields[initialTemplate]);
            setAccess(draft.access ?? 'Approved public sources');
            setDownloads(draft.downloads ?? 'Block downloads');
            setRegion(draft.region ?? 'Automatic');
            setMissingData(draft.missingData ?? 'Use null; never invent');
            setEvidence(draft.evidence ?? 'Source quote per value');
            setDeduplication(draft.deduplication ?? 'Canonical URL + primary key');
            setValidation(draft.validation ?? 'Require type match');
            setMaxPages(draft.maxPages ?? '3');
            setMaxRecords(draft.maxRecords ?? '10');
            setTimeoutValue(draft.timeout ?? '5 minutes');
            setDemoStopped(true);
            setDraftDirty(true);
            setDraftStatus('Draft saved · just now');
          }
        } catch {
          localStorage.removeItem(activeDraftKey);
        }
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeDraftKey, initialTemplate, initialPrompt]);
  useEffect(() => {
    if (!draftReady) return;
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    if (!draftDirty || (!demoStopped && !prompt.trim() && mode === 'prompt')) return;
    const timer = window.setTimeout(() => {
      const draft: WorkflowDraft = { dirty: true, selected, mode, inputMethod, prompt, sources, fields, access, downloads, region, missingData, evidence, deduplication, validation, maxPages, maxRecords, timeout };
      localStorage.setItem(activeDraftKey, JSON.stringify(draft));
      setDraftStatus('Draft saved · just now');
    }, 300);
    return () => window.clearTimeout(timer);
  }, [access, activeDraftKey, deduplication, demoStopped, downloads, draftDirty, draftReady, evidence, fields, inputMethod, maxPages, maxRecords, missingData, mode, prompt, region, selected, sources, timeout, validation]);
  function setTemplateVisibility(open: boolean) {
    setTemplatesOpen(open);
    sessionStorage.setItem('studio-templates-open', String(open));
  }
  function discardDraft() {
    localStorage.removeItem(activeDraftKey);
    skipNextDraftSave.current = true;
    setSelected(initialTemplate);
    setMode(initialInput === 'research' ? 'guided' : 'prompt');
    setInputMethod(initialInput);
    setPrompt(initialPrompt);
    setDemoStopped(Boolean(initialPrompt));
    setDraftDirty(false);
    setExampleIndex(0);
    setSources(templateSources(initialTemplate, auth.sources));
    setFields(initialPrompt ? parsePromptSpecification(initialPrompt).fields.join(', ') : '');
    setAccess('Approved public sources');
    setDownloads('Block downloads');
    setRegion('Automatic');
    setMissingData('Use null; never invent');
    setEvidence('Source quote per value');
    setDeduplication('Canonical URL + primary key');
    setValidation('Require type match');
    setMaxPages('3');
    setMaxRecords('10');
    setTimeoutValue('5 minutes');
    setDraftStatus('');
  }
  function applyTemplate(key: WorkflowTemplateKey) {
    markDraftDirty();
    setSelected(key);
    setPrompt(workflowTemplates[key].text);
    setSources(templateSources(key, auth.sources));
    setFields(templateFields[key]);
    setInputMethod('urls');
    setActiveTool(null);
    setResearchResolved(false);
    setSavedDatasetId('');
    setSourcePulse(true);
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  function chooseInputMethod(method: InputMethod) {
    markDraftDirty();
    setInputMethod(method);
    setGuidedFeedback('');
    setSourcePulse(false);
    requestAnimationFrame(() => setSourcePulse(true));
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  function applyCsvColumn(header: string, headers = csvHeaders, rows = csvRows) {
    markDraftDirty();
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
    markDraftDirty();
    const sampleSources = datasetSelection.startsWith('Competitor')
      ? workflowTemplates.compare.sourceUrls
      : datasetSelection.startsWith('Outdoor')
        ? workflowTemplates.collect.sourceUrls
        : workflowTemplates.monitor.sourceUrls;
    setSources(sampleSources.join('\n'));
    setGuidedFeedback(`${datasetColumn} selected from ${datasetSelection}. Original rows will remain unchanged.`);
  }
  function addRuntimeTestValues() {
    markDraftDirty();
    setSources(workflowTemplates.compare.sourceUrls.join('\n'));
    setGuidedFeedback(`3 local test values added for inputs.${runtimeKey}. The saved workflow will still require ${runtimeType.toLowerCase()} at runtime.`);
  }
  function useDiscoveryInput() {
    markDraftDirty();
    setSources(`https://search.import.io/?q=${encodeURIComponent(discoveryQuery)}`);
    setPrompt(`Discover up to ${discoveryLimit} ${discoveryEntity.toLowerCase()} candidates for: ${discoveryQuery}. Return source URLs and supporting evidence.`);
    setGuidedFeedback(`Live-web discovery added with a ${discoveryLimit}-candidate limit. Qualification remains a separate step.`);
  }
  function usePriorResearch() {
    markDraftDirty();
    setSources('https://example.com/suppliers\nhttps://northwind.example\nhttps://summit.example');
    setPrompt('Revisit candidates from the selected prior research and re-verify every requested fact against live sources.');
    setGuidedFeedback(`${researchSet} added as labelled context. ${researchPolicy}.`);
  }
  const sourceCount = useMemo(() => new Set(sources.split('\n').map((source) => source.trim()).filter(Boolean)).size, [sources]);
  const fieldCount = useMemo(() => fields.split(',').map((field) => field.trim()).filter(Boolean).length, [fields]);
  const understoodFieldCount = fieldCount;
  const fieldNames = useMemo(() => fields.split(',').map((field) => field.trim()).filter(Boolean), [fields]);
  const sourceDomains = useMemo(() => sources.split('\n').map((source) => source.trim()).filter(Boolean).map((source) => {
    try {
      return new URL(source.includes('://') ? source : `https://${source}`).hostname;
    } catch {
      return source;
    }
  }), [sources]);
  const datasetName = useMemo(() => {
    const requestedDomains = promptSpecification.domains.length ? promptSpecification.domains : sourceDomains;
    const names = requestedDomains.map(sourceLabelForDataset).filter(Boolean);
    if (selected === 'research') return `Pricing · ${names.slice(0, 3).join(', ') || 'research'}`;
    if (selected === 'collect') return `${names[0] || 'Web'} catalogue`;
    if (selected === 'extract') return `${names[0] || 'Page'} extract`;
    if (selected === 'monitor') return `${names[0] || 'Page'} baseline`;
    return `${names[0] || 'Web'} research`;
  }, [promptSpecification.domains, selected, sourceDomains]);
  const estimateQueries = Math.max(1, sourceCount) * Math.max(1, Number(maxPages) || 1);
  const estimate = `${estimateQueries} ${estimateQueries === 1 ? 'query' : 'queries'} · ${(estimateQueries * 0.6).toFixed(1)} browser minutes · estimated cost $${(estimateQueries * 0.007).toFixed(2)}`;
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
    markDraftDirty();
    setPrompt(improvedPrompt);
    setActiveTool(null);
  }

  const guidedInputDetail = inputMethod === 'urls'
    ? <label className="guided-field"><strong>Source URLs</strong><textarea value={sources} onChange={(event) => updateSetting(setSources, event.target.value)} aria-label="Source URLs" /><small>Paste up to 50 public HTTPS URLs or domains, one per line.</small></label>
    : inputMethod === 'csv'
      ? <section className="csv-input-card"><input ref={csvInputRef} className="csv-hidden-input" type="file" accept=".csv,text/csv" aria-label="Upload CSV" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadCsvFile(file); }} /><div className={csvDragging ? 'csv-drop-zone dragging' : 'csv-drop-zone'} onDragOver={(event) => { event.preventDefault(); setCsvDragging(true); }} onDragLeave={() => setCsvDragging(false)} onDrop={(event) => { event.preventDefault(); setCsvDragging(false); const file = event.dataTransfer.files?.[0]; if (file) void loadCsvFile(file); }}><div className="csv-drop-copy"><strong>{csvFileLabel || 'Drop a CSV here or choose a file'}</strong><p>Nothing is uploaded. Studio reads the header and sample rows locally in your browser.</p></div><Button variant="primary" type="button" onClick={() => csvInputRef.current?.click()}>{csvFileLabel ? 'Replace CSV' : 'Choose CSV'}</Button></div><Button variant="ghost" type="button" className="csv-sample" onClick={loadSampleCsv}>Try a sample CSV instead</Button>{csvHeaders.length ? <div className="csv-mapping"><div className="csv-mapping-controls"><ToolSelect label="Use this column as the URL or domain" value={csvColumn} onValueChange={(value) => applyCsvColumn(value)} options={csvHeaders} /><ToolSelect label="Header row" value={csvHeaderMode} onValueChange={(value) => configureCsv(csvRawRows, value)} options={['First row contains column names','No header row']} /></div><div className="csv-preview"><table><thead><tr>{csvHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{csvRows.slice(0, 3).map((row, rowIndex) => <tr key={rowIndex}>{csvHeaders.map((header, columnIndex) => <td key={`${header}-${columnIndex}`}>{row[columnIndex] || '—'}</td>)}</tr>)}</tbody></table></div></div> : null}</section>
      : inputMethod === 'dataset'
        ? <section className="guided-source-card"><div className="guided-source-intro"><Eyebrow>Existing dataset</Eyebrow><strong>Use rows from a Studio dataset</strong><p>Map the column that contains each URL or domain. The selected dataset remains unchanged.</p></div><div className="guided-option-controls"><div className="guided-option-grid"><ToolSelect label="Dataset" value={datasetSelection} onValueChange={(value) => { markDraftDirty(); setDatasetSelection(value); setGuidedFeedback(''); }} options={['Competitor prices · v4','Outdoor catalogue · v12','MAP watch · v7']} /><ToolSelect label="Input column" value={datasetColumn} onValueChange={(value) => { markDraftDirty(); setDatasetColumn(value); setGuidedFeedback(''); }} options={['website_url','domain','profile_url']} /></div><Button variant="secondary" type="button" onClick={useDatasetInput}>Use selected column</Button>{guidedFeedback ? <p className="guided-option-status" role="status">{guidedFeedback}</p> : null}</div></section>
        : inputMethod === 'runtime'
          ? <section className="guided-source-card"><div className="guided-source-intro"><Eyebrow>Runtime input</Eyebrow><strong>Accept values when the workflow is called</strong><p>Studio validates the required parameter before a run starts.</p></div><div className="guided-option-controls"><div className="guided-option-grid"><label className="tool-field"><span>Runtime parameter</span><Input value={runtimeKey} onChange={(event) => { markDraftDirty(); setRuntimeKey(event.target.value); setGuidedFeedback(''); }} aria-label="Runtime parameter" /></label><ToolSelect label="Value type" value={runtimeType} onValueChange={(value) => { markDraftDirty(); setRuntimeType(value); setGuidedFeedback(''); }} options={['Array of URLs','Single URL','Dataset ID']} /></div><small>The saved workflow will require <code>inputs.{runtimeKey || 'product_url'}</code>.</small><Button variant="secondary" type="button" onClick={addRuntimeTestValues}>Add test values</Button>{guidedFeedback ? <p className="guided-option-status" role="status">{guidedFeedback}</p> : null}</div></section>
          : inputMethod === 'discover'
            ? <section className="guided-source-card"><div className="guided-source-intro"><Eyebrow>Live discovery</Eyebrow><strong>Let Studio find candidate sources</strong><p>Discovery finds candidates only. Qualification remains a separate, evidence-backed step.</p></div><div className="guided-option-controls"><div className="guided-option-grid guided-option-grid-three"><label className="tool-field"><span>Search query</span><Input value={discoveryQuery} onChange={(event) => { markDraftDirty(); setDiscoveryQuery(event.target.value); setGuidedFeedback(''); }} aria-label="Discovery query" /></label><ToolSelect label="Entity type" value={discoveryEntity} onValueChange={(value) => { markDraftDirty(); setDiscoveryEntity(value); setGuidedFeedback(''); }} options={['Company','Product','Any web result']} /><ToolSelect label="Result limit" value={discoveryLimit} onValueChange={(value) => { markDraftDirty(); setDiscoveryLimit(value); setGuidedFeedback(''); }} options={['10','20','50']} /></div><Button variant="secondary" type="button" onClick={useDiscoveryInput}>Use live-web discovery</Button>{guidedFeedback ? <p className="guided-option-status" role="status">{guidedFeedback}</p> : null}</div></section>
            : <section className="guided-source-card"><div className="guided-source-intro"><Eyebrow>Prior research</Eyebrow><strong>Continue from reviewed research</strong><p>Reuse retained leads as labelled context, then verify every requested fact against live sources.</p></div><div className="guided-option-controls"><div className="guided-option-grid guided-option-grid-three"><ToolSelect label="Prior research" value={researchSet} onValueChange={(value) => { markDraftDirty(); setResearchSet(value); setGuidedFeedback(''); }} options={['SaaS pricing research · 74 records','Retailer coverage study · 128 records','Supplier discovery · 42 records']} /><ToolSelect label="Reuse policy" value={researchPolicy} onValueChange={(value) => { markDraftDirty(); setResearchPolicy(value); setGuidedFeedback(''); }} options={['Use as leads; re-verify every fact','Use only to seed discovery']} /><div className="guided-retention"><span>Retention</span><strong>24 days remaining</strong></div></div><Button variant="secondary" type="button" onClick={usePriorResearch}>Use selected research</Button>{guidedFeedback ? <p className="guided-option-status" role="status">{guidedFeedback}</p> : null}</div></section>;

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

  const [runId, setRunId] = useState('');
  const scenarioRunId = selected === 'research'
    ? 'run_batch_91af'
    : selected === 'compare'
      ? 'run_7f3a'
      : `run_${selected}`;
  const reviewedRecordCount = promptSpecification.domains.length || recordCountForScenario(selected);

  function startRun() {
    const nextRunId = uniqueRunId(new Set(auth.runs.map((run) => run.id)));
    const completed = selected !== 'research' || promptSpecification.domains.length > 0;
    const needsReview = selected === 'compare' && promptSpecification.domains.length === 0;
    auth.addRun({
      id: nextRunId,
      when: completed ? 'Just now' : 'Running now',
      pipeline: selected === 'research' ? 'SaaS pricing research' : template.title,
      coverage: completed ? `${sourceCount} / ${sourceCount} sources` : `2 / ${sourceCount} sources`,
      records: completed ? String(reviewedRecordCount) : '2',
      queries: estimateQueries,
      state: completed ? 'Completed' : 'Running',
      outcome: completed ? (needsReview ? 'Partial' : 'Succeeded') : 'Running',
      tone: completed ? (needsReview ? 'warning' : 'success') : 'info',
      badge: true,
      scenario: selected,
    });
    setRunId(nextRunId);
    setStage(2);
  }

  function resolveResearchRun() {
    setResearchResolved(true);
    auth.updateRun(runId, {
      when: 'Just now',
      coverage: `${sourceCount} / ${sourceCount} sources`,
      records: String(reviewedRecordCount),
      state: 'Completed',
      outcome: 'Succeeded',
      tone: 'success',
    });
  }

  function saveDataset(records?: DatasetRecord[], savedFields?: string[]) {
    const datasetId = nextDatasetId(auth.datasets.map((dataset) => dataset.id));
    const needsReview = promptSpecification.domains.length === 0 && (selected === 'compare' || (selected === 'research' && !researchResolved));
    auth.addDataset({
      id: datasetId,
      version: 'DATASET · V1',
      title: datasetName,
      detail: `${reviewedRecordCount} ${reviewedRecordCount === 1 ? 'record' : 'records'} · ${fieldCount} fields${needsReview ? ' · 1 unresolved' : ' · fully validated'}`,
      status: needsReview ? 'Needs review' : 'Validated',
      tone: needsReview ? 'warning' : 'success',
      href: `/datasets/${datasetId}`,
      recordCount: reviewedRecordCount,
      fields: savedFields ?? fieldNames,
      lastUpdated: 'Just now',
      sourceWorkflow: template.title,
      sourceRunId: runId,
      records,
    });
    setSavedDatasetId(datasetId);
  }

  function createMonitor() {
    const baselineTitle = datasetName;
    const datasetId = nextDatasetId(auth.datasets.map((dataset) => dataset.id));
    const monitorAlertRule = monitorAlertWhen === 'Price falls below' ? `Price falls below ${monitorThreshold}` : monitorAlertWhen;
    auth.addDataset({
      id: datasetId,
      version: 'DATASET · V1',
      title: baselineTitle,
      detail: '2 records · 2 fields · fully validated',
      status: 'Validated',
      tone: 'success',
      href: `/datasets/${datasetId}`,
      recordCount: 2,
      fields: ['Price','Availability'],
      lastUpdated: 'Just now',
      sourceWorkflow: template.title,
      sourceRunId: runId,
      records: [
        {id:'price',values:{Field:'Price',Baseline:'€249'},evidence:{Field:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249 · In stock.'},Baseline:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249 · In stock.'}}},
        {id:'availability',values:{Field:'Availability',Baseline:'In stock'},evidence:{Field:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249 · In stock.'},Baseline:{sourceUrl:'https://northwind-outdoors.example/tents/trailhead-2p',quote:'Trailhead 2P Tent — €249 · In stock.'}}},
      ],
    });
    auth.addMonitor({
      id: `monitor-${runId}`,
      name: 'Trailhead price and availability',
      detail: `${monitorAlertRule} · ${monitorNotifyVia}`,
      baselineDataset: baselineTitle,
      schedule: monitorSchedule,
      lastChange: 'Not checked yet',
      status: 'Scheduled',
      tone: 'info',
      fields: monitorFields,
      alertRule: monitorAlertRule,
      notifyVia: monitorNotifyVia,
    });
    setSavedDatasetId(datasetId);
    setMonitorCreated(true);
    setMonitorDialogOpen(false);
  }

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
                <Button variant="primary" disabled={!mayRun} title={!mayRun ? viewerTooltip : undefined} onClick={startRun}>Approve and run →</Button>
              </div>
            </aside>
          </div>
        </section>
      </>
    );
  }

  if (stage === 2) {
    const isRunning = selected === 'research' && !researchResolved && promptSpecification.domains.length === 0;

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

          <RunSession runId={runId} scenarioKey={scenarioRunId} researchResolved={researchResolved} onResearchResolved={resolveResearchRun} customDomains={promptSpecification.domains} customFields={fieldNames} />

          <div className="stage-actions">
            <Button variant="secondary" onClick={() => setStage(1)}>Review plan</Button>
            <Button variant="primary" disabled={isRunning} onClick={() => setStage(3)}>Review data →</Button>
          </div>
        </section>
      </>
    );
  }

  if (stage === 3) {
    const needsReview = (selected === 'compare' && promptSpecification.domains.length === 0) || (selected === 'research' && !researchResolved && promptSpecification.domains.length === 0);

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

          <WorkflowScenarioReview
            scenario={selected}
            researchResolved={researchResolved}
            onSaved={saveDataset}
            onCreateMonitor={() => setMonitorDialogOpen(true)}
            workspaceName={auth.currentWorkspace?.name}
            customDomains={promptSpecification.domains}
            customFields={fieldNames}
            datasetName={datasetName}
            savedDatasetId={savedDatasetId}
          />

          <Dialog open={monitorDialogOpen} onOpenChange={setMonitorDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a monitor</DialogTitle>
                <DialogDescription>Schedule checks against the two-record Trailhead baseline dataset.</DialogDescription>
              </DialogHeader>
              <div className="dialog-form">
                <label>PIPELINE<Select value={template.title} disabled><SelectTrigger aria-label="Pipeline"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={template.title}>{template.title}</SelectItem></SelectContent></Select></label>
                <label>
                  SCHEDULE
                  <Select value={monitorSchedule} onValueChange={setMonitorSchedule}>
                    <SelectTrigger aria-label="Schedule"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hourly">Hourly</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <fieldset className="monitor-field-picker">
                  <legend>FIELDS TO WATCH</legend>
                  {['Price', 'Availability'].map((field) => (
                    <label key={field}>
                      <input
                        type="checkbox"
                        checked={monitorFields.includes(field)}
                        onChange={(event) => setMonitorFields((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))}
                      />
                      {field}
                    </label>
                  ))}
                </fieldset>
                <label>ALERT WHEN<Select value={monitorAlertWhen} onValueChange={setMonitorAlertWhen}><SelectTrigger aria-label="Alert when"><SelectValue /></SelectTrigger><SelectContent>{['Any change','Price falls below','Goes out of stock'].map((value)=><SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectContent></Select></label>
                {monitorAlertWhen === 'Price falls below' ? <label>VALUE<Input value={monitorThreshold} onChange={(event)=>setMonitorThreshold(event.target.value)} /></label> : null}
                <label>NOTIFY VIA<Select value={monitorNotifyVia} onValueChange={(value)=>setMonitorNotifyVia(value as 'Email'|'Slack'|'Webhook')}><SelectTrigger aria-label="Notify via"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Email">Email · {auth.currentUser?.email}</SelectItem><SelectItem value="Slack">Slack</SelectItem><SelectItem value="Webhook">Webhook</SelectItem></SelectContent></Select></label>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setMonitorDialogOpen(false)}>Cancel</Button>
                <Button variant="primary" disabled={!monitorFields.length || (monitorAlertWhen === 'Price falls below' && !monitorThreshold.trim())} onClick={createMonitor}>Create monitor</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="stage-actions">
            <Button variant="secondary" onClick={() => setStage(2)}>Back to run</Button>
            {monitorCreated ? <Button variant="primary" asChild><Link href="/monitors">Open monitors</Link></Button> : null}
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
          <Tabs value={mode} onValueChange={(value) => { markDraftDirty(); setMode(value); setActiveTool(null); }}>
            <TabsList><TabsTrigger value="prompt">Full prompt</TabsTrigger><TabsTrigger value="guided">Guided setup</TabsTrigger></TabsList>
          </Tabs>
          <div className={mode === 'prompt' ? 'composer prompt-mode' : 'composer guided-mode'}>
            {mode === 'prompt' ? <div className="prompt-field"><textarea value={prompt} onFocus={() => setDemoStopped(true)} onChange={(event) => updatePrompt(event.target.value)} aria-label="Workflow request" />{prompt ? null : <div className={demoStopped ? 'prompt-ghost stopped' : 'prompt-ghost'} aria-hidden="true">{typedExample}<i /></div>}</div> : <div className="guided-composer"><section className="input-method-panel"><strong>How will you provide inputs?</strong><div className="input-methods" role="tablist" aria-label="Input method">{inputMethods.map(([key,label]) => <Button variant="secondary" size="sm" role="tab" aria-selected={inputMethod === key} className={inputMethod === key ? 'input-method-button active' : 'input-method-button'} onClick={() => chooseInputMethod(key)} key={key}>{label}</Button>)}</div><p>{inputMethod === 'urls' ? `${sourceCount} valid inputs · 0 duplicates · 0 invalid` : inputMethod === 'csv' ? csvRows.length ? `${csvRows.length} CSV rows ready · ${new Set(sources.split('\n').filter(Boolean)).size} unique inputs · column ${csvColumn}` : 'Choose a CSV to detect its columns and preview the rows' : guidedSourceLabel}</p></section><div className="guided-input-detail">{guidedInputDetail}</div><label className="guided-field"><strong>What do you want to know?</strong><textarea value={prompt} onFocus={() => setDemoStopped(true)} onChange={(event) => updatePrompt(event.target.value)} aria-label="Guided workflow request" /></label><div className="guided-plan-action"><Button variant="primary" disabled={!prompt.trim()} onClick={() => setStage(1)}>Plan workflow →</Button></div></div>}
            {mode === 'prompt' ? <div className="composer-tools"><div className="composer-tool-list">
              {([
                ['Sources', Globe2],
                ['Browser actions', Hand],
                ['Fields', Database],
                ['Limits', ListFilter],
                ['Rules', FileText],
                ['Improve prompt', Sparkles],
              ] as const).map(([tool, Icon]) => <Button variant="ghost" size="sm" className={`${activeTool === tool ? 'active ' : ''}${tool === 'Improve prompt' ? 'improve-tool' : ''}`.trim()} aria-label={tool} title={tool} aria-expanded={activeTool === tool} aria-controls="workflow-tool-panel" onClick={() => toggleTool(tool)} key={tool}><Icon size={16} /><span>{tool}</span></Button>)}
            </div><div className="composer-submit">{prompt.trim() ? <span className="keyboard-hint">⌘↵ to plan</span> : null}<Button variant="primary" className="send" aria-label="Plan workflow" title={prompt.trim() ? 'Plan workflow' : 'Say what to find'} disabled={!prompt.trim()} onClick={() => setStage(1)}><ArrowUp size={17} /></Button></div></div> : null}
            {mode === 'prompt' && activeTool ? <section className="composer-tool-panel" id="workflow-tool-panel" aria-labelledby="workflow-tool-title">
              <header><div><h2 id="workflow-tool-title">{activeTool}</h2><p>{activeTool === 'Sources' ? 'Add public HTTPS URLs or domains, one per line.' : activeTool === 'Browser actions' ? 'Choose how Studio may navigate the public web.' : activeTool === 'Fields' ? 'Make the expected output explicit.' : activeTool === 'Limits' ? 'Bound browser work before the plan is approved.' : activeTool === 'Rules' ? 'Set evidence and missing-data behavior.' : 'Review the proposed rewrite before changing your draft.'}</p></div><Button variant="ghost" size="icon" aria-label={`Close ${activeTool}`} onClick={() => setActiveTool(null)}><X size={16} /></Button></header>
              {activeTool === 'Sources' ? <div className="source-editor"><div className="source-preview-chips" aria-label={`${sourceCount} configured sources`}>{sources.split('\n').map((source) => source.trim()).filter(Boolean).map((source, index) => <span key={`${source}-${index}`}>{source.replace(/^https?:\/\//, '')}<button type="button" aria-label={`Remove ${source}`} onClick={() => { markDraftDirty(); setSources((current) => current.split('\n').map((item) => item.trim()).filter((item) => item && item !== source).join('\n')); if (auth.sources.includes(source)) auth.removeSource(source); }}><X size={12} /></button></span>)}</div><label className="tool-field tool-field-wide"><span>Sources</span><Textarea value={sources} onChange={(event) => updateSetting(setSources, event.target.value)} aria-label="Sources" /></label></div> : null}
              {activeTool === 'Browser actions' ? <div className="tool-grid"><ToolSelect label="Access" value={access} onValueChange={(value) => updateSetting(setAccess, value)} options={['Approved public sources','Public web discovery','Approved domains only']} /><ToolSelect label="Downloads" value={downloads} onValueChange={(value) => updateSetting(setDownloads, value)} options={['Block downloads','Allow documents','Allow all downloads']} /><ToolSelect label="Region" value={region} onValueChange={(value) => updateSetting(setRegion, value)} options={['Automatic','Europe','United States']} /></div> : null}
              {activeTool === 'Fields' ? <div className="tool-grid"><label className="tool-field tool-field-span-2"><span>Output fields</span><Input value={fields} onChange={(event) => updateSetting(setFields, event.target.value)} aria-label="Output fields" /></label><ToolSelect label="Missing values" value={missingData} onValueChange={(value) => updateSetting(setMissingData, value)} options={['Use null; never invent','Omit missing fields','Send to review']} /><ToolSelect label="Validation" value={validation} onValueChange={(value) => updateSetting(setValidation, value)} options={['Require type match','Coerce safe values','Review mismatches']} /></div> : null}
              {activeTool === 'Limits' ? <div className="tool-grid"><label className="tool-field"><span>Maximum pages</span><Input type="number" min="1" value={maxPages} onChange={(event) => updateSetting(setMaxPages, event.target.value)} /></label><label className="tool-field"><span>Maximum records</span><Input type="number" min="1" value={maxRecords} onChange={(event) => updateSetting(setMaxRecords, event.target.value)} /></label><ToolSelect label="Timeout" value={timeout} onValueChange={(value) => updateSetting(setTimeoutValue, value)} options={['2 minutes','5 minutes','15 minutes']} /></div> : null}
              {activeTool === 'Rules' ? <div className="tool-grid"><ToolSelect label="Missing data" value={missingData} onValueChange={(value) => updateSetting(setMissingData, value)} options={['Use null; never invent','Omit missing fields','Send to review']} /><ToolSelect label="Evidence" value={evidence} onValueChange={(value) => updateSetting(setEvidence, value)} options={['Source quote per value','Page evidence per record','No evidence required']} /><ToolSelect label="Deduplication" value={deduplication} onValueChange={(value) => updateSetting(setDeduplication, value)} options={['Canonical URL + primary key','Canonical URL only','Keep every result']} /></div> : null}
              {activeTool === 'Improve prompt' ? <div className="prompt-rewrite"><div className="prompt-rewrite-diff"><del>{prompt.trim() || 'No complete prompt yet.'}</del><ins>{improvedPrompt}</ins></div><div className="prompt-rewrite-actions"><Button variant="secondary" onClick={() => setActiveTool(null)}>Undo</Button><Button variant="primary" onClick={acceptRewrite}>Accept rewrite</Button></div></div> : null}
            </section> : null}
          </div>
          {draftDirty ? <div className="draft-status" role="status"><span>{draftStatus || 'Draft saved · just now'}</span><Button variant="ghost" size="sm" onClick={discardDraft}>Discard draft</Button></div> : null}
          <div className="understood"><strong>STUDIO UNDERSTOOD</strong><Badge tone="info">{template.type}</Badge><span className={sourcePulse ? 'source-chip pulse' : 'source-chip'}><Badge tone="success">{sourceLabel}</Badge></span><Badge tone="success">{understoodFieldCount} fields</Badge><Badge tone="success">{evidence}</Badge><Badge tone="success">{missingData}</Badge><Badge tone="warning">{maxPages ? `Capped at ${maxPages} pages` : 'No page limit set'}</Badge></div>
          <div className="builder-foot"><span>Nothing runs until you approve the plan.</span><span>Local mockup only · no extraction is submitted</span></div>
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
