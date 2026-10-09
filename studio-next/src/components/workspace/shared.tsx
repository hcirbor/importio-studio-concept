'use client';

import type { ReactNode } from 'react';
import {
  Badge,
  Eyebrow,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/design-system';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type SelectOption = {
  value: string;
  label: string;
};

export type TableRow = {
  id: string;
  cells: ReactNode[];
};

export function PageHead({
  group,
  title,
  description,
  action,
}: {
  group: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head operation-page-head">
      <div>
        <Eyebrow>{group}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function PanelHead({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head compact-section-head">
      <h2>{title}</h2>
      {action ?? (meta ? <Eyebrow>{meta}</Eyebrow> : null)}
    </div>
  );
}

export function Status({ children, tone = 'success' }: { children: ReactNode; tone?: Tone }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function Toolbar({
  search,
  value,
  onChange,
  children,
}: {
  search: string;
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <section className="panel ops-toolbar">
      <Input
        aria-label={search}
        placeholder={search}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {children}
    </section>
  );
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  className,
  disabled = false,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className={className} disabled={disabled}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Feedback({
  children,
  tone = 'success',
}: {
  children?: ReactNode;
  tone?: 'success' | 'warning' | 'info';
}) {
  if (!children) return null;

  return (
    <p className={`inline-feedback ${tone}`} role="status" aria-live="polite">
      {children}
    </p>
  );
}

export function TablePanel({
  title,
  meta,
  action,
  headings,
  rows,
}: {
  title?: string;
  meta?: string;
  action?: ReactNode;
  headings: string[];
  rows: TableRow[];
}) {
  return (
    <section className="panel table-panel">
      {title ? <PanelHead title={title} meta={meta} action={action} /> : null}
      <div className="table-scroll">
        <table className="data-table compact-table">
          <thead>
            <tr>
              {headings.map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, columnIndex) => (
                  <td key={`${row.id}-${headings[columnIndex] ?? columnIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
