import { Button } from '@/components/design-system';
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

export function WorkflowComposerStepper({ stage, setStage, discardOpen, setDiscardOpen, resetWorkflow, stopEditing }: {
  stage: number;
  setStage: (stage: number) => void;
  discardOpen: boolean;
  setDiscardOpen: (open: boolean) => void;
  resetWorkflow: () => void;
  stopEditing: () => void;
}) {
  return (
    <>
    <div className="stepper" aria-label="Workflow progress">
      {['Describe', 'Review plan', 'Watch run', 'Review data'].map((label, index) => (
        <div className="step-segment" key={label}>
          <Button
            variant="ghost"
            className={index === stage ? 'step active' : index < stage ? 'step done' : 'step'}
            onClick={() => {
              if (index > stage) return;
              if (index === 0) stopEditing();
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
    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this run?</AlertDialogTitle>
          <AlertDialogDescription>The run and its results won&apos;t be saved.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild><Button variant="secondary">Cancel</Button></AlertDialogCancel>
          <AlertDialogAction asChild><Button variant="primary" onClick={resetWorkflow}>Discard</Button></AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
