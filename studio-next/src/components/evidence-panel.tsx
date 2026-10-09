'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/design-system';

export type EvidenceDetail = {
  field: string;
  record: string;
  value: string;
  quote: string;
  sourceUrl: string;
  captureLabel: string;
  kind?: 'pricing' | 'product';
};

export function EvidencePanel({ evidence, onClose }: { evidence: EvidenceDetail | null; onClose: () => void }) {
  if (!evidence) return null;

  return (
    <div className="evidence-panel-scrim" role="presentation" onClick={onClose}>
      <aside
        className="evidence-side-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="mono-label">Field evidence</span>
            <h2 id="evidence-panel-title">{evidence.record} · {evidence.field}</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close evidence" onClick={onClose}><X size={18} /></Button>
        </header>
        <div className="evidence-panel-body">
          <section>
            <span className="mono-label">Supporting quote</span>
            <blockquote>“{evidence.quote}”</blockquote>
          </section>
          <section>
            <span className="mono-label">Source URL</span>
            <a className="text-link" href={evidence.sourceUrl} target="_blank" rel="noreferrer">{evidence.sourceUrl} ↗</a>
          </section>
          <section>
            <span className="mono-label">Capture thumbnail</span>
            <div className={`evidence-capture-thumbnail ${evidence.kind === 'product' ? 'product' : 'pricing'}`}>
              <div><i /><i /><i /></div>
              <strong>{evidence.captureLabel}</strong>
              <small>{evidence.quote}</small>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
