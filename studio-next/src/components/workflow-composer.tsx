'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, ChevronLeft, ChevronRight, Database, FileText, Globe2, Hand, ListFilter, Sparkles, Tags, Users } from 'lucide-react';
import { Badge, Button, Tabs, TabsList, TabsTrigger } from '@/components/design-system';
import { resolveWorkflowTemplate, visibleStarterKeys, workflowTemplates, type WorkflowTemplateKey } from './workflow-config';

const inputMethods = [
  ['urls', 'Paste URLs or domains'],
  ['csv', 'Upload CSV'],
  ['dataset', 'Existing dataset'],
  ['runtime', 'API at runtime'],
  ['discover', 'Discover live web'],
  ['research', 'Prior research'],
] as const;

type InputMethod = typeof inputMethods[number][0];

export function WorkflowComposer() {
  const searchParams = useSearchParams();
  const initialTemplate = resolveWorkflowTemplate(searchParams.get('template'));
  return <WorkflowComposerContent key={initialTemplate} initialTemplate={initialTemplate} />;
}

function WorkflowComposerContent({ initialTemplate }: { initialTemplate: WorkflowTemplateKey }) {
  const [mode, setMode] = useState('prompt');
  const [selected, setSelected] = useState<WorkflowTemplateKey>(initialTemplate);
  const [prompt, setPrompt] = useState<string>(workflowTemplates[initialTemplate].text);
  const [inputMethod, setInputMethod] = useState<InputMethod>('urls');
  const [sourcePulse, setSourcePulse] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const template = useMemo(() => workflowTemplates[selected], [selected]);
  useEffect(() => {
    const timer = window.setTimeout(() => setTemplatesOpen(sessionStorage.getItem('studio-templates-open') !== 'false'), 0);
    return () => window.clearTimeout(timer);
  }, []);
  function setTemplateVisibility(open: boolean) {
    setTemplatesOpen(open);
    sessionStorage.setItem('studio-templates-open', String(open));
  }
  function applyTemplate(key: WorkflowTemplateKey) {
    setSelected(key);
    setPrompt(workflowTemplates[key].text);
    setInputMethod('urls');
    setSourcePulse(true);
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  function chooseInputMethod(method: InputMethod) {
    setInputMethod(method);
    setSourcePulse(false);
    requestAnimationFrame(() => setSourcePulse(true));
    window.setTimeout(() => setSourcePulse(false), 520);
  }
  const sourceLabel = inputMethod === 'urls'
    ? `${template.sources} ${template.sources === 1 ? 'source' : 'sources'}`
    : inputMethod === 'csv'
      ? 'CSV · 120 rows'
      : inputMethod === 'dataset'
        ? 'Dataset · Competitor prices'
        : inputMethod === 'runtime'
          ? 'Inputs at runtime'
          : inputMethod === 'discover'
            ? 'Discover sources'
            : 'Prior research · 74 records';

  return (
    <>
      <div className="stepper" aria-label="Workflow progress">
        <span className="step active"><i>1</i>Describe</span><i className="step-line" />
        <span className="step"><i>2</i>Review plan</span><i className="step-line" />
        <span className="step"><i>3</i>Watch run</span><i className="step-line" />
        <span className="step"><i>4</i>Review data</span>
      </div>
      <div className={templatesOpen ? 'builder-layout' : 'builder-layout templates-collapsed'}>
        <div>
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList><TabsTrigger value="prompt">Full prompt</TabsTrigger><TabsTrigger value="guided">Guided setup</TabsTrigger></TabsList>
          </Tabs>
          <div className="composer" style={{marginTop: 32}}>
            {mode === 'prompt' ? <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Workflow request" /> : <div className="guided-composer"><label><strong>What do you want to know?</strong><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Guided workflow request" /></label><section className="input-method-panel"><strong>How will you provide inputs?</strong><div className="input-methods">{inputMethods.map(([key,label]) => <button className={inputMethod === key ? 'active' : ''} onClick={() => chooseInputMethod(key)} key={key}>{label}</button>)}</div><p>{inputMethod === 'urls' ? `${template.sources} template ${template.sources === 1 ? 'source' : 'sources'} prefilled` : sourceLabel}</p></section></div>}
            <div className="composer-tools"><div className="composer-tool-list"><button><Globe2 size={16} /> Sources</button><button><Hand size={16} /> Browser actions</button><button><Database size={16} /> Fields</button><button><ListFilter size={16} /> Limits</button><button><FileText size={16} /> Rules</button><button><Sparkles size={16} /> Improve prompt</button></div><div className="composer-submit">{prompt.trim() ? <span className="keyboard-hint">⌘↵ to plan</span> : null}<Button variant="primary" className="send" aria-label="Plan workflow"><ArrowUp size={17} /></Button></div></div>
          </div>
          <div className="understood"><strong>STUDIO UNDERSTOOD</strong><Badge tone="info">{template.type}</Badge><span className={sourcePulse ? 'source-chip pulse' : 'source-chip'}><Badge tone="success">{sourceLabel}</Badge></span><Badge tone="success">{template.fields} fields</Badge><Badge tone="success">Source quote per value</Badge><Badge tone="success">Unknowns allowed</Badge></div>
          <div className="builder-foot"><span>Nothing runs until you approve the plan.</span><span>Local Next.js preview · no extraction is submitted</span></div>
        </div>
        {templatesOpen ? <aside className="templates"><div className="templates-head"><p>Start from</p><button onClick={() => setTemplateVisibility(false)} aria-label="Hide templates" title="Hide templates"><ChevronRight size={15}/></button></div>
          {visibleStarterKeys.map((key) => {
            const item = workflowTemplates[key];
            const Icon = key === 'compare' ? Tags : key === 'research' ? Globe2 : key === 'collect' ? Database : Users;
            return <button className={selected === key ? 'template-pill active' : 'template-pill'} onClick={() => applyTemplate(key)} key={key}><Icon size={14} style={{display:'inline',marginRight:8}} />{item.label}</button>;
          })}
          <button className="template-pill" style={{border:0,color:'var(--io-color-link)'}}>Browse all templates →</button>
        </aside> : <aside className="templates-closed"><button onClick={() => setTemplateVisibility(true)} aria-label="Show templates" title="Show templates"><ChevronLeft size={14}/> Templates</button></aside>}
      </div>
    </>
  );
}
