import Link from 'next/link';
import { Activity, Database, Search } from 'lucide-react';
import { Button, Eyebrow } from '@/components/design-system';

const pages: Record<string, { group: string; title: string; description: string }> = {
  pipelines: { group: 'Operate', title: 'Pipelines', description: 'Reusable, governed web-data workflows.' },
  runs: { group: 'Operate', title: 'Runs', description: 'Watch execution, resolve input and inspect retained evidence.' },
  datasets: { group: 'Operate', title: 'Datasets', description: 'Structured outputs with field-level evidence.' },
  monitors: { group: 'Operate', title: 'Monitors', description: 'Track meaningful source changes over time.' },
  memories: { group: 'Library', title: 'Memories', description: 'Saved knowledge available to future workflows.' },
  groups: { group: 'Library', title: 'Groups', description: 'Organise reusable sources and entities.' },
  enrich: { group: 'Library', title: 'Enrich', description: 'Add researched fields to existing records.' },
  search: { group: 'Discovery', title: 'Search', description: 'Ranked sources to inspect, not unverified answers.' },
  candidates: { group: 'Discovery', title: 'Candidates', description: 'Discover first; qualify selected candidates separately.' },
  developers: { group: 'Reference', title: 'Developers', description: 'Build with the same task model through API and MCP.' },
  settings: { group: 'Reference', title: 'Settings', description: 'Workspace, data-handling and security preferences.' },
};

export function generateStaticParams() { return Object.keys(pages).map((section) => ({ section })); }

export default async function WorkspacePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params; const page = pages[section] ?? pages.pipelines;
  return <div className="page"><header className="page-head"><Eyebrow>{page.group}</Eyebrow><h1>{page.title}</h1><p>{page.description}</p></header><section className="panel empty-page"><div>{section === 'runs' ? <Activity /> : section === 'datasets' ? <Database /> : <Search />}<h2>{page.title} is ready for migration</h2><p className="muted">The Next.js shell, design tokens and navigation are in place. This screen can now move across without changing its visual language.</p><Button variant="primary" asChild style={{marginTop:18}}><Link href="/build">Create a workflow</Link></Button></div></section></div>;
}
