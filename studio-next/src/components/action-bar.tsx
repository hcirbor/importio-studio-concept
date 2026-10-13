import type { ReactNode } from 'react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DialogFooter,
} from '@/components/design-system';

export function ActionBar({
  status,
  summary,
  primary,
  secondary,
}: {
  status: string;
  summary: string;
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <Card className="action-bar" role="region" aria-label="Page actions">
      <CardHeader>
        <div>
          <CardTitle>{status}</CardTitle>
          <CardDescription>{summary}</CardDescription>
        </div>
        <DialogFooter>
          {secondary}
          {primary}
        </DialogFooter>
      </CardHeader>
    </Card>
  );
}
