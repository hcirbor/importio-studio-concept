'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Badge, Button, Eyebrow, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/design-system';
import { useCapability, viewerTooltip } from '@/lib/data';
import { StatusTag } from '@/components/status-tag';
import { ActionBar } from '@/components/action-bar';
import { FIELD_TYPES, isFieldType, type FieldType } from '@/lib/workflow/fields';

export type PlanField = { id: string; name: string; type: FieldType };

type ReviewPlanStageProps = {
  stepper: ReactNode;
  templateType: string;
  sourceLabel: string;
  fieldCount: number;
  workflowName: string;
  suggestedWorkflowName: string;
  onWorkflowName: (value: string) => void;
  missingData: string;
  evidence: string;
  sourceDomains: string[];
  editingPlanFields: boolean;
  fieldValidationMessage: string;
  finishPlanFieldEditor: () => void;
  openPlanFieldEditor: () => void;
  planFields: PlanField[];
  syncPlanFieldRows: (rows: PlanField[]) => void;
  addPlanField: () => void;
  fieldDefinitions: PlanField[];
  usageEstimate: string;
  costEstimate: string;
  mayRun: boolean;
  startRun: () => void;
  back: () => void;
  sampleLimit?: number;
  runSample: () => void;
  needsInputDecision: boolean;
};

export function ReviewPlanStage(props: ReviewPlanStageProps) {
  const browserActions = useCapability('browser-actions');
  const inputDecisions = useCapability('input-decisions');
  const costEstimates = useCapability('cost-estimates');
  const showUsageInsteadOfCost = costEstimates.status === 'coming-soon';
  const planStepCapabilityId = browserActions.status === 'coming-soon' ? 'browser-actions' : props.needsInputDecision && inputDecisions.status === 'coming-soon' ? 'input-decisions' : undefined;

  return <>
    {props.stepper}
    <section className="workflow-stage plan-stage">
      <header className="stage-head"><div><Eyebrow>Review plan</Eyebrow><h1>Confirm what Studio will do.</h1><p>Review the sources, browser work and output before anything runs.</p></div><Badge tone="info">{props.templateType}</Badge></header>
      <div className="plan-grid">
        <article className="panel plan-steps">
          <div className="section-head"><h2>Plan</h2><span>{props.sourceLabel}</span></div>
          <ol>
            <li><span>1</span><div><strong>Open approved sources</strong><p>Visit only the supplied URLs and retain each final URL.</p></div></li>
            <li className={planStepCapabilityId ? 'plan-step-flagged' : undefined}><span>2</span><div><strong className="plan-step-title">Inspect the relevant content {planStepCapabilityId ? <StatusTag capabilityId={planStepCapabilityId} /> : null}</strong><p>Read product, pricing or directory content required by the request.</p></div></li>
            <li><span>3</span><div><strong>Return supported records</strong><p>Produce {props.fieldCount} fields with a source quote for every supported value.</p></div></li>
          </ol>
          <label className="plan-workflow-name"><span>Workflow name</span><Input value={props.workflowName || props.suggestedWorkflowName} onChange={(event) => props.onWorkflowName(event.target.value)} aria-label="Workflow name" /><small>Suggested from your request · editable</small></label>
        </article>
        <aside className="panel plan-contract">
          <div className="section-head"><h2>Run contract</h2></div>
          <dl className="detail-list"><div><dt>Workflow</dt><dd>{props.templateType}</dd></div><div><dt>Sources</dt><dd>{props.sourceLabel}</dd></div><div><dt>Fields</dt><dd>{props.fieldCount}</dd></div><div><dt>Missing data</dt><dd>{props.missingData}</dd></div><div><dt>Evidence</dt><dd>{props.evidence}</dd></div></dl>
          <div className="plan-contract-details">
            <div><span>Source domains</span><ul>{props.sourceDomains.map((domain) => <li key={domain}>{domain}</li>)}</ul></div>
            <div>
              <div className="plan-detail-heading"><span>Fields</span>{props.editingPlanFields ? <Button variant="ghost" size="sm" disabled={Boolean(props.fieldValidationMessage)} onClick={props.finishPlanFieldEditor}>Done</Button> : <Button variant="ghost" size="sm" onClick={props.openPlanFieldEditor}>Edit fields</Button>}</div>
              {props.editingPlanFields ? <div className="plan-field-editor">{props.planFields.map((field, index) => <div className="plan-field-row" key={field.id}><Input value={field.name} aria-label={`Field ${index + 1} name`} onChange={(event) => props.syncPlanFieldRows(props.planFields.map((item) => item.id === field.id ? { ...item, name: event.target.value } : item))} /><Select value={field.type} onValueChange={(value) => { if (isFieldType(value)) props.syncPlanFieldRows(props.planFields.map((item) => item.id === field.id ? { ...item, type: value } : item)); }}><SelectTrigger className="plan-field-type" aria-label={`Field ${index + 1} type`}><SelectValue /></SelectTrigger><SelectContent>{FIELD_TYPES.map((type) => <SelectItem value={type} key={type}>{type}</SelectItem>)}</SelectContent></Select><Button variant="ghost" size="sm" className="plan-field-remove" aria-label={`Remove ${field.name || `field ${index + 1}`}`} onClick={() => props.syncPlanFieldRows(props.planFields.filter((item) => item.id !== field.id))}><X size={14} /></Button></div>)}<Button variant="ghost" size="sm" className="plan-add-field" onClick={props.addPlanField}>+ Add field</Button></div> : <ul>{props.fieldDefinitions.map((field) => <li key={field.id}>{field.name.replaceAll('_', ' ')} · {field.type}</li>)}</ul>}
              {props.fieldValidationMessage ? <p className="plan-field-error" role="alert">{props.fieldValidationMessage}</p> : null}
            </div>
            <p className="estimate-with-status">{props.usageEstimate}{showUsageInsteadOfCost ? ' · usage estimate' : ` · ${props.costEstimate}`} <StatusTag capabilityId="cost-estimates" /></p>
          </div>
          {props.sampleLimit ? <div className="sample-run-offer"><p>That plan is above the live record limit.</p><Button variant="secondary" onClick={props.runSample}>Run a sample ({props.sampleLimit} records)</Button><StatusTag capabilityId="large-collect" /></div> : null}
        </aside>
      </div>
      <ActionBar
        status="Plan ready for approval"
        summary={`${props.sourceLabel} · ${props.fieldCount} fields · evidence required.`}
        secondary={(
          <Button variant="secondary" onClick={props.back}>
            Back to describe
          </Button>
        )}
        primary={(
          <Button
            variant="primary"
            disabled={!props.mayRun || Boolean(props.fieldValidationMessage)}
            title={!props.mayRun ? viewerTooltip : undefined}
            onClick={props.startRun}
          >
            Approve and run →
          </Button>
        )}
      />
    </section>
  </>;
}
