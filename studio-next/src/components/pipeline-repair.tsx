'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Badge, Button, Eyebrow } from '@/components/design-system';
import { can, useStudio } from '@/lib/data';

export function PipelineRepair({ pipelineId }: { pipelineId: string }) {
  const state = useStudio((snapshot) => ({
    repair: snapshot.pipelineRepairs.find((item) => item.pipelineId === pipelineId),
    session: snapshot.auth.session,
    approve: snapshot.controlPlane.approvePipelineRepair,
    rollback: snapshot.controlPlane.rollbackPipelineRepair,
  }));
  const repair = state.repair;

  if (!repair) {
    return (
      <div className="page">
        <Link href="/pipelines" className="back-link">
          ← Pipelines
        </Link>
        <header className="page-head">
          <Eyebrow>Pipeline repair</Eyebrow>
          <h1>No repair available</h1>
          <p>This pipeline does not have a pending repair.</p>
        </header>
      </div>
    );
  }
  const currentRepair = repair;

  const approved = currentRepair.status === 'Approved';
  const mayPromote = can(state.session, 'promote');

  function approve() {
    state.approve(currentRepair.id);
    toast.success(`Repair approved. Version ${currentRepair.proposedVersion} created and activated.`, {
      action: {
        label: 'Undo',
        onClick: () => state.rollback(currentRepair.id),
      },
    });
  }

  function rollback() {
    state.rollback(currentRepair.id);
    toast.success(`Rolled back to v${currentRepair.baseVersion}.`, {
      action: {
        label: 'Undo',
        onClick: () => state.approve(currentRepair.id),
      },
    });
  }

  return (
    <div className="page">
      <Link href={`/pipelines/${repair.pipelineId}`} className="back-link">
        ← {repair.pipelineName}
      </Link>
      <header className="page-head">
        <Eyebrow>Pipeline repair</Eyebrow>
        <h1>{repair.title}</h1>
        <p>{repair.summary}</p>
        <Badge tone={approved ? 'success' : 'warning'}>
          {approved ? `Active · v${repair.proposedVersion}` : 'Needs attention'}
        </Badge>
      </header>
      <section className="panel repair-panel">
        <div className="section-head">
          <div>
            <h2>What changed</h2>
            <p>Compare the retained evidence for every repaired field.</p>
          </div>
          <Eyebrow>v{repair.baseVersion} → v{repair.proposedVersion}</Eyebrow>
        </div>
        {repair.fields.map((field) => (
          <article className="repair-field" key={field.field}>
            <h3>{field.field}</h3>
            <div className="repair-evidence">
              <div>
                <small>Before · v{repair.baseVersion}</small>
                <strong>{field.before}</strong>
                <p>{field.beforeEvidence}</p>
                <Link className="text-link" href={field.beforeHref}>
                  View before evidence →
                </Link>
              </div>
              <div>
                <small>After · proposed v{repair.proposedVersion}</small>
                <strong>{field.after}</strong>
                <p>{field.afterEvidence}</p>
                <Link className="text-link" href={field.afterHref}>
                  View after evidence →
                </Link>
              </div>
            </div>
          </article>
        ))}
        <div className="page-action-row">
          <span>
            {approved
              ? 'The repaired version is active; the previous version remains available.'
              : 'The tested repair is ready to create the next version.'}
          </span>
          {approved ? (
            <Button variant="secondary" disabled={!mayPromote} onClick={rollback}>
              Roll back to v{repair.baseVersion}
            </Button>
          ) : (
            <Button variant="primary" disabled={!mayPromote} onClick={approve}>
              Approve repair (creates v{repair.proposedVersion})
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

export function PipelineRepairSummary({ pipelineId }: { pipelineId: string }) {
  const repair = useStudio((snapshot) => snapshot.pipelineRepairs.find((item) => item.pipelineId === pipelineId));

  if (!repair || repair.status === 'Approved') return null;

  return (
    <section className="panel repair-summary">
      <div>
        <Eyebrow>Pipeline repair</Eyebrow>
        <strong>{repair.title}</strong>
        <small>{repair.summary}</small>
      </div>
      <Button variant="secondary" asChild>
        <Link href={`/pipelines/${pipelineId}/repair`}>Review repair</Link>
      </Button>
    </section>
  );
}
