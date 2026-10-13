'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Eyebrow,
  Input,
} from '@/components/design-system';
import { resolveWorkflowTemplate, visibleStarterKeys, workflowRuntimeTemplates, workflowTemplates, type WorkflowTemplateKey } from '@/lib/workflow/templates';
import { can, useCapability, useStudio, type DatasetRecord } from '@/lib/data';
import { datasetSlug } from '@/lib/dataset-slug';
import { fieldTypeRecord, inferFieldType, inferFieldTypes, normalizeFieldName, type FieldType } from '@/lib/workflow/fields';
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
import { DescribeStage, type ComposerTool, type InputMethod } from './describe-stage';
import { ReviewPlanStage, type PlanField } from './review-plan-stage';
import { ReviewDataStage } from './review-data-stage';
import { RunStage } from './run-stage';
import { ToolSelect } from './tool-select';
import { usePromptDemo } from './use-prompt-demo';
import { useWorkflowDraft, type WorkflowDraft } from './use-workflow-draft';

const workflowDraftKey = 'importio-studio-workflow-draft';

function templateSources(key: WorkflowTemplateKey, workspaceSources: string[]) {
  return [...new Set([...workflowTemplates[key].sourceUrls, ...workspaceSources])].join('\n');
}

const workflowPromptExamples = visibleStarterKeys.map((key) => ({
  key,
  text: workflowTemplates[key].text,
}));
const workflowPromptExampleTexts = workflowPromptExamples.map((example) => example.text);

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

export function WorkflowComposerController() {
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
  const largeCollectCapability = useCapability('large-collect');
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
    ? (parsedInitialFields.length ? parsedInitialFields : workflowRuntimeTemplates[initialTemplate].fields.split(',').map((field) => field.trim()))
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
  const [monitorCreated, setMonitorCreated] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const [demoStopped, setDemoStopped] = useState(Boolean(initialPrompt));
  const csvInputRef = useRef<HTMLInputElement>(null);
  const nextFieldId = useRef(0);
  const template = useMemo(() => workflowTemplates[selected], [selected]);
  const promptSpecification = useMemo(() => parsePromptSpecification(prompt), [prompt]);
  const { typedExample, resetPromptDemo } = usePromptDemo(workflowPromptExampleTexts, !demoStopped && !prompt && mode === 'prompt' && stage === 0);
  const currentDraft: WorkflowDraft = { dirty: true, workflowName, fieldTypes, selected, mode, inputMethod, prompt, sources, fields, access, downloads, region, missingData, evidence, deduplication, validation, maxPages, maxRecords, timeout };
  const { draftStatus, clearDraft } = useWorkflowDraft({
    storageKey: activeDraftKey,
    draft: currentDraft,
    shouldSave: draftDirty && (demoStopped || Boolean(prompt.trim()) || mode !== 'prompt'),
    onRestore(draft) {
      const storedPrompt = draft.prompt ?? '';
      const isGeneratedPrompt = workflowPromptExamples.some((example) => example.text === storedPrompt) || Object.values(workflowTemplates).some((item) => item.text === storedPrompt);
      const hasUserDraft = draft.dirty ?? (Boolean(storedPrompt.trim()) && !isGeneratedPrompt);
      if (!hasUserDraft || initialPrompt) return;
      setSelected(draft.selected);
      setWorkflowName(draft.workflowName ?? '');
      if (draft.mode === 'prompt' || draft.mode === 'guided') setMode(draft.mode);
      setInputMethod(draft.inputMethod);
      setPrompt(storedPrompt);
      setSources(draft.sources ?? templateSources(initialTemplate, initialWorkspaceSources.current));
      const restoredFields = draft.fields ?? workflowRuntimeTemplates[initialTemplate].fields;
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
    },
  });
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
  function setTemplateVisibility(open: boolean) {
    setTemplatesOpen(open);
    sessionStorage.setItem('studio-templates-open', String(open));
  }
  function discardDraft() {
    clearDraft();
    setSelected(initialTemplate);
    setMode(initialInput === 'research' ? 'guided' : 'prompt');
    setInputMethod(initialInput);
    setPrompt(initialPrompt);
    setWorkflowName('');
    setDemoStopped(Boolean(initialPrompt));
    setDraftDirty(false);
    resetPromptDemo();
    setSources(templateSources(initialTemplate, auth.sources));
    const parsedResetFields = initialPrompt ? parsePromptSpecification(initialPrompt).fields : [];
    const resetFieldNames = initialPrompt
      ? (parsedResetFields.length ? parsedResetFields : workflowRuntimeTemplates[initialTemplate].fields.split(',').map((field) => field.trim()))
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
    clearDraft();
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
    setDemoStopped(false);
    resetPromptDemo();
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
    setFields(workflowRuntimeTemplates[key].fields);
    setFieldTypes(inferFieldTypes(workflowRuntimeTemplates[key].fields.split(',').map((field) => field.trim())));
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
    return workflowRuntimeTemplates[selected].suggestedName(names);
  }, [promptSpecification.domains, selected, sourceDomains]);
  const effectiveWorkflowName = workflowName.trim() || suggestedWorkflowName;
  const estimateQueries = Math.max(1, sourceCount) * Math.max(1, Number(maxPages) || 1);
  const usageEstimate = `${estimateQueries} ${estimateQueries === 1 ? 'query' : 'queries'} · ${fieldCount} ${fieldCount === 1 ? 'field' : 'fields'} · ${(estimateQueries * 0.6).toFixed(1)} browser minutes`;
  const costEstimate = `estimated cost $${(estimateQueries * 0.007).toFixed(2)}`;
  const sampleLimit = selected === 'collect' && largeCollectCapability.status === 'preview' && largeCollectCapability.limit && Number(maxRecords) > largeCollectCapability.limit
    ? largeCollectCapability.limit
    : undefined;
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

  const runtimeTemplate = workflowRuntimeTemplates[selected];
  const reviewedRecordCount = promptSpecification.domains.length || runtimeTemplate.recordCount;

  async function workflowPlan() {
    const planned = await execution.plan({ prompt, sources: sourceDomains, fields: fieldNames });
    const completed = !runtimeTemplate.waitsForDecisionWithoutDomains || promptSpecification.domains.length > 0;
    const needsReview = runtimeTemplate.needsReviewWithoutDomains && promptSpecification.domains.length === 0;
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
    const existingDataset = auth.datasets.find((item) => item.title === effectiveWorkflowName);
    const currentVersion = Number(existingDataset?.version.match(/V(\d+)/i)?.[1] ?? 0);
    const savedRecordCount = existingDataset?.recordCount ?? reviewedRecordCount;
    const dataset = {
      id: existingDataset?.id ?? datasetSlug(effectiveWorkflowName),
      title: effectiveWorkflowName,
      version: currentVersion + 1,
    };
    const needsReview = promptSpecification.domains.length === 0 && runtimeTemplate.needsReviewWithoutDomains && (!runtimeTemplate.waitsForDecisionWithoutDomains || !researchResolved);
    auth.addDataset({
      ...(existingDataset ?? {}),
      id: dataset.id,
      version: `DATASET · V${dataset.version}`,
      title: dataset.title,
      detail: `${savedRecordCount.toLocaleString('en-US')} ${savedRecordCount === 1 ? 'record' : 'records'} · ${fieldCount} fields${needsReview ? ' · 1 unresolved' : ' · fully validated'}`,
      status: needsReview ? 'Needs review' : 'Validated',
      tone: needsReview ? 'warning' : 'success',
      href: `/datasets/${dataset.id}`,
      recordCount: savedRecordCount,
      fields: savedFields ?? existingDataset?.fields ?? fieldNames,
      lastUpdated: 'Just now',
      updatedAt: Date.now(),
      unresolvedCount: needsReview ? 1 : 0,
      sourceWorkflow: template.title,
      sourceRunId: runId,
      records: existingDataset?.records ?? records,
    });
    setSavedDatasetId(dataset.id);
    setSavedDatasetTitle(dataset.title);
  }

  if (stage === 1) {
    return <ReviewPlanStage stepper={stepper} templateType={template.type} sourceLabel={sourceLabel} fieldCount={fieldCount} workflowName={workflowName} suggestedWorkflowName={suggestedWorkflowName} onWorkflowName={(value) => { markDraftDirty(); setWorkflowName(value); }} missingData={missingData} evidence={evidence} sourceDomains={sourceDomains} editingPlanFields={editingPlanFields} fieldValidationMessage={fieldValidationMessage} finishPlanFieldEditor={finishPlanFieldEditor} openPlanFieldEditor={openPlanFieldEditor} planFields={planFields} syncPlanFieldRows={syncPlanFieldRows} addPlanField={() => syncPlanFieldRows([...planFields, { id: `plan-field-${nextFieldId.current += 1}`, name: '', type: 'text' }])} fieldDefinitions={fieldDefinitions} usageEstimate={usageEstimate} costEstimate={costEstimate} mayRun={mayRun} startRun={() => void startRun()} sampleLimit={sampleLimit} runSample={() => { setMaxRecords(String(sampleLimit)); void startRun(); }} needsInputDecision={selected === 'research'} back={() => { setEditingPlanFields(false); setStage(0); }} />;
  }

  if (stage === 2) {
    const isRunning = runtimeTemplate.waitsForDecisionWithoutDomains && !researchResolved && promptSpecification.domains.length === 0;
    return <RunStage stepper={stepper} isRunning={isRunning} templateType={template.type} runId={runId} onResolved={resolveResearchRun} back={() => setStage(1)} reviewData={() => setStage(3)} />;
  }

  if (stage === 3) {
    const needsReview = promptSpecification.domains.length === 0 && runtimeTemplate.needsReviewWithoutDomains && (!runtimeTemplate.waitsForDecisionWithoutDomains || !researchResolved);
    return <ReviewDataStage stepper={stepper} needsReview={needsReview} scenario={selected} researchResolved={researchResolved} onSaved={saveDataset} openMonitor={() => setMonitorDialogOpen(true)} workspaceName={auth.currentWorkspace?.name} domains={promptSpecification.domains} fieldNames={fieldNames} datasetName={savedDatasetTitle || effectiveWorkflowName} savedDatasetId={savedDatasetId} runId={runId} monitorOpen={monitorDialogOpen} setMonitorOpen={setMonitorDialogOpen} workflowName={effectiveWorkflowName} onMonitorCreated={(datasetName, datasetId) => { setSavedDatasetId(datasetId); setSavedDatasetTitle(datasetName); setMonitorCreated(true); }} back={() => setStage(2)} monitorCreated={monitorCreated} />;
  }

  return <DescribeStage stepper={stepper} templatesOpen={templatesOpen} mode={mode} setMode={setMode} markDraftDirty={markDraftDirty} activeTool={activeTool} setActiveTool={setActiveTool} prompt={prompt} demoStopped={demoStopped} stopDemo={() => setDemoStopped(true)} typedExample={typedExample} updatePrompt={updatePrompt} inputMethod={inputMethod} chooseInputMethod={chooseInputMethod} sourceCount={sourceCount} csvRows={csvRows} sources={sources} csvColumn={csvColumn} guidedSourceLabel={guidedSourceLabel} guidedInputDetail={guidedInputDetail} reviewPlan={() => void reviewPlan()} sourcePulse={sourcePulse} sourceLabel={sourceLabel} understoodFieldCount={understoodFieldCount} evidence={evidence} missingData={missingData} maxPages={maxPages} draftDirty={draftDirty} draftStatus={draftStatus} discardDraft={discardDraft} removeSource={auth.removeSource} workspaceSources={auth.sources} setSources={setSources} access={access} setAccess={setAccess} downloads={downloads} setDownloads={setDownloads} region={region} setRegion={setRegion} fields={fields} updateFieldsText={updateFieldsText} validation={validation} setValidation={setValidation} maxRecords={maxRecords} setMaxPages={setMaxPages} setMaxRecords={setMaxRecords} timeout={timeout} setTimeout={setTimeoutValue} deduplication={deduplication} setEvidence={setEvidence} setMissingData={setMissingData} setDeduplication={setDeduplication} improvedPrompt={improvedPrompt} acceptRewrite={acceptRewrite} selected={selected} applyTemplate={applyTemplate} setTemplateVisibility={setTemplateVisibility} templateBrowserOpen={templateBrowserOpen} setTemplateBrowserOpen={setTemplateBrowserOpen} templateType={template.type} />;
}
