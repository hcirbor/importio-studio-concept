'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { can, isNotificationChannel, useStudio, viewerTooltip, type DatasetRecord, type NotificationChannel } from '@/lib/data';
import { uniqueDatasetIdentity } from '@/lib/dataset-slug';
import { FIELD_TYPES, fieldTypeRecord, formatFieldLabel, inferFieldType, inferFieldTypes, isFieldType, normalizeFieldName, type FieldType } from '@/lib/workflow/fields';
import { inferWorkflowTemplate, parsePromptSpecification } from '@/lib/workflow/prompt-parser';
import { sourceDisplayLabel, sourceDomain } from '@/lib/web/source-domain';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
type PlanField = { id: string; name: string; type: FieldType };

const workflowDraftKey = 'importio-studio-workflow-draft';

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


type WorkflowDraft = {
  dirty?: boolean;
  workflowName?: string;
  fieldTypes?: Record<string, FieldType>;
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

function isStoredRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkflowTemplateKey(value: unknown): value is WorkflowTemplateKey {
  return typeof value === 'string' && Object.keys(workflowTemplates).some((key) => key === value);
}

function isInputMethod(value: unknown): value is InputMethod {
  return typeof value === 'string' && inputMethods.some(([key]) => key === value);
}

function decodeFieldTypes(value: unknown) {
  if (!isStoredRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (!entries.every((entry): entry is [string, FieldType] => typeof entry[1] === 'string' && isFieldType(entry[1]))) return undefined;
  return fieldTypeRecord(entries);
}

function storedString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function decodeWorkflowDraft(value: unknown): WorkflowDraft | null {
  if (!isStoredRecord(value) || !isWorkflowTemplateKey(value.selected) || !isInputMethod(value.inputMethod)) return null;
  const stringKeys = ['mode', 'prompt', 'sources', 'fields', 'access', 'downloads', 'region', 'missingData', 'evidence', 'deduplication', 'validation', 'maxPages', 'maxRecords', 'timeout'] as const;
  if (!stringKeys.every((key) => typeof value[key] === 'string')) return null;
  return {
    dirty: typeof value.dirty === 'boolean' ? value.dirty : undefined,
    workflowName: typeof value.workflowName === 'string' ? value.workflowName : undefined,
    fieldTypes: decodeFieldTypes(value.fieldTypes),
    selected: value.selected,
    mode: storedString(value, 'mode'),
    inputMethod: value.inputMethod,
    prompt: storedString(value, 'prompt'),
    sources: storedString(value, 'sources'),
    fields: storedString(value, 'fields'),
    access: storedString(value, 'access'),
    downloads: storedString(value, 'downloads'),
    region: storedString(value, 'region'),
    missingData: storedString(value, 'missingData'),
    evidence: storedString(value, 'evidence'),
    deduplication: storedString(value, 'deduplication'),
    validation: storedString(value, 'validation'),
    maxPages: storedString(value, 'maxPages'),
    maxRecords: storedString(value, 'maxRecords'),
    timeout: storedString(value, 'timeout'),
  };
}

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
  const auth = useStudio((snapshot) => ({
    session: snapshot.auth.session,
    sources: snapshot.auth.sources,
    datasets: snapshot.auth.datasets,
    currentWorkspace: snapshot.auth.currentWorkspace,
    currentUser: snapshot.auth.currentUser,
    addDataset: snapshot.auth.addDataset,
    removeSource: snapshot.auth.removeSource,
  }));
  const execution = useStudio((snapshot) => snapshot.execution);
  const router = useRouter();
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
  const parsedInitialFields = initialPrompt ? parsePromptSpecification(initialPrompt).fields : [];
  const initialFieldNames = initialPrompt
    ? (parsedInitialFields.length ? parsedInitialFields : templateFields[initialTemplate].split(',').map((field) => field.trim()))
    : [];
  const [fields, setFields] = useState(initialFieldNames.join(', '));
  const [fieldTypes, setFieldTypes] = useState<Record<string, FieldType>>(() => inferFieldTypes(initialFieldNames));
  const [editingPlanFields, setEditingPlanFields] = useState(false);
  const [planFields, setPlanFields] = useState<PlanField[]>([]);
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
  const [savedDatasetTitle, setSavedDatasetTitle] = useState('');
  const [runId, setRunId] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
  const [monitorSchedule, setMonitorSchedule] = useState('Daily');
  const [monitorFields, setMonitorFields] = useState<string[]>(['Price', 'Availability']);
  const [monitorAlertWhen, setMonitorAlertWhen] = useState('Any change');
  const [monitorThreshold, setMonitorThreshold] = useState('€230');
  const [monitorNotifyVia, setMonitorNotifyVia] = useState<NotificationChannel>('Email');
  const [monitorCreated, setMonitorCreated] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [typedExample, setTypedExample] = useState('');
  const [demoStopped, setDemoStopped] = useState(Boolean(initialPrompt));
  const skipNextDraftSave = useRef(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const nextFieldId = useRef(0);
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
  function updateFieldsText(value: string) {
    markDraftDirty();
    setFields(value);
    const names = value.split(',').map((field) => normalizeFieldName(field)).filter(Boolean);
    setFieldTypes((current) => fieldTypeRecord(names.map((name) => [name, current[name] ?? inferFieldType(name)])));
  }
  function updatePrompt(value: string) {
    markDraftDirty();
    setPrompt(value);
    const parsed = parsePromptSpecification(value);
    const inferred = inferWorkflowTemplate(value);
    if (inferred) setSelected(inferred);
    if (parsed.domains.length) setSources(parsed.domains.map((domain) => `https://${domain}`).join('\n'));
    setFields(parsed.fields.join(', '));
    setFieldTypes(inferFieldTypes(parsed.fields));
  }
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('studio:workflow-title', { detail: prompt.trim() ? template.title : 'New workflow' }));
  }, [prompt, template.title]);
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
          const draft = decodeWorkflowDraft(JSON.parse(stored));
          if (!draft) throw new Error('Invalid workflow draft');
          const storedPrompt = draft.prompt ?? '';
          const isGeneratedPrompt = workflowPromptExamples.some((example) => example.text === storedPrompt) || Object.values(workflowTemplates).some((item) => item.text === storedPrompt);
          const hasUserDraft = draft.dirty ?? (Boolean(storedPrompt.trim()) && !isGeneratedPrompt);
          if (hasUserDraft && !initialPrompt) {
            if (draft.selected && workflowTemplates[draft.selected]) setSelected(draft.selected);
            setWorkflowName(draft.workflowName ?? '');
            if (draft.mode === 'prompt' || draft.mode === 'guided') setMode(draft.mode);
            if (inputMethods.some(([key]) => key === draft.inputMethod)) setInputMethod(draft.inputMethod);
            setPrompt(storedPrompt);
            setSources(draft.sources ?? templateSources(initialTemplate, initialWorkspaceSources.current));
            const restoredFields = draft.fields ?? templateFields[initialTemplate];
            const restoredFieldNames = restoredFields.split(',').map((field) => normalizeFieldName(field)).filter(Boolean);
            setFields(restoredFields);
            setFieldTypes(draft.fieldTypes ?? inferFieldTypes(restoredFieldNames));
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
      const draft: WorkflowDraft = { dirty: true, workflowName, fieldTypes, selected, mode, inputMethod, prompt, sources, fields, access, downloads, region, missingData, evidence, deduplication, validation, maxPages, maxRecords, timeout };
      localStorage.setItem(activeDraftKey, JSON.stringify(draft));
      setDraftStatus('Draft saved · just now');
    }, 300);
    return () => window.clearTimeout(timer);
  }, [access, activeDraftKey, deduplication, demoStopped, downloads, draftDirty, draftReady, evidence, fieldTypes, fields, inputMethod, maxPages, maxRecords, missingData, mode, prompt, region, selected, sources, timeout, validation, workflowName]);
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
    setWorkflowName('');
    setDemoStopped(Boolean(initialPrompt));
    setDraftDirty(false);
    setExampleIndex(0);
    setSources(templateSources(initialTemplate, auth.sources));
    const parsedResetFields = initialPrompt ? parsePromptSpecification(initialPrompt).fields : [];
    const resetFieldNames = initialPrompt
      ? (parsedResetFields.length ? parsedResetFields : templateFields[initialTemplate].split(',').map((field) => field.trim()))
      : [];
    setFields(resetFieldNames.join(', '));
    setFieldTypes(inferFieldTypes(resetFieldNames));
    setEditingPlanFields(false);
    setPlanFields([]);
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
  function resetNewWorkflow() {
    const unsavedRun = Boolean(runId) && !savedDatasetId && !monitorCreated;
    if (unsavedRun) {
      setDiscardDialogOpen(true);
      return;
    }
    performNewWorkflowReset();
  }
  function performNewWorkflowReset() {
    localStorage.removeItem(activeDraftKey);
    skipNextDraftSave.current = true;
    setStage(0);
    setMode('prompt');
    setSelected('research');
    setPrompt('');
    setSources(templateSources('research', auth.sources));
    setInputMethod('urls');
    setFields('');
    setFieldTypes({});
    setEditingPlanFields(false);
    setPlanFields([]);
    setActiveTool(null);
    setResearchResolved(false);
    setSavedDatasetId('');
    setSavedDatasetTitle('');
    setWorkflowName('');
    setRunId('');
    setMonitorDialogOpen(false);
    setMonitorCreated(false);
    setDraftDirty(false);
    setDraftStatus('');
    setDemoStopped(false);
    setExampleIndex(0);
    setTypedExample('');
    setDiscardDialogOpen(false);
    router.replace('/build', { scroll: false });
  }
  useEffect(() => {
    window.addEventListener('studio:new-workflow', resetNewWorkflow);
    return () => window.removeEventListener('studio:new-workflow', resetNewWorkflow);
  });
  function applyTemplate(key: WorkflowTemplateKey) {
    markDraftDirty();
    setSelected(key);
    setPrompt(workflowTemplates[key].text);
    setSources(templateSources(key, auth.sources));
    setFields(templateFields[key]);
    setFieldTypes(inferFieldTypes(templateFields[key].split(',').map((field) => field.trim())));
    setEditingPlanFields(false);
    setPlanFields([]);
    setInputMethod('urls');
    setActiveTool(null);
    setResearchResolved(false);
    setSavedDatasetId('');
    setSavedDatasetTitle('');
    setWorkflowName('');
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
  const fieldNames = useMemo(() => fields.split(',').map((field) => normalizeFieldName(field)).filter(Boolean), [fields]);
  const fieldCount = fieldNames.length;
  const understoodFieldCount = fieldCount;
  const fieldDefinitions = useMemo(() => fieldNames.map((name, index) => ({
    id: `field-${index}`,
    name,
    type: fieldTypes[name] ?? inferFieldType(name),
  })), [fieldNames, fieldTypes]);
  const activeFieldRows = editingPlanFields ? planFields : fieldDefinitions;
  const normalizedActiveFieldNames = activeFieldRows.map((field) => normalizeFieldName(field.name));
  const duplicateFieldNames = normalizedActiveFieldNames.filter((name, index) => name && normalizedActiveFieldNames.indexOf(name) !== index);
  const fieldValidationMessage = activeFieldRows.length === 0
    ? 'Add at least one field.'
    : activeFieldRows.some((field) => !field.name.trim())
      ? 'Field names can’t be empty.'
      : duplicateFieldNames.length
        ? 'Field names must be unique.'
        : '';
  function syncPlanFieldRows(nextRows: PlanField[]) {
    setPlanFields(nextRows);
    const normalizedNames = nextRows.map((field) => normalizeFieldName(field.name));
    setFields(normalizedNames.join(', '));
    setFieldTypes(fieldTypeRecord(nextRows.filter((field) => normalizeFieldName(field.name)).map((field) => [normalizeFieldName(field.name), field.type])));
    markDraftDirty();
  }
  function openPlanFieldEditor() {
    setPlanFields(fieldDefinitions.map((field) => ({ ...field, id: `plan-field-${nextFieldId.current += 1}` })));
    setEditingPlanFields(true);
  }
  function finishPlanFieldEditor() {
    if (fieldValidationMessage) return;
    const normalizedRows = planFields.map((field) => ({ ...field, name: normalizeFieldName(field.name) }));
    setPlanFields(normalizedRows);
    setFields(normalizedRows.map((field) => field.name).join(', '));
    setFieldTypes(fieldTypeRecord(normalizedRows.map((field) => [field.name, field.type])));
    setEditingPlanFields(false);
  }
  const sourceDomains = useMemo(() => sources.split('\n').map((source) => source.trim()).filter(Boolean).map(sourceDomain), [sources]);
  const suggestedWorkflowName = useMemo(() => {
    const requestedDomains = promptSpecification.domains.length ? promptSpecification.domains : sourceDomains;
    const names = requestedDomains.map(sourceDisplayLabel).filter(Boolean);
    if (selected === 'research') return `Pricing · ${names.slice(0, 3).join(', ') || 'research'}`;
    if (selected === 'collect') return `${names[0] || 'Web'} catalogue`;
    if (selected === 'extract') return `${names[0] || 'Page'} extract`;
    if (selected === 'monitor') return `${names[0] || 'Page'} baseline`;
    return `${names[0] || 'Web'} research`;
  }, [promptSpecification.domains, selected, sourceDomains]);
  const effectiveWorkflowName = workflowName.trim() || suggestedWorkflowName;
  const estimateQueries = Math.max(1, sourceCount) * Math.max(1, Number(maxPages) || 1);
  const estimate = `${estimateQueries} ${estimateQueries === 1 ? 'query' : 'queries'} · ${fieldCount} ${fieldCount === 1 ? 'field' : 'fields'} · ${(estimateQueries * 0.6).toFixed(1)} browser minutes · estimated cost $${(estimateQueries * 0.007).toFixed(2)}`;
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
    <>
    <div className="stepper" aria-label="Workflow progress">
      {['Describe', 'Review plan', 'Watch run', 'Review data'].map((label, index) => (
        <div className="step-segment" key={label}>
          <Button
            variant="ghost"
            className={index === stage ? 'step active' : index < stage ? 'step done' : 'step'}
            onClick={() => {
              if (index > stage) return;
              if (index === 0) setEditingPlanFields(false);
              setStage(index);
            }}
            disabled={index > stage}
          >
            <i>{index < stage ? '✓' : index + 1}</i>
            {label}
          </Button>
          {index < 3 ? <i className="step-line" /> : null}
        </div>
      ))}
    </div>
    <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this run?</AlertDialogTitle>
          <AlertDialogDescription>The run and its results won&apos;t be saved.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild><Button variant="secondary">Cancel</Button></AlertDialogCancel>
          <AlertDialogAction asChild><Button variant="primary" onClick={performNewWorkflowReset}>Discard</Button></AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );

  const reviewedRecordCount = promptSpecification.domains.length || recordCountForScenario(selected);

  async function workflowPlan() {
    const planned = await execution.plan({ prompt, sources: sourceDomains, fields: fieldNames });
    const completed = selected !== 'research' || promptSpecification.domains.length > 0;
    const needsReview = selected === 'compare' && promptSpecification.domains.length === 0;
    return { ...planned, name: effectiveWorkflowName, queries: estimateQueries, scenario: selected, recordCount: reviewedRecordCount, completed, needsReview };
  }

  async function reviewPlan() {
    const planned = await workflowPlan();
    if ((await execution.validate(planned)).valid) setStage(1);
  }

  async function startRun() {
    const planned = await workflowPlan();
    if (!(await execution.validate(planned)).valid) return;
    setSavedDatasetId('');
    setSavedDatasetTitle('');
    const nextRunId = await execution.startRun(planned);
    setRunId(nextRunId);
    setStage(2);
  }

  function resolveResearchRun() {
    setResearchResolved(true);
  }

  function saveDataset(records?: DatasetRecord[], savedFields?: string[]) {
    const dataset = uniqueDatasetIdentity(effectiveWorkflowName, auth.datasets.map((item) => item.id));
    const needsReview = promptSpecification.domains.length === 0 && (selected === 'compare' || (selected === 'research' && !researchResolved));
    auth.addDataset({
      id: dataset.id,
      version: 'DATASET · V1',
      title: dataset.title,
      detail: `${reviewedRecordCount} ${reviewedRecordCount === 1 ? 'record' : 'records'} · ${fieldCount} fields${needsReview ? ' · 1 unresolved' : ' · fully validated'}`,
      status: needsReview ? 'Needs review' : 'Validated',
      tone: needsReview ? 'warning' : 'success',
      href: `/datasets/${dataset.id}`,
      recordCount: reviewedRecordCount,
      fields: savedFields ?? fieldNames,
      lastUpdated: 'Just now',
      updatedAt: Date.now(),
      unresolvedCount: needsReview ? 1 : 0,
      sourceWorkflow: template.title,
      sourceRunId: runId,
      records,
    });
    setSavedDatasetId(dataset.id);
    setSavedDatasetTitle(dataset.title);
  }

  async function createMonitor() {
    const monitorAlertRule = monitorAlertWhen === 'Price falls below' ? `Price falls below ${monitorThreshold}` : monitorAlertWhen;
    const { dataset } = await execution.createMonitor({
      name: 'Trailhead price and availability',
      detail: `${monitorAlertRule} · ${monitorNotifyVia}`,
      workflowName: effectiveWorkflowName,
      sources: sourceDomains,
      runId,
      schedule: monitorSchedule,
      lastChange: 'Not checked yet',
      status: 'Scheduled',
      tone: 'info',
      fields: monitorFields,
      alertRule: monitorAlertRule,
      notifyVia: monitorNotifyVia,
    });
    setSavedDatasetId(dataset.id);
    setSavedDatasetTitle(dataset.title);
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
              <label className="plan-workflow-name">
                <span>Workflow name</span>
                <Input value={workflowName || suggestedWorkflowName} onChange={(event) => { markDraftDirty(); setWorkflowName(event.target.value); }} aria-label="Workflow name" />
                <small>Suggested from your request · editable</small>
              </label>
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
                <div>
                  <div className="plan-detail-heading">
                    <span>Fields</span>
                    {editingPlanFields
                      ? <Button variant="ghost" size="sm" disabled={Boolean(fieldValidationMessage)} onClick={finishPlanFieldEditor}>Done</Button>
                      : <Button variant="ghost" size="sm" onClick={openPlanFieldEditor}>Edit fields</Button>}
                  </div>
                  {editingPlanFields
                    ? <div className="plan-field-editor">
                        {planFields.map((field, index) => (
                          <div className="plan-field-row" key={field.id}>
                            <Input
                              value={field.name}
                              aria-label={`Field ${index + 1} name`}
                              onChange={(event) => syncPlanFieldRows(planFields.map((item) => item.id === field.id ? { ...item, name: event.target.value } : item))}
                            />
                            <Select value={field.type} onValueChange={(value) => { if (isFieldType(value)) syncPlanFieldRows(planFields.map((item) => item.id === field.id ? { ...item, type: value } : item)); }}>
                              <SelectTrigger className="plan-field-type" aria-label={`Field ${index + 1} type`}><SelectValue /></SelectTrigger>
                              <SelectContent>{FIELD_TYPES.map((type) => <SelectItem value={type} key={type}>{type}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" className="plan-field-remove" aria-label={`Remove ${field.name || `field ${index + 1}`}`} onClick={() => syncPlanFieldRows(planFields.filter((item) => item.id !== field.id))}><X size={14} /></Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="plan-add-field" onClick={() => syncPlanFieldRows([...planFields, { id: `plan-field-${nextFieldId.current += 1}`, name: '', type: 'text' }])}>+ Add field</Button>
                      </div>
                    : <ul>{fieldDefinitions.map((field) => <li key={field.id}>{field.name.replaceAll('_', ' ')} · {field.type}</li>)}</ul>}
                  {fieldValidationMessage ? <p className="plan-field-error" role="alert">{fieldValidationMessage}</p> : null}
                </div>
                <p>{estimate}</p>
              </div>
              <div className="stage-actions">
                <Button variant="primary" disabled={!mayRun || Boolean(fieldValidationMessage)} title={!mayRun ? viewerTooltip : undefined} onClick={() => void startRun()}>Approve and run →</Button>
                <Button variant="secondary" onClick={() => { setEditingPlanFields(false); setStage(0); }}>Back to describe</Button>
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

          <RunSession runId={runId} onResearchResolved={resolveResearchRun} />

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
            onCreateMonitor={() => { setMonitorFields(fieldNames); setMonitorDialogOpen(true); }}
            workspaceName={auth.currentWorkspace?.name}
            customDomains={promptSpecification.domains}
            customFields={fieldNames}
            datasetName={savedDatasetTitle || effectiveWorkflowName}
            savedDatasetId={savedDatasetId}
            runId={runId}
          />

          <Dialog open={monitorDialogOpen} onOpenChange={setMonitorDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a monitor</DialogTitle>
                <DialogDescription>Schedule checks against the two-record Trailhead baseline dataset.</DialogDescription>
              </DialogHeader>
              <div className="dialog-form">
                <label>PIPELINE<Select value={effectiveWorkflowName} disabled><SelectTrigger aria-label="Pipeline"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={effectiveWorkflowName}>{effectiveWorkflowName}</SelectItem></SelectContent></Select></label>
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
                  {fieldNames.map((field) => (
                    <label key={field}>
                      <input
                        type="checkbox"
                        checked={monitorFields.includes(field)}
                        onChange={(event) => setMonitorFields((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))}
                      />
                      {formatFieldLabel(field)}
                    </label>
                  ))}
                </fieldset>
                <label>ALERT WHEN<Select value={monitorAlertWhen} onValueChange={setMonitorAlertWhen}><SelectTrigger aria-label="Alert when"><SelectValue /></SelectTrigger><SelectContent>{['Any change','Price falls below','Goes out of stock'].map((value)=><SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectContent></Select></label>
                {monitorAlertWhen === 'Price falls below' ? <label>VALUE<Input value={monitorThreshold} onChange={(event)=>setMonitorThreshold(event.target.value)} /></label> : null}
                <label>NOTIFY VIA<Select value={monitorNotifyVia} onValueChange={(value)=>{if(isNotificationChannel(value))setMonitorNotifyVia(value);}}><SelectTrigger aria-label="Notify via"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Email">Email · {auth.currentUser?.email}</SelectItem><SelectItem value="Slack">Slack</SelectItem><SelectItem value="Webhook">Webhook</SelectItem></SelectContent></Select></label>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setMonitorDialogOpen(false)}>Cancel</Button>
                <Button variant="primary" disabled={!monitorFields.length || (monitorAlertWhen === 'Price falls below' && !monitorThreshold.trim())} onClick={() => void createMonitor()}>Create monitor</Button>
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
            <TabsList><TabsTrigger value="prompt" id="workflow-prompt-tab" aria-controls="workflow-prompt-panel">Full prompt</TabsTrigger><TabsTrigger value="guided" id="workflow-guided-tab" aria-controls="workflow-guided-panel">Guided setup</TabsTrigger></TabsList>
            <div id="workflow-prompt-panel" role="tabpanel" aria-labelledby="workflow-prompt-tab" hidden />
            <div id="workflow-guided-panel" role="tabpanel" aria-labelledby="workflow-guided-tab" hidden />
          </Tabs>
          <div className={mode === 'prompt' ? 'composer prompt-mode' : 'composer guided-mode'}>
            {mode === 'prompt' ? <div className="prompt-field"><textarea value={prompt} onFocus={() => setDemoStopped(true)} onChange={(event) => updatePrompt(event.target.value)} aria-label="Workflow request" />{prompt ? null : <div className={demoStopped ? 'prompt-ghost stopped' : 'prompt-ghost'} aria-hidden="true">{typedExample}<i /></div>}</div> : <div className="guided-composer"><section className="input-method-panel"><strong>How will you provide inputs?</strong><div className="input-methods" role="tablist" aria-label="Input method">{inputMethods.map(([key,label]) => <Button variant="secondary" size="sm" role="tab" aria-selected={inputMethod === key} className={inputMethod === key ? 'input-method-button active' : 'input-method-button'} onClick={() => chooseInputMethod(key)} key={key}>{label}</Button>)}</div><p>{inputMethod === 'urls' ? `${sourceCount} valid inputs · 0 duplicates · 0 invalid` : inputMethod === 'csv' ? csvRows.length ? `${csvRows.length} CSV rows ready · ${new Set(sources.split('\n').filter(Boolean)).size} unique inputs · column ${csvColumn}` : 'Choose a CSV to detect its columns and preview the rows' : guidedSourceLabel}</p></section><div className="guided-input-detail">{guidedInputDetail}</div><label className="guided-field"><strong>What do you want to know?</strong><textarea value={prompt} onFocus={() => setDemoStopped(true)} onChange={(event) => updatePrompt(event.target.value)} aria-label="Guided workflow request" /></label><div className="guided-plan-action"><Button variant="primary" disabled={!prompt.trim()} onClick={() => void reviewPlan()}>Plan workflow →</Button></div></div>}
            {mode === 'prompt' ? <div className="composer-tools"><div className="composer-tool-list">
              {([
                ['Sources', Globe2],
                ['Browser actions', Hand],
                ['Fields', Database],
                ['Limits', ListFilter],
                ['Rules', FileText],
                ['Improve prompt', Sparkles],
              ] as const).map(([tool, Icon]) => <Button variant="ghost" size="sm" className={`${activeTool === tool ? 'active ' : ''}${tool === 'Improve prompt' ? 'improve-tool' : ''}`.trim()} aria-label={tool} title={tool} aria-expanded={activeTool === tool} aria-controls="workflow-tool-panel" onClick={() => toggleTool(tool)} key={tool}><Icon size={16} /><span>{tool}</span></Button>)}
            </div><div className="composer-submit">{prompt.trim() ? <span className="keyboard-hint">⌘↵ to plan</span> : null}<Button variant="primary" className="send" aria-label="Plan workflow" title={prompt.trim() ? 'Plan workflow' : 'Say what to find'} disabled={!prompt.trim()} onClick={() => void reviewPlan()}><ArrowUp size={17} /></Button></div></div> : null}
            {mode === 'prompt' && activeTool ? <section className="composer-tool-panel" id="workflow-tool-panel" aria-labelledby="workflow-tool-title">
              <header><div><h2 id="workflow-tool-title">{activeTool}</h2><p>{activeTool === 'Sources' ? 'Add public HTTPS URLs or domains, one per line.' : activeTool === 'Browser actions' ? 'Choose how Studio may navigate the public web.' : activeTool === 'Fields' ? 'Make the expected output explicit.' : activeTool === 'Limits' ? 'Bound browser work before the plan is approved.' : activeTool === 'Rules' ? 'Set evidence and missing-data behavior.' : 'Review the proposed rewrite before changing your draft.'}</p></div><Button variant="ghost" size="icon" aria-label={`Close ${activeTool}`} onClick={() => setActiveTool(null)}><X size={16} /></Button></header>
              {activeTool === 'Sources' ? <div className="source-editor"><div className="source-preview-chips" aria-label={`${sourceCount} configured sources`}>{sources.split('\n').map((source) => source.trim()).filter(Boolean).map((source, index) => <span key={`${source}-${index}`}>{source.replace(/^https?:\/\//, '')}<button type="button" aria-label={`Remove ${source}`} onClick={() => { markDraftDirty(); setSources((current) => current.split('\n').map((item) => item.trim()).filter((item) => item && item !== source).join('\n')); if (auth.sources.includes(source)) auth.removeSource(source); }}><X size={12} /></button></span>)}</div><label className="tool-field tool-field-wide"><span>Sources</span><Textarea value={sources} onChange={(event) => updateSetting(setSources, event.target.value)} aria-label="Sources" /></label></div> : null}
              {activeTool === 'Browser actions' ? <div className="tool-grid"><ToolSelect label="Access" value={access} onValueChange={(value) => updateSetting(setAccess, value)} options={['Approved public sources','Public web discovery','Approved domains only']} /><ToolSelect label="Downloads" value={downloads} onValueChange={(value) => updateSetting(setDownloads, value)} options={['Block downloads','Allow documents','Allow all downloads']} /><ToolSelect label="Region" value={region} onValueChange={(value) => updateSetting(setRegion, value)} options={['Automatic','Europe','United States']} /></div> : null}
              {activeTool === 'Fields' ? <div className="tool-grid"><label className="tool-field tool-field-span-2"><span>Output fields</span><Input value={fields} onChange={(event) => updateFieldsText(event.target.value)} aria-label="Output fields" /></label><ToolSelect label="Missing values" value={missingData} onValueChange={(value) => updateSetting(setMissingData, value)} options={['Use null; never invent','Omit missing fields','Send to review']} /><ToolSelect label="Validation" value={validation} onValueChange={(value) => updateSetting(setValidation, value)} options={['Require type match','Coerce safe values','Review mismatches']} /></div> : null}
              {activeTool === 'Limits' ? <div className="tool-grid"><label className="tool-field"><span>Maximum pages</span><Input type="number" min="1" value={maxPages} onChange={(event) => updateSetting(setMaxPages, event.target.value)} /></label><label className="tool-field"><span>Maximum records</span><Input type="number" min="1" value={maxRecords} onChange={(event) => updateSetting(setMaxRecords, event.target.value)} /></label><ToolSelect label="Timeout" value={timeout} onValueChange={(value) => updateSetting(setTimeoutValue, value)} options={['2 minutes','5 minutes','15 minutes']} /></div> : null}
              {activeTool === 'Rules' ? <div className="tool-grid"><ToolSelect label="Missing data" value={missingData} onValueChange={(value) => updateSetting(setMissingData, value)} options={['Use null; never invent','Omit missing fields','Send to review']} /><ToolSelect label="Evidence" value={evidence} onValueChange={(value) => updateSetting(setEvidence, value)} options={['Source quote per value','Page evidence per record','No evidence required']} /><ToolSelect label="Deduplication" value={deduplication} onValueChange={(value) => updateSetting(setDeduplication, value)} options={['Canonical URL + primary key','Canonical URL only','Keep every result']} /></div> : null}
              {activeTool === 'Improve prompt' ? <div className="prompt-rewrite"><div className="prompt-rewrite-diff"><del>{prompt.trim() || 'No complete prompt yet.'}</del><ins>{improvedPrompt}</ins></div><div className="prompt-rewrite-actions"><Button variant="secondary" onClick={() => setActiveTool(null)}>Undo</Button><Button variant="primary" onClick={acceptRewrite}>Accept rewrite</Button></div></div> : null}
            </section> : null}
          </div>
          {draftDirty ? <div className="draft-status" role="status"><span>{draftStatus || 'Draft saved · just now'}</span><Button variant="ghost" size="sm" onClick={discardDraft}>Discard draft</Button></div> : null}
          <div className="understood"><strong>STUDIO UNDERSTOOD</strong>{prompt.trim() ? <><Badge tone="info">{template.type}</Badge><span className={sourcePulse ? 'source-chip pulse' : 'source-chip'}><Badge tone="success">{sourceLabel}</Badge></span><Badge tone="success">{understoodFieldCount} fields</Badge><Badge tone="success">{evidence}</Badge><Badge tone="success">{missingData}</Badge><Badge tone="warning">{maxPages ? `Capped at ${maxPages} pages` : 'No page limit set'}</Badge></> : <span className="muted">Describe a task to see the plan</span>}</div>
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
