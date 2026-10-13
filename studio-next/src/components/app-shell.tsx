'use client';

import Link from 'next/link';
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactElement, type UIEvent } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Activity, Braces, CheckSquare2, Database, Home,
  Layers3, MonitorDot, PanelLeft, Plus, Search, Settings, Table2, Zap,
} from 'lucide-react';
import { ThemeControl } from './theme-control';
import { CommandPalette } from './command-palette';
import { BrandMark, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { UserMenu, WorkspaceSwitcher } from './auth-controls';

const groups = [
  { label: 'Build', items: [
    { href: '/build', label: 'New workflow', icon: Plus },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/try', label: 'Quick try', icon: Zap },
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
  if (pathname === '/build') return ['Build', 'New workflow', 'Build'];
  if (pathname === '/runs') {
    const tab = searchParams.get('tab');
    if (tab === 'saved') return ['Runs', 'Saved', 'Saved runs'];
    if (tab === 'batches') return ['Runs', 'Batches', 'Batches'];
    return ['Runs', 'All runs', 'All runs'];
  }
  if (pathname === '/search') {
    return ['Build', 'Search', 'Search'];
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
  if (pathname.startsWith('/pipelines/')) {
    const pipelineName = pathname.split('/')[2]?.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase()) ?? 'Pipeline';
    return ['Pipelines', pipelineName, pipelineName];
  }
  const name = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Home';
  const current = name.replace(/^./, (letter) => letter.toUpperCase());
  return ['Studio', current, current];
}

function RailTooltip({ enabled, label, children }: { enabled: boolean; label: string; children: ReactElement }) {
  if (!enabled) return children;
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent side="right">{label}</TooltipContent></Tooltip>;
}

function parentBreadcrumbHref(pathname: string) {
  if (pathname.startsWith('/runs/')) return '/runs';
  if (pathname.startsWith('/datasets/')) return '/datasets';
  if (pathname.startsWith('/pipelines/')) return '/pipelines';
  return null;
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const datasets = useStudio((snapshot) => snapshot.auth.datasets);
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
  const datasetPageTitle = pathname.startsWith('/datasets/')
    ? datasets.find((dataset) => dataset.id === pathname.split('/').at(-1))?.title
    : undefined;
  const current = pathname === '/build'
    ? liveBuildTitle ?? 'New workflow'
    : datasetPageTitle ?? defaultCurrent;
  const parentHref = parentBreadcrumbHref(pathname);
  const fullDocumentTitle = `${datasetPageTitle ?? documentPageTitle} · Import.io Studio`;

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
  const auth = useStudio((snapshot) => ({
    ready: snapshot.auth.ready,
    session: snapshot.auth.session,
    runs: snapshot.auth.runs,
    currentWorkspace: snapshot.auth.currentWorkspace,
  }));
  const reviewCount = useStudio((snapshot) => snapshot.humanReview.reviewCount);
  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);
  const [desktopNavigation, setDesktopNavigation] = useState(false);
  const runsBadge = auth.runs.filter((run) => run.badge).length;
  const previousPathname = useRef(pathname);
  const sidebarRef = useRef<HTMLElement>(null);
  const stableSidebarScroll = useRef(0);
  const pendingSidebarRestore = useRef(false);
  const sidebarScrollTimer = useRef<number | null>(null);

  useEffect(() => {
    if (previousPathname.current !== pathname) toast.dismiss();
    previousPathname.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const syncViewport = () => {
      setDesktopNavigation(media.matches);
      if (media.matches) setNavOpen(false);
    };
    const timer = window.setTimeout(() => {
      syncViewport();
      setSidebarCollapsed(window.localStorage.getItem('importio-studio-sidebar-collapsed') === 'true');
      setSidebarPreferenceLoaded(true);
    }, 0);
    media.addEventListener('change', syncViewport);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener('change', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceLoaded) return;
    window.localStorage.setItem('importio-studio-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed, sidebarPreferenceLoaded]);

  function toggleNavigation() {
    if (desktopNavigation) setSidebarCollapsed((collapsed) => !collapsed);
    else setNavOpen((open) => !open);
  }

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

  function handleNewWorkflow(event: MouseEvent<HTMLAnchorElement>) {
    if (pathname !== '/build') {
      handleSidebarNavigation();
      return;
    }
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('studio:new-workflow'));
    handleSidebarNavigation();
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
    function handleNavigationKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setNavOpen(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        if (desktopNavigation) setSidebarCollapsed((collapsed) => !collapsed);
        else setNavOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', handleNavigationKey);
    return () => {
      window.removeEventListener('keydown', handleNavigationKey);
      if (sidebarScrollTimer.current) window.clearTimeout(sidebarScrollTimer.current);
    };
  }, [desktopNavigation]);
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
  const rail = desktopNavigation && sidebarCollapsed;
  return (
    <TooltipProvider delayDuration={300}>
    <div className={rail ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      {navOpen ? <Button variant="ghost" className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} /> : null}
      <aside ref={sidebarRef} onScroll={handleSidebarScroll} className={navOpen ? 'sidebar mobile-open' : 'sidebar'}>
        <RailTooltip enabled={rail} label="Import.io Studio"><Link href="/" className="brand" aria-label="Import.io Studio home" onClick={handleSidebarNavigation}>
          <BrandMark className="brand-mark" title="" aria-hidden="true" />
          <span className="brand-name"><b>import.io</b><small>Studio</small></span>
        </Link></RailTooltip>
        <WorkspaceSwitcher collapsed={rail} />
        <nav aria-label="Primary navigation">
          <RailTooltip enabled={rail} label="Home"><Link href="/" aria-label="Home" onClick={handleSidebarNavigation} className={pathname === '/' ? 'nav-item active' : 'nav-item'}><Home /><span>Home</span></Link></RailTooltip>
          {groups.map((group) => (
            <section className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href === '/pipelines' && pathname.startsWith('/pipelines/'));
                const Icon = item.icon;
                const className = `${active ? 'nav-item active' : 'nav-item'}${item.label === 'Usage' ? ' usage-nav' : ''}`;
                const count = item.label === 'Review' ? reviewCount : item.label === 'Runs' ? runsBadge : 0;
                const tooltip = count > 0 ? `${item.label} · ${count} ${count === 1 ? 'item' : 'items'}` : item.label;
                const accessibleLabel = count > 0 ? `${item.label} ${count}` : item.label;
                return <RailTooltip enabled={rail} label={tooltip} key={item.href}><Link href={item.href} aria-label={accessibleLabel} onClick={item.href === '/build' ? handleNewWorkflow : handleSidebarNavigation} className={className}><Icon /><span>{item.label}</span>{item.label === 'Review' && reviewCount > 0 ? <em>{reviewCount}</em> : item.label === 'Runs' && runsBadge > 0 ? <em>{runsBadge}</em> : null}{item.label === 'Usage' ? <span className="nav-usage-meter" role="progressbar" aria-label="Monthly usage: 36% of the spend alert" aria-valuemin={0} aria-valuemax={100} aria-valuenow={36}><i /></span> : null}</Link></RailTooltip>;
              })}
            </section>
          ))}
        </nav>
        <div className="sidebar-footer">
          <RailTooltip enabled={rail} label="Settings"><Link href="/settings" aria-label="Settings" onClick={handleSidebarNavigation} className={pathname === '/settings' ? 'nav-item active' : 'nav-item'}><Settings /><span>Settings</span></Link></RailTooltip>
          <UserMenu rail={rail} />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-start">
            <Button variant="ghost" className="nav-toggle" aria-label={desktopNavigation ? (sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation') : (navOpen ? 'Close navigation' : 'Open navigation')} onClick={toggleNavigation}><PanelLeft /></Button>
            <Suspense fallback={<div className="breadcrumbs"><span>Build</span><i>/</i><strong>Workflow</strong></div>}><Breadcrumbs pathname={pathname} /></Suspense>
          </div>
          <div className="top-actions"><CommandPalette /><span className="demo-chip">INTERACTIVE DEMO</span><ThemeControl /><UserMenu compact /></div>
        </header>
        <main id="main">{auth.currentWorkspace?.empty && !['/build','/settings','/developers','/usage'].includes(pathname)
          ? <section className="empty-workspace"><span className="eyebrow">{auth.currentWorkspace.name}</span><h1>Nothing here yet</h1><p>This workspace is ready for its first workflow.</p><Button asChild><Link href="/build">Create a workflow</Link></Button></section>
          : children}</main>
      </div>
    </div>
    </TooltipProvider>
  );
}
