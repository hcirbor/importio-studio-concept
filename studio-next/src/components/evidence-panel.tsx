'use client';

import { X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/design-system';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';

export type EvidenceDetail = {
  field: string;
  record: string;
  value: string;
  quote: string;
  sourceUrl: string;
  captureLabel: string;
  kind?: 'pricing' | 'product';
};

export function EvidencePanel({
  evidence,
  onClose,
}: {
  evidence: EvidenceDetail | null;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <Sheet open={Boolean(evidence)} onOpenChange={(open) => { if (!open) onClose(); }}>
      {evidence ? (
        <SheetContent
          side="right"
          className="evidence-side-panel"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            titleRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
        >
          <header>
            <div>
              <span className="mono-label">
                Field evidence
              </span>
              <SheetTitle asChild>
                <h2 ref={titleRef} tabIndex={-1}>
                  {evidence.record} · {evidence.field}
                </h2>
              </SheetTitle>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close evidence">
                <X size={18} />
              </Button>
            </SheetClose>
          </header>
          <div className="evidence-panel-body">
            <section>
              <span className="mono-label">
                Supporting quote
              </span>
              <blockquote>
                “{evidence.quote}”
              </blockquote>
            </section>
            <section>
              <span className="mono-label">
                Source URL
              </span>
              <a className="text-link" href={evidence.sourceUrl} target="_blank" rel="noreferrer">
                {evidence.sourceUrl} ↗
              </a>
            </section>
            <section>
              <span className="mono-label">
                Capture thumbnail
              </span>
              <div className={`evidence-capture-thumbnail ${evidence.kind === 'product' ? 'product' : 'pricing'}`}>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
                <strong>
                  {evidence.captureLabel}
                </strong>
                <small>
                  {evidence.quote}
                </small>
              </div>
            </section>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
