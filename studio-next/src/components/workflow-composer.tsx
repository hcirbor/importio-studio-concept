'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, Database, FileText, Globe2, Hand, ListFilter, Sparkles, Tags, Users } from 'lucide-react';
import { Badge, Button, Tabs, TabsList, TabsTrigger } from '@/components/design-system';

const templates = {
  compare: { label: 'Compare competitor prices', text: 'Compare the price and availability of the Trailhead 2P Tent across the three supplied retailer pages. Return one row per seller.', type: 'Compare', sources: 3, fields: 5 },
  research: { label: 'Research pricing across domains', text: 'Compare the public pricing and plan limits for the supplied SaaS products, retaining evidence for every value.', type: 'Research', sources: 6, fields: 6 },
  collect: { label: 'Collect a product catalogue', text: 'Collect every product in this category. Follow pagination and return product name, price, availability and URL.', type: 'Collect', sources: 1, fields: 4 },
  discover: { label: 'Find qualified suppliers', text: 'Find qualified European outdoor-equipment suppliers and return one supported company record per business.', type: 'Discover', sources: 1, fields: 5 },
};

type TemplateKey = keyof typeof templates;

export function WorkflowComposer() {
  const searchParams = useSearchParams();
  const requestedTemplate = searchParams.get('template');
  const initialTemplate: TemplateKey = requestedTemplate === 'research'
    ? 'research'
    : requestedTemplate === 'collect'
      ? 'collect'
      : requestedTemplate === 'discover'
        ? 'discover'
        : 'compare';
  const [mode, setMode] = useState('prompt');
  const [selected, setSelected] = useState<TemplateKey>(initialTemplate);
  const [prompt, setPrompt] = useState(templates[initialTemplate].text);
  const template = useMemo(() => templates[selected], [selected]);
  function applyTemplate(key: TemplateKey) { setSelected(key); setPrompt(templates[key].text); }

  return (
    <>
      <div className="stepper" aria-label="Workflow progress">
        <span className="step active"><i>1</i>Describe</span><i className="step-line" />
        <span className="step"><i>2</i>Review plan</span><i className="step-line" />
        <span className="step"><i>3</i>Watch run</span><i className="step-line" />
        <span className="step"><i>4</i>Review data</span>
      </div>
      <div className="builder-layout">
        <div>
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList><TabsTrigger value="prompt">Full prompt</TabsTrigger><TabsTrigger value="guided">Guided setup</TabsTrigger></TabsList>
          </Tabs>
          <div className="composer" style={{marginTop: 32}}>
            {mode === 'prompt' ? <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Workflow request" /> : <div style={{display:'grid',gap:18,flex:1}}><label><strong>What do you want to know?</strong><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Guided workflow request" style={{display:'block',width:'100%',minHeight:130,marginTop:10}} /></label><div className="panel-body" style={{background:'var(--io-color-background)',borderRadius:8}}><strong>How will you provide inputs?</strong><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><Badge tone="info">Paste URLs or domains</Badge><Badge>Upload CSV</Badge><Badge>Existing dataset</Badge><Badge>API at runtime</Badge></div></div></div>}
            <div className="composer-tools"><button><Globe2 size={16} /> Sources</button><button><Hand size={16} /> Browser actions</button><button><Database size={16} /> Fields</button><button><ListFilter size={16} /> Limits</button><button><FileText size={16} /> Rules</button><button><Sparkles size={16} /> Improve prompt</button><Button variant="primary" className="send" aria-label="Plan workflow"><ArrowUp size={17} /></Button></div>
          </div>
          <div className="understood"><strong>STUDIO UNDERSTOOD</strong><Badge tone="info">{template.type}</Badge><Badge tone="success">{template.sources} {template.sources === 1 ? 'source' : 'sources'}</Badge><Badge tone="success">{template.fields} fields</Badge><Badge tone="success">Source quote per value</Badge><Badge tone="success">Unknowns allowed</Badge></div>
          <div className="builder-foot"><span>Nothing runs until you approve the plan.</span><span>Local Next.js preview · no extraction is submitted</span></div>
        </div>
        <aside className="templates"><p>Start from</p>
          {(Object.entries(templates) as [TemplateKey, typeof templates[TemplateKey]][]).map(([key, item]) => {
            const Icon = key === 'compare' ? Tags : key === 'research' ? Globe2 : key === 'collect' ? Database : Users;
            return <button className={selected === key ? 'template-pill active' : 'template-pill'} onClick={() => applyTemplate(key)} key={key}><Icon size={14} style={{display:'inline',marginRight:8}} />{item.label}</button>;
          })}
          <button className="template-pill" style={{border:0,color:'var(--io-color-link)'}}>Browse all templates →</button>
        </aside>
      </div>
    </>
  );
}
