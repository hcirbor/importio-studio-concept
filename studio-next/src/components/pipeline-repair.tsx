'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Eyebrow,
} from '@/components/design-system';
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
      <Card>
        <CardHeader>
          <div>
            <CardTitle>What changed</CardTitle>
            <CardDescription>Compare the retained evidence for every repaired field.</CardDescription>
          </div>
          <Eyebrow>v{repair.baseVersion} → v{repair.proposedVersion}</Eyebrow>
        </CardHeader>
        {repair.fields.map((field) => (
          <section key={field.field}>
            <CardHeader>
              <CardTitle>{field.field}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="definition-grid">
                <Card>
                  <CardContent>
                    <Eyebrow>Before · v{repair.baseVersion}</Eyebrow>
                    <strong>{field.before}</strong>
                    <p>{field.beforeEvidence}</p>
                    <Link className="text-link" href={field.beforeHref}>
                      View before evidence →
                    </Link>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Eyebrow>
                      {approved ? 'Active' : 'After'} · v{repair.proposedVersion}
                    </Eyebrow>
                    <strong>{field.after}</strong>
                    <p>{field.afterEvidence}</p>
                    <Link className="text-link" href={field.afterHref}>
                      View after evidence →
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </section>
        ))}
        <CardFooter>
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
        </CardFooter>
      </Card>
    </div>
  );
}

export function PipelineRepairSummary({ pipelineId }: { pipelineId: string }) {
  const repair = useStudio((snapshot) => snapshot.pipelineRepairs.find((item) => item.pipelineId === pipelineId));

  if (!repair || repair.status === 'Approved') return null;

  return (
    <Card>
      <CardHeader>
        <div>
          <Eyebrow>Pipeline repair</Eyebrow>
          <CardTitle>{repair.title}</CardTitle>
          <CardDescription>{repair.summary}</CardDescription>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/pipelines/${pipelineId}/repair`}>Review repair</Link>
        </Button>
      </CardHeader>
    </Card>
  );
}
