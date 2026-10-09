'use client';

import Link from 'next/link';
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type UIEvent } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Activity, Braces, CheckSquare2, Database, Home,
  Layers3, MonitorDot, PanelLeft, Plus, Search, Settings, Table2,
} from 'lucide-react';
import { ThemeControl } from './theme-control';
import { CommandPalette } from './command-palette';
import { resolveWorkflowTemplate, workflowTemplates } from './workflow-config';
import { ReviewRailCount } from './review-state';
import { BrandMark, Button } from '@/components/design-system';
import { useAuth } from '@/lib/auth';
import { UserMenu, WorkspaceSwitcher } from './auth-controls';

const groups = [
  { label: 'Build', items: [
    { href: '/build', label: 'New workflow', icon: Plus },
    { href: '/search', label: 'Search', icon: Search },
  ] },
  { label: 'Operate', items: [
    { href: '/pipelines', label: 'Pipelines', icon: Layers3 },
    { href: '/runs', label: 'Runs', icon: Activity },
    { href: '/review', label: 'Review', icon: CheckSquare2, count: 1 },
    { href: '/datasets', label: 'Datasets', icon: Table2 },
    { href: '/monitors', label: 'Monitors', icon: MonitorDot },
  ] },
  { label: 'Develop', items: [
    { href: '/developers', label: 'Developers', icon: Braces },
    { href: '/usage', label: 'Usage', icon: Database },
  ] },
];

type QueryReader = { get: (name: string) => string | null };

function pageTitle(pathname: string, searchParams: QueryReader): [string, string, string] {
  if (pathname === '/') return ['Studio', 'Home', 'Home'];
  if (pathname === '/build') return ['Build', 'Research', 'Build'];
  if (pathname === '/runs') {
    const tab = searchParams.get('tab');
    if (tab === 'saved') return ['Runs', 'Saved', 'Saved runs'];
    if (tab === 'batches') return ['Runs', 'Batches', 'Batches'];
    return ['Runs', 'All runs', 'All runs'];
  }
  if (pathname === '/search') {
    const current = searchParams.get('tab') === 'companies' ? 'Companies' : 'Pages';
    return ['Search', current, current];
  }
  if (pathname === '/developers') {
    const current = searchParams.get('tab') === 'webhooks' ? 'Webhooks' : 'API & MCP';
    return ['Developers', current, current];
  }
  if (pathname === '/datasets') {
    const type = searchParams.get('type');
    const current = type === 'enrichment' ? 'Enrichments' : type === 'dataset' ? 'Datasets' : 'All';
    return ['Datasets', current, 'Datasets'];
  }
  if (pathname.startsWith('/runs/')) return ['Runs', pathname.split('/').at(-1) ?? 'Run detail', 'Run detail'];
  if (pathname.startsWith('/datasets/')) {
    const datasetName = pathname.split('/').at(-1)?.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase()) ?? 'Dataset';
    return ['Datasets', datasetName, datasetName];
  }
  if (pathname.includes('competitor-prices')) return ['Pipelines', 'Competitor prices', 'Competitor prices'];
  const name = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Home';
  const current = name.replace(/^./, (letter) => letter.toUpperCase());
  return ['Studio', current, current];
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
  const [parent, defaultCurrent, documentPageTitle] = pageTitle(pathname, searchParams);
  const current = pathname === '/build'
    ? liveBuildTitle ?? workflowTemplates[resolveWorkflowTemplate(searchParams.get('template'))].title
    : defaultCurrent;
  const parentHref = parentBreadcrumbHref(pathname);
  const fullDocumentTitle = `${documentPageTitle} · Import.io Studio`;

  useEffect(() => {
    const syncDocumentTitle = () => {
      if (document.title !== fullDocumentTitle) document.title = fullDocumentTitle;
    };
    syncDocumentTitle();
    const observer = new MutationObserver(syncDocumentTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [fullDocumentTitle]);

  return (
    <>
      <title>{fullDocumentTitle}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {parentHref ? <Link href={parentHref}>{parent}</Link> : <span>{parent}</span>}
        <i aria-hidden="true">/</i>
        <strong aria-current="page">{current}</strong>
      </nav>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const [navOpen, setNavOpen] = useState(false);
  const runsBadge = auth.runs.filter((run) => run.badge).length;
  const hasWorkspaceReview = auth.runs.some((run) => run.outcome === 'Partial');
  const previousPathname = useRef(pathname);
  const sidebarRef = useRef<HTMLElement>(null);
  const stableSidebarScroll = useRef(0);
  const pendingSidebarRestore = useRef(false);
  const sidebarScrollTimer = useRef<number | null>(null);

  useEffect(() => {
    if (previousPathname.current !== pathname) toast.dismiss();
    previousPathname.current = pathname;
  }, [pathname]);

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
  useEffect(() => {
    if (!auth.ready) return;
    if (isAuthRoute && auth.session) {
      const requestedPath = pathname === '/login' ? new URLSearchParams(window.location.search).get('next') : null;
      router.replace(requestedPath || '/');
    }
    if (!isAuthRoute && !auth.session) router.replace(`/login?next=${encodeURIComponent(`${pathname}${window.location.search}`)}`);
  }, [auth.ready, auth.session, isAuthRoute, pathname, router]);

  if (isAuthRoute) return <>{children}</>;
  if (!auth.ready || !auth.session) return <div className="auth-loading"><span className="demo-chip">INTERACTIVE DEMO</span><p>Opening Studio…</p></div>;
  return (
    <div className="app-shell">
      {navOpen ? <Button variant="ghost" className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} /> : null}
      <aside ref={sidebarRef} onScroll={handleSidebarScroll} className={navOpen ? 'sidebar mobile-open' : 'sidebar'}>
        <Link href="/" className="brand" aria-label="Import.io Studio home" onClick={handleSidebarNavigation}>
          <BrandMark className="brand-mark" title="" />
          <span className="brand-name">import.io</span>
        </Link>
        <WorkspaceSwitcher />
        <nav aria-label="Primary navigation">
          <Link href="/" onClick={handleSidebarNavigation} className={pathname === '/' ? 'nav-item active' : 'nav-item'}><Home /><span>Home</span></Link>
          {groups.map((group) => (
            <section className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href === '/pipelines' && pathname.startsWith('/pipelines/'));
                const Icon = item.icon;
                const className = `${active ? 'nav-item active' : 'nav-item'}${item.label === 'Usage' ? ' usage-nav' : ''}`;
                return <Link href={item.href} onClick={handleSidebarNavigation} className={className} key={item.href}><Icon /><span>{item.label}</span>{item.label === 'Review' && hasWorkspaceReview ? <ReviewRailCount /> : item.label === 'Runs' && runsBadge > 0 ? <em>{runsBadge}</em> : null}{item.label === 'Usage' ? <span className="nav-usage-meter" role="progressbar" aria-label="Monthly usage: 36% of the spend alert" aria-valuemin={0} aria-valuemax={100} aria-valuenow={36} title="$8.98 estimated · 36% of $25 monthly alert"><i /></span> : null}</Link>;
              })}
            </section>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link href="/settings" onClick={handleSidebarNavigation} className={pathname === '/settings' ? 'nav-item active' : 'nav-item'}><Settings /><span>Settings</span></Link>
          <UserMenu />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Button variant="ghost" className="mobile-menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}><PanelLeft /></Button>
          <Suspense fallback={<div className="breadcrumbs"><span>Build</span><i>/</i><strong>Workflow</strong></div>}><Breadcrumbs pathname={pathname} /></Suspense>
          <div className="top-actions"><CommandPalette /><span className="demo-chip">INTERACTIVE DEMO</span><span className="ready-chip"><i /> API &amp; database ready</span><ThemeControl /><UserMenu compact /></div>
        </header>
        <main id="main">{auth.currentWorkspace?.empty && !['/build','/settings','/developers','/usage'].includes(pathname)
          ? <section className="empty-workspace"><span className="eyebrow">{auth.currentWorkspace.name}</span><h1>Nothing here yet</h1><p>This workspace is ready for its first workflow.</p><Button asChild><Link href="/build">Create a workflow</Link></Button></section>
          : children}</main>
      </div>
    </div>
  );
}
