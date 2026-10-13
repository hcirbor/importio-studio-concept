'use client';

import type { ReactNode } from 'react';
import { Badge, Eyebrow } from '@/components/design-system';
import type { DatasetRecord } from '@/lib/data';
import type { WorkflowTemplateKey } from '@/lib/workflow/templates';
import { WorkflowScenarioReview } from '../workflow-scenario-review';
import { CreateMonitorDialog } from '../monitors/create-monitor-dialog';

type ReviewDataStageProps = {
  stepper: ReactNode;
  needsReview: boolean;
  scenario: WorkflowTemplateKey;
  researchResolved: boolean;
  onSaved: (records?: DatasetRecord[], fields?: string[]) => void;
  openMonitor: () => void;
  workspaceName?: string;
  domains: string[];
  fieldNames: string[];
  datasetName: string;
  savedDatasetId: string;
  runId: string;
  monitorOpen: boolean;
  setMonitorOpen: (open: boolean) => void;
  workflowName: string;
  onMonitorCreated: (datasetName: string, datasetId: string) => void;
  back: () => void;
  monitorCreated: boolean;
};

export function ReviewDataStage(props: ReviewDataStageProps) {
  return (
    <>
      {props.stepper}
      <section className="workflow-stage">
        <header className="stage-head">
          <div>
            <Eyebrow>Review data</Eyebrow>
            <h1>Check the records and their evidence.</h1>
            <p>Every supported value stays linked to the page and capture it came from.</p>
          </div>
          <Badge tone={props.needsReview ? 'warning' : 'success'}>
            {props.needsReview ? '1 field needs review' : 'Ready to save'}
          </Badge>
        </header>
        <WorkflowScenarioReview
          scenario={props.scenario}
          researchResolved={props.researchResolved}
          onSaved={props.onSaved}
          onCreateMonitor={props.openMonitor}
          workspaceName={props.workspaceName}
          customDomains={props.domains}
          customFields={props.fieldNames}
          datasetName={props.datasetName}
          savedDatasetId={props.savedDatasetId}
          runId={props.runId}
          back={props.back}
          monitorCreated={props.monitorCreated}
        />
        <CreateMonitorDialog
          open={props.monitorOpen}
          onOpenChange={props.setMonitorOpen}
          initialPipeline={props.workflowName}
          initialFields={props.fieldNames}
          sources={props.domains}
          runId={props.runId}
          onCreated={(dataset) => props.onMonitorCreated(dataset.title, dataset.id)}
        />
      </section>
    </>
  );
}
