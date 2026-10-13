'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fieldTypeRecord, inferFieldType, inferFieldTypes, normalizeFieldName, type FieldType } from '@/lib/workflow/fields';
import { inferWorkflowTemplate, parsePromptSpecification } from '@/lib/workflow/prompt-parser';
import { visibleStarterKeys, workflowRuntimeTemplates, workflowTemplates, type WorkflowTemplateKey } from '@/lib/workflow/templates';
import type { ComposerTool, InputMethod } from './describe-stage';
import type { PlanField } from './review-plan-stage';
import { usePromptDemo } from './use-prompt-demo';
import { useWorkflowDraft, type WorkflowDraft } from './use-workflow-draft';

const workflowDraftKey = 'importio-studio-workflow-draft';
const workflowPromptExamples = visibleStarterKeys.map((key) => ({ key, text: workflowTemplates[key].text }));
const workflowPromptExampleTexts = workflowPromptExamples.map((example) => example.text);

function templateSources(key: WorkflowTemplateKey, workspaceSources: string[]) {
  return [...new Set([...workflowTemplates[key].sourceUrls, ...workspaceSources])].join('\n');
}

export function useWorkflowComposerState({ initialTemplate, initialInput, initialPrompt, workspaceSources, workspaceId }: {
  initialTemplate: WorkflowTemplateKey;
  initialInput: InputMethod;
  initialPrompt: string;
  workspaceSources: string[];
  workspaceId?: string;
}) {
  const router = useRouter();
  const initialWorkspaceSources = useRef(workspaceSources);
  const activeDraftKey = `${workflowDraftKey}:${workspaceId ?? 'signed-out'}`;
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState(initialInput === 'research' ? 'guided' : 'prompt');
  const [selected, setSelected] = useState<WorkflowTemplateKey>(initialTemplate);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [sources, setSources] = useState<string>(() => templateSources(initialTemplate, workspaceSources));
  const [inputMethod, setInputMethod] = useState<InputMethod>(initialInput);
  const [sourcePulse, setSourcePulse] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ComposerTool | null>(null);
  const parsedInitialFields = initialPrompt ? parsePromptSpecification(initialPrompt).fields : [];
  const initialFieldNames = initialPrompt ? (parsedInitialFields.length ? parsedInitialFields : workflowRuntimeTemplates[initialTemplate].fields.split(',').map((field) => field.trim())) : [];
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
  const nextFieldIdRef = useRef(0);
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
  function markDraftDirty() { setDemoStopped(true); setDraftDirty(true); }
  function updateSetting<T>(setter: (value: T) => void, value: T) { markDraftDirty(); setter(value); }
  function updateFieldsText(value: string) {
    markDraftDirty();
    setFields(value);
    const names = value.split(',').map((field) => normalizeFieldName(field)).filter(Boolean);
    setFieldTypes((current) => fieldTypeRecord(names.map((name) => [name, current[name] ?? inferFieldType(name)])));
  }
  function updatePrompt(value: string) {
    markDraftDirty(); setPrompt(value);
    const parsed = parsePromptSpecification(value);
    const inferred = inferWorkflowTemplate(value);
    if (inferred) setSelected(inferred);
    if (parsed.domains.length) setSources(parsed.domains.map((domain) => `https://${domain}`).join('\n'));
    setFields(parsed.fields.join(', '));
    setFieldTypes(inferFieldTypes(parsed.fields));
  }
  useEffect(() => { window.dispatchEvent(new CustomEvent('studio:workflow-title', { detail: prompt.trim() ? template.title : 'New workflow' })); }, [prompt, template.title]);
  useEffect(() => {
    if (!workspaceSources.length || promptSpecification.domains.length) return;
    const timer = window.setTimeout(() => setSources((current) => [...new Set([...current.split('\n').map((source) => source.trim()).filter(Boolean), ...workspaceSources])].join('\n')), 0);
    return () => window.clearTimeout(timer);
  }, [promptSpecification.domains.length, workspaceSources]);
  useEffect(() => { const timer = window.setTimeout(() => setTemplatesOpen(sessionStorage.getItem('studio-templates-open') !== 'false'), 0); return () => window.clearTimeout(timer); }, []);
  function setTemplateVisibility(open: boolean) { setTemplatesOpen(open); sessionStorage.setItem('studio-templates-open', String(open)); }
  function discardDraft() {
    clearDraft(); setSelected(initialTemplate); setMode(initialInput === 'research' ? 'guided' : 'prompt'); setInputMethod(initialInput); setPrompt(initialPrompt); setWorkflowName(''); setDemoStopped(Boolean(initialPrompt)); setDraftDirty(false); resetPromptDemo(); setSources(templateSources(initialTemplate, workspaceSources));
    const parsedResetFields = initialPrompt ? parsePromptSpecification(initialPrompt).fields : [];
    const resetFieldNames = initialPrompt ? (parsedResetFields.length ? parsedResetFields : workflowRuntimeTemplates[initialTemplate].fields.split(',').map((field) => field.trim())) : [];
    setFields(resetFieldNames.join(', ')); setFieldTypes(inferFieldTypes(resetFieldNames)); setEditingPlanFields(false); setPlanFields([]); setAccess('Approved public sources'); setDownloads('Block downloads'); setRegion('Automatic'); setMissingData('Use null; never invent'); setEvidence('Source quote per value'); setDeduplication('Canonical URL + primary key'); setValidation('Require type match'); setMaxPages('3'); setMaxRecords('10'); setTimeoutValue('5 minutes');
  }
  function performNewWorkflowReset() {
    clearDraft(); setStage(0); setMode('prompt'); setSelected('research'); setPrompt(''); setSources(templateSources('research', workspaceSources)); setInputMethod('urls'); setFields(''); setFieldTypes({}); setEditingPlanFields(false); setPlanFields([]); setActiveTool(null); setResearchResolved(false); setSavedDatasetId(''); setSavedDatasetTitle(''); setWorkflowName(''); setRunId(''); setMonitorDialogOpen(false); setMonitorCreated(false); setDraftDirty(false); setDemoStopped(false); resetPromptDemo(); setDiscardDialogOpen(false); router.replace('/build', { scroll: false });
  }
  function resetNewWorkflow() { if (runId && !savedDatasetId && !monitorCreated) setDiscardDialogOpen(true); else performNewWorkflowReset(); }
  useEffect(() => { window.addEventListener('studio:new-workflow', resetNewWorkflow); return () => window.removeEventListener('studio:new-workflow', resetNewWorkflow); });
  function applyTemplate(key: WorkflowTemplateKey) {
    markDraftDirty(); setSelected(key); setPrompt(workflowTemplates[key].text); setSources(templateSources(key, workspaceSources)); setFields(workflowRuntimeTemplates[key].fields); setFieldTypes(inferFieldTypes(workflowRuntimeTemplates[key].fields.split(',').map((field) => field.trim()))); setEditingPlanFields(false); setPlanFields([]); setInputMethod('urls'); setActiveTool(null); setResearchResolved(false); setSavedDatasetId(''); setSavedDatasetTitle(''); setWorkflowName(''); setSourcePulse(true); window.setTimeout(() => setSourcePulse(false), 520);
  }
  function chooseInputMethod(method: InputMethod) { markDraftDirty(); setInputMethod(method); setGuidedFeedback(''); setSourcePulse(false); requestAnimationFrame(() => setSourcePulse(true)); window.setTimeout(() => setSourcePulse(false), 520); }

  return { stage, setStage, mode, setMode, selected, prompt, setPrompt, sources, setSources, inputMethod, sourcePulse, templatesOpen, templateBrowserOpen, setTemplateBrowserOpen, activeTool, setActiveTool, fields, setFields, fieldTypes, setFieldTypes, editingPlanFields, setEditingPlanFields, planFields, setPlanFields, access, setAccess, downloads, setDownloads, region, setRegion, missingData, setMissingData, evidence, setEvidence, deduplication, setDeduplication, validation, setValidation, maxPages, setMaxPages, maxRecords, setMaxRecords, timeout, setTimeoutValue, datasetSelection, setDatasetSelection, datasetColumn, setDatasetColumn, runtimeKey, setRuntimeKey, runtimeType, setRuntimeType, discoveryQuery, setDiscoveryQuery, discoveryEntity, setDiscoveryEntity, discoveryLimit, setDiscoveryLimit, researchSet, setResearchSet, researchPolicy, setResearchPolicy, guidedFeedback, setGuidedFeedback, csvFileLabel, setCsvFileLabel, csvRawRows, setCsvRawRows, csvHeaders, setCsvHeaders, csvRows, setCsvRows, csvColumn, setCsvColumn, csvHeaderMode, setCsvHeaderMode, csvDragging, setCsvDragging, researchResolved, setResearchResolved, savedDatasetId, setSavedDatasetId, savedDatasetTitle, setSavedDatasetTitle, runId, setRunId, workflowName, setWorkflowName, monitorDialogOpen, setMonitorDialogOpen, monitorCreated, setMonitorCreated, discardDialogOpen, setDiscardDialogOpen, draftDirty, demoStopped, setDemoStopped, csvInputRef, nextFieldIdRef, template, promptSpecification, typedExample, draftStatus, markDraftDirty, updateSetting, updateFieldsText, updatePrompt, setTemplateVisibility, discardDraft, performNewWorkflowReset, applyTemplate, chooseInputMethod };
}
