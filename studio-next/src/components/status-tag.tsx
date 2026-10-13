'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Badge } from '@/components/design-system';
import { useCapability, type CapabilityId } from '@/lib/data';

const statusTagsEnabled = process.env.NEXT_PUBLIC_SHOW_STATUS_TAGS === 'true';

export function StatusTag({ capabilityId, open, onOpenChange }: { capabilityId: CapabilityId; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const capability = useCapability(capabilityId);
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      triggerRef.current?.focus();
      setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, setOpen]);

  if (capability.status === 'available' || (!statusTagsEnabled && !isOpen)) return null;
  const label = capability.status === 'preview' ? 'Preview' : 'Coming soon';

  return <span className={`status-tag-wrap${isOpen ? ' open' : ''}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    {statusTagsEnabled ? <button ref={triggerRef} type="button" className="status-tag-trigger" aria-describedby={descriptionId} aria-expanded={isOpen} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(!isOpen)}>
      <Badge tone={capability.status === 'preview' ? 'info' : 'neutral'} className={capability.status === 'preview' ? 'status-tag status-tag-preview' : 'status-tag'}>{label}</Badge>
    </button> : null}
    <span id={descriptionId} role="tooltip" className="status-tag-note">{capability.note}</span>
  </span>;
}
