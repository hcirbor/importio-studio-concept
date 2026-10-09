'use client';

import Link from 'next/link';
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type UIEvent } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity, BookOpen, Braces, CheckSquare2, Database, FileSearch, Home,
  Layers3, MonitorDot, PanelLeft, Plus, Search, Settings, Table2, Users,
} from 'lucide-react';
import { ThemeControl } from './theme-control';
import { resolveWorkflowTemplate, workflowTemplates } from './workflow-config';
import { ReviewRailCount } from './review-state';
import { BrandMark, Button } from '@/components/design-system';

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

function pageTitle(pathname: string): [string, string] {
  if (pathname === '/') return ['Studio', 'Home'];
  if (pathname === '/build') return ['Build', 'Research'];
  if (pathname.startsWith('/runs/')) return ['Runs', pathname.split('/').at(-1) ?? 'Run detail'];
  if (pathname.startsWith('/datasets/')) return ['Datasets', 'Competitor prices'];
  if (pathname.includes('competitor-prices')) return ['Pipelines', 'Competitor prices'];
  const name = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Home';
  return ['Studio', name.replace(/^./, (letter) => letter.toUpperCase())];
}

function parentBreadcrumbHref(pathname: string) {
  if (pathname.startsWith('/runs/')) return '/runs';
  if (pathname.startsWith('/datasets/')) return '/datasets';
  if (pathname.startsWith('/pipelines/')) return '/pipelines';
  return null;
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const [liveBuildTitle, setLiveBuildTitle] = useState<string | null>(null);
  useEffect(() => {
    function updateBuildTitle(event: Event) {
      const title = (event as CustomEvent<string>).detail;
      if (typeof title === 'string' && title) setLiveBuildTitle(title);
    }
    window.addEventListener('studio:workflow-title', updateBuildTitle);
    return () => window.removeEventListener('studio:workflow-title', updateBuildTitle);
  }, []);
  const [parent, defaultCurrent] = pageTitle(pathname);
  const current = pathname === '/build'
    ? liveBuildTitle ?? workflowTemplates[resolveWorkflowTemplate(searchParams.get('template'))].title
    : defaultCurrent;
  const parentHref = parentBreadcrumbHref(pathname);

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {parentHref ? <Link href={parentHref}>{parent}</Link> : <span>{parent}</span>}
      <i aria-hidden="true">/</i>
      <strong aria-current="page">{current}</strong>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const stableSidebarScroll = useRef(0);
  const pendingSidebarRestore = useRef(false);
  const sidebarScrollTimer = useRef<number | null>(null);

  function handleSidebarScroll(event: UIEvent<HTMLElement>) {
    const scrollTop = event.currentTarget.scrollTop;
    if (sidebarScrollTimer.current) window.clearTimeout(sidebarScrollTimer.current);
    sidebarScrollTimer.current = window.setTimeout(() => {
      stableSidebarScroll.current = scrollTop;
      sidebarScrollTimer.current = null;
    }, 120);
  }

  function handleSidebarNavigation() {
    if (sidebarScrollTimer.current) {
      window.clearTimeout(sidebarScrollTimer.current);
      sidebarScrollTimer.current = null;
    }
    pendingSidebarRestore.current = true;
    setNavOpen(false);
  }

  useLayoutEffect(() => {
    if (!pendingSidebarRestore.current || !sidebarRef.current) return;
    const sidebar = sidebarRef.current;
    const scrollTop = stableSidebarScroll.current;
    sidebar.scrollTop = scrollTop;
    const frame = requestAnimationFrame(() => {
      sidebar.scrollTop = scrollTop;
      pendingSidebarRestore.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setNavOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      if (sidebarScrollTimer.current) window.clearTimeout(sidebarScrollTimer.current);
    };
  }, []);
  return (
    <div className="app-shell">
      {navOpen ? <Button variant="ghost" className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} /> : null}
      <aside ref={sidebarRef} onScroll={handleSidebarScroll} className={navOpen ? 'sidebar mobile-open' : 'sidebar'}>
        <Link href="/" className="brand" aria-label="Import.io Studio home" onClick={handleSidebarNavigation}>
          <BrandMark className="brand-mark" title="" />
          <span className="brand-name">import.io</span>
        </Link>
        <Button variant="ghost" className="workspace-card" asChild>
          <Link href="/settings" onClick={handleSidebarNavigation}>
          <span className="workspace-icon">I</span>
          <span><strong>Import.io Studio</strong><small>Demo workspace</small></span>
          </Link>
        </Button>
        <nav aria-label="Primary navigation">
          <Link href="/" onClick={handleSidebarNavigation} className={pathname === '/' ? 'nav-item active' : 'nav-item'}><Home /><span>Home</span></Link>
          {groups.map((group) => (
            <section className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href === '/pipelines' && pathname.startsWith('/pipelines/'));
                const Icon = item.icon;
                return <Link href={item.href} onClick={handleSidebarNavigation} className={active ? 'nav-item active' : 'nav-item'} key={item.href}><Icon /><span>{item.label}</span>{item.label === 'Review' ? <ReviewRailCount /> : item.count ? <em>{item.count}</em> : null}</Link>;
              })}
            </section>
          ))}
        </nav>
        <div className="profile"><span>JD</span><div><strong>Jordan Davis</strong><small>Personal workspace</small></div></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Button variant="ghost" className="mobile-menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}><PanelLeft /></Button>
          <Suspense fallback={<div className="breadcrumbs"><span>Build</span><i>/</i><strong>Workflow</strong></div>}><Breadcrumbs pathname={pathname} /></Suspense>
          <div className="top-actions"><span className="demo-chip">INTERACTIVE DEMO</span><span className="ready-chip"><i /> API &amp; database ready</span><ThemeControl /><span className="avatar">JD</span></div>
        </header>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
