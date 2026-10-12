'use client';

import { useEffect, useRef, useState } from 'react';
import { fieldTypeRecord, isFieldType, type FieldType } from '@/lib/workflow/fields';
import { workflowTemplates, type WorkflowTemplateKey } from '@/lib/workflow/templates';
import type { InputMethod } from './describe-stage';

export type WorkflowDraft = { dirty?: boolean; workflowName?: string; fieldTypes?: Record<string, FieldType>; selected: WorkflowTemplateKey; mode: string; inputMethod: InputMethod; prompt: string; sources: string; fields: string; access: string; downloads: string; region: string; missingData: string; evidence: string; deduplication: string; validation: string; maxPages: string; maxRecords: string; timeout: string };
const inputMethodValues: InputMethod[] = ['urls', 'csv', 'dataset', 'runtime', 'discover', 'research'];
function isStoredRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isWorkflowTemplateKey(value: unknown): value is WorkflowTemplateKey { return typeof value === 'string' && Object.keys(workflowTemplates).some((key) => key === value); }
function isInputMethod(value: unknown): value is InputMethod { return typeof value === 'string' && inputMethodValues.some((key) => key === value); }
function decodeFieldTypes(value: unknown) { if (!isStoredRecord(value)) return undefined; const entries = Object.entries(value); if (!entries.every((entry): entry is [string, FieldType] => typeof entry[1] === 'string' && isFieldType(entry[1]))) return undefined; return fieldTypeRecord(entries); }
function storedString(record: Record<string, unknown>, key: string) { const value = record[key]; return typeof value === 'string' ? value : ''; }
function decodeWorkflowDraft(value: unknown): WorkflowDraft | null {
  if (!isStoredRecord(value) || !isWorkflowTemplateKey(value.selected) || !isInputMethod(value.inputMethod)) return null;
  const stringKeys = ['mode', 'prompt', 'sources', 'fields', 'access', 'downloads', 'region', 'missingData', 'evidence', 'deduplication', 'validation', 'maxPages', 'maxRecords', 'timeout'] as const;
  if (!stringKeys.every((key) => typeof value[key] === 'string')) return null;
  return { dirty: typeof value.dirty === 'boolean' ? value.dirty : undefined, workflowName: typeof value.workflowName === 'string' ? value.workflowName : undefined, fieldTypes: decodeFieldTypes(value.fieldTypes), selected: value.selected, mode: storedString(value, 'mode'), inputMethod: value.inputMethod, prompt: storedString(value, 'prompt'), sources: storedString(value, 'sources'), fields: storedString(value, 'fields'), access: storedString(value, 'access'), downloads: storedString(value, 'downloads'), region: storedString(value, 'region'), missingData: storedString(value, 'missingData'), evidence: storedString(value, 'evidence'), deduplication: storedString(value, 'deduplication'), validation: storedString(value, 'validation'), maxPages: storedString(value, 'maxPages'), maxRecords: storedString(value, 'maxRecords'), timeout: storedString(value, 'timeout') };
}

export function useWorkflowDraft({ storageKey, draft, shouldSave, onRestore }: { storageKey: string; draft: WorkflowDraft; shouldSave: boolean; onRestore: (draft: WorkflowDraft) => void }) {
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const skipNextDraftSave = useRef(false);
  const restoreRef = useRef(onRestore);
  const serializedDraft = JSON.stringify(draft);
  useEffect(() => { restoreRef.current = onRestore; }, [onRestore]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = localStorage.getItem(storageKey);
      if (stored) { try { const decoded = decodeWorkflowDraft(JSON.parse(stored)); if (!decoded) throw new Error('Invalid workflow draft'); restoreRef.current(decoded); setDraftStatus('Draft saved · just now'); } catch { localStorage.removeItem(storageKey); } }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => {
    if (!draftReady) return;
    if (skipNextDraftSave.current) { skipNextDraftSave.current = false; return; }
    if (!shouldSave) return;
    const timer = window.setTimeout(() => { localStorage.setItem(storageKey, serializedDraft); setDraftStatus('Draft saved · just now'); }, 300);
    return () => window.clearTimeout(timer);
  }, [draftReady, serializedDraft, shouldSave, storageKey]);
  function clearDraft() { localStorage.removeItem(storageKey); skipNextDraftSave.current = true; setDraftStatus(''); }
  return { draftReady, draftStatus, clearDraft };
}
