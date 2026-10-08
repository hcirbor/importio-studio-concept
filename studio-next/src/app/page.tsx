import Link from 'next/link';
import { Activity, Database, Globe2, Search, ShieldCheck } from 'lucide-react';
import { Badge, Eyebrow } from '@/components/design-system';

const workflows = [
  { title: 'Research', description: 'Find and compare facts, with a source behind every answer.', hint: 'Pricing, policies or market questions', meta: 'Known sources', icon: Search, href: '/build?template=research' },
  { title: 'Extract', description: 'Turn known pages into the exact typed fields you need.', hint: 'A product, article or company page', meta: 'One source', icon: Globe2, href: '/build?template=extract' },
  { title: 'Build a dataset', description: 'Follow links, qualify records and add researched columns.', hint: 'A catalogue, directory or supplier market', meta: 'Bounded navigation', icon: Database, href: '/build?template=collect' },
  { title: 'Monitor', description: 'Keep approved pipelines current and review meaningful changes.', hint: 'A page that needs a trusted baseline', meta: 'Baseline first', icon: Activity, href: '/monitors' },
];

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <Eyebrow>Your web data workspace</Eyebrow>
          <h1>From web pages<br />to data you can trust.</h1>
          <p>Describe the outcome. Studio plans and performs the web work, then returns structured records with the evidence close at hand.</p>
          <div className="hero-signals"><span>Visible execution</span><span>Structured output</span><span>Traceable evidence</span></div>
        </div>
        <aside className="proof-card" aria-label="Evidence example">
          <div className="proof-head"><strong>Evidence stays with the value</strong><Badge tone="success"><ShieldCheck size={13} /> Supported</Badge></div>
          <div className="proof-body">
            <div className="proof-row"><span><small>Product</small><br /><strong>Trailhead 2P Tent</strong></span><code>product</code></div>
            <div className="proof-row"><span><small>Price</small><br /><strong>€249.00</strong></span><code>price</code></div>
            <div className="proof-row"><span><small>Availability</small><br /><strong>In stock</strong></span><code>availability</code></div>
            <div className="evidence-quote"><b>“</b><span>Trailhead 2P Tent — €249.00 — In stock.<small> northwind-outdoors.example</small></span></div>
          </div>
        </aside>
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
        <article className="panel"><div className="section-head"><h2>Needs attention</h2><Badge tone="warning">1 item</Badge></div><div className="panel-body"><div className="attention-item"><span>!</span><div><strong>Trailhead availability is unknown</strong><small>Competitor prices · unresolved field</small></div><Link href="/review" className="text-link">Review</Link></div></div></article>
        <article className="panel"><div className="section-head"><h2>Recent pipelines</h2><Link href="/pipelines" className="text-link">View all</Link></div><table className="data-table"><thead><tr><th>Pipeline</th><th>Status</th><th>Records</th></tr></thead><tbody><tr><td><Link href="/pipelines/competitor-prices">Competitor prices</Link></td><td><Badge tone="warning">Needs review</Badge></td><td>3</td></tr><tr><td>Outdoor catalogue</td><td><Badge tone="success">Completed</Badge></td><td>1,284</td></tr><tr><td>MAP watch</td><td><Badge tone="success">Healthy</Badge></td><td>9,316</td></tr></tbody></table></article>
      </section>
    </div>
  );
}
