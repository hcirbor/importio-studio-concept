'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity, BookOpen, Braces, CheckSquare2, Database, FileSearch, Home,
  Layers3, MonitorDot, PanelLeft, Plus, Search, Settings, Table2, Users,
} from 'lucide-react';
import { BrandMark } from '@/components/design-system';
import { ThemeControl } from './theme-control';

const groups = [
  { label: 'Build', items: [{ href: '/build', label: 'New workflow', icon: Plus }] },
  { label: 'Operate', items: [
    { href: '/pipelines', label: 'Pipelines', icon: Layers3 },
    { href: '/runs', label: 'Runs', icon: Activity, count: 3 },
    { href: '/datasets', label: 'Datasets', icon: Table2 },
    { href: '/monitors', label: 'Monitors', icon: MonitorDot },
    { href: '/review', label: 'Review', icon: CheckSquare2, count: 1 },
  ] },
  { label: 'Library', items: [
    { href: '/memories', label: 'Memories', icon: BookOpen },
    { href: '/groups', label: 'Groups', icon: Users },
    { href: '/enrich', label: 'Enrich', icon: Database },
  ] },
  { label: 'Discovery', items: [
    { href: '/search', label: 'Search', icon: Search },
    { href: '/candidates', label: 'Candidates', icon: FileSearch },
    { href: '/qualify', label: 'Qualify', icon: CheckSquare2 },
  ] },
  { label: 'Reference', items: [
    { href: '/developers', label: 'Developers', icon: Braces },
    { href: '/webhooks', label: 'Webhooks', icon: Activity },
    { href: '/usage', label: 'Usage', icon: Database },
    { href: '/settings', label: 'Settings', icon: Settings },
  ] },
];

function pageTitle(pathname: string) {
  if (pathname === '/') return ['Studio', 'Home'];
  if (pathname === '/build') return ['Build', 'Research'];
  if (pathname.startsWith('/runs/')) return ['Runs', pathname.split('/').at(-1) ?? 'Run detail'];
  if (pathname.startsWith('/datasets/')) return ['Datasets', 'Competitor prices'];
  if (pathname.includes('competitor-prices')) return ['Pipelines', 'Competitor prices'];
  const name = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Home';
  return ['Studio', name.replace(/^./, (letter) => letter.toUpperCase())];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [parent, current] = pageTitle(pathname);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Import.io Studio home">
          <BrandMark className="brand-mark" />
          <span>import.io</span>
        </Link>
        <button className="workspace-card" type="button">
          <span className="workspace-icon">I</span>
          <span><strong>Import.io Studio</strong><small>Demo workspace</small></span>
        </button>
        <nav aria-label="Primary navigation">
          <Link href="/" className={pathname === '/' ? 'nav-item active' : 'nav-item'}><Home /><span>Home</span></Link>
          {groups.map((group) => (
            <section className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href === '/pipelines' && pathname.startsWith('/pipelines/'));
                const Icon = item.icon;
                return <Link href={item.href} className={active ? 'nav-item active' : 'nav-item'} key={item.href}><Icon /><span>{item.label}</span>{item.count ? <em>{item.count}</em> : null}</Link>;
              })}
            </section>
          ))}
        </nav>
        <div className="profile"><span>JD</span><div><strong>Jordan Davis</strong><small>Personal workspace</small></div></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation"><PanelLeft /></button>
          <div className="breadcrumbs"><span>{parent}</span><i>/</i><strong>{current}</strong></div>
          <div className="top-actions"><span className="demo-chip">INTERACTIVE DEMO</span><span className="ready-chip"><i /> API &amp; database ready</span><ThemeControl /><span className="avatar">JD</span></div>
        </header>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
