'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/design-system';

export function ToolSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (value: string) => void; options: string[] }) {
  return <label className="tool-field"><span>{label}</span><Select value={value} onValueChange={onValueChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem value={option} key={option}>{option}</SelectItem>)}</SelectContent></Select></label>;
}
