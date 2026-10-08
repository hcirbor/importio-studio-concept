import Link from 'next/link';
import { Activity, Database, Globe2, Search } from 'lucide-react';
import { Badge, Eyebrow } from '@/components/design-system';
import { HomeAttention } from '@/components/home-attention';

const workflows = [
  { title: 'Research', description: 'Find and compare facts, with a source behind every answer.', hint: 'Pricing, policies or market questions', meta: 'Known sources', icon: Search, href: '/build?template=research' },
  { title: 'Extract', description: 'Turn known pages into the exact typed fields you need.', hint: 'A product, article or company page', meta: 'One source', icon: Globe2, href: '/build?template=extract' },
  { title: 'Build a dataset', description: 'Follow links, qualify records and add researched columns.', hint: 'A catalogue, directory or supplier market', meta: 'Bounded navigation', icon: Database, href: '/build?template=collect' },
  { title: 'Monitor', description: 'Keep approved pipelines current and review meaningful changes.', hint: 'A page that needs a trusted baseline', meta: 'Baseline first', icon: Activity, href: '/build?template=monitor' },
];

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <Eyebrow>Your web data workspace</Eyebrow>
          <h1>From web pages<br />to answers you can trust.</h1>
          <p>Give Studio a goal and your sources. Get structured results, with the evidence close at hand.</p>
          <div className="hero-signals"><span>Structured output</span><span>Traceable sources</span></div>
        </div>
        <div className="hero-proof" aria-hidden="true"><svg className="hero-graphic" viewBox="0 0 440 280" xmlns="http://www.w3.org/2000/svg">
          <path className="wire" d="M124 62h30q16 0 16 16v46q0 16 16 16h37M136 140h87M112 220h42q16 0 16-16v-48q0-16 16-16h37M245 140h42q16 0 16-16v-42h28M303 140h28M303 140v58h28"/><path className="signal" d="M136 140h87M245 140h58V82h28"/>
          <g className="hero-node source-node node-1"><rect className="paper" x="30" y="28" width="94" height="68" rx="6"/><rect className="tint" x="42" y="40" width="20" height="16" rx="3"/><rect className="ink" x="69" y="42" width="39" height="4" rx="2"/><rect className="ink" x="69" y="51" width="28" height="4" rx="2"/><rect className="ink" x="42" y="65" width="64" height="4" rx="2"/><rect className="ink" x="42" y="76" width="46" height="4" rx="2"/></g>
          <g className="hero-node source-node node-2"><rect className="paper" x="42" y="111" width="94" height="64" rx="6"/><rect className="accent" x="54" y="124" width="28" height="5" rx="2"/><rect className="ink" x="54" y="138" width="65" height="4" rx="2"/><rect className="ink" x="54" y="150" width="46" height="4" rx="2"/></g>
          <g className="hero-node source-node node-3"><rect className="paper" x="18" y="191" width="94" height="61" rx="6"/><rect className="ink" x="30" y="204" width="50" height="4" rx="2"/><rect className="ink" x="30" y="216" width="66" height="4" rx="2"/><rect className="tint" x="30" y="228" width="36" height="11" rx="3"/></g>
          <g className="hero-hub"><rect className="tint" x="207" y="113" width="54" height="54" rx="14"/><path className="accent" d="m234 122 18 18-18 18-18-18Z"/><path d="m226 140 5 5 11-11" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></g>
          <g className="hero-node result-node node-4"><rect className="paper" x="331" y="61" width="90" height="42" rx="6"/><rect className="accent" x="343" y="73" width="6" height="18" rx="2"/><rect className="ink" x="358" y="74" width="46" height="4" rx="2"/><rect className="ink" x="358" y="85" width="30" height="4" rx="2"/></g>
          <g className="hero-node result-node node-5"><rect className="paper" x="331" y="119" width="90" height="42" rx="6"/><rect className="accent" x="343" y="131" width="6" height="18" rx="2"/><rect className="ink" x="358" y="132" width="38" height="4" rx="2"/><rect className="ink" x="358" y="143" width="46" height="4" rx="2"/></g>
          <g className="hero-node result-node node-6"><rect className="paper" x="331" y="177" width="90" height="42" rx="6"/><rect className="accent" x="343" y="189" width="6" height="18" rx="2"/><rect className="ink" x="358" y="190" width="46" height="4" rx="2"/><rect className="ink" x="358" y="201" width="26" height="4" rx="2"/></g>
        </svg></div>
      </section>

      <section aria-labelledby="workflow-heading">
        <div className="section-head"><h2 id="workflow-heading">What would you like to do?</h2><Eyebrow>Start with a workflow</Eyebrow></div>
        <div className="workflow-grid">
          {workflows.map((workflow) => { const Icon = workflow.icon; return (
            <Link className="workflow-card" href={workflow.href} key={workflow.title}>
              <span className="workflow-icon"><Icon size={20} /></span>
              <h2>{workflow.title}</h2><p>{workflow.description}</p>
              <div className="muted" style={{marginTop: 18}}><Eyebrow>Try it with</Eyebrow>{workflow.hint}</div>
              <footer><span>{workflow.meta}</span><b>Start <span aria-hidden>↗</span></b></footer>
            </Link>
          ); })}
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Workspace activity">
        <HomeAttention />
        <article className="panel"><div className="section-head"><h2>Recent pipelines</h2><Link href="/pipelines" className="text-link">View all</Link></div><table className="data-table"><thead><tr><th>Pipeline</th><th>Status</th><th>Records</th></tr></thead><tbody><tr><td><Link href="/pipelines/competitor-prices">Competitor prices</Link></td><td><Badge tone="warning">Needs review</Badge></td><td>3</td></tr><tr><td>Outdoor catalogue</td><td><Badge tone="success">Completed</Badge></td><td>1,284</td></tr><tr><td>MAP watch</td><td><Badge tone="success">Healthy</Badge></td><td>9,316</td></tr></tbody></table></article>
      </section>
      <section className="lifecycle-band" aria-labelledby="lifecycle-title">
        <h2 id="lifecycle-title">One workflow, the full web-data lifecycle.</h2>
        <p>Open a capability to see its working example with the relevant request and inputs already selected.</p>
        <div className="capability-links">{['Search','Fetch & render','Browser actions','Extract','Compare','Collect','Qualify','Enrich','Batch','Monitor','API','MCP'].map((item) => <Link href={item === 'API' || item === 'MCP' ? '/developers' : item === 'Monitor' ? '/monitors' : '/build'} key={item}>{item} ↗</Link>)}</div>
        <div className="free-preview"><strong>Free preview</strong><span>Search and single-page Fetch/Extract are free within live caps.</span></div>
      </section>
      <section className="home-support">
        <article className="support-card"><Eyebrow>Built for developers</Eyebrow><h2>The same task. In your application.</h2><p>Submit a task, keep its ID, and retrieve the result when it&apos;s ready.</p><div className="endpoint-line"><span>POST</span><code>/v1/tasks</code><span>Task interface</span></div><Link href="/developers" className="text-link">Explore the request shape ↗</Link></article>
        <article className="support-card evidence-card"><Eyebrow>Evidence is part of the result</Eyebrow><h2>See where the answer came from.</h2><p>Keep source text, retrieval details and exact quotes beside the fields they support.</p><ul><li><span>01</span>Your public HTTPS sources</li><li><span>02</span>Structured, inspectable output</li><li><span>03</span>Source evidence you can review</li></ul></article>
      </section>
    </div>
  );
}
