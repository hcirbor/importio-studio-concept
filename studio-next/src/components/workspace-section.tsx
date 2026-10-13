'use client';

import { redirect } from 'next/navigation';
import { CandidatesSection } from './discovery/candidates-section';
import { SearchSection } from './discovery/search-section';
import { BatchesSection, SavedRunsSection } from './workspace/library-sections';
import { DatasetsSection } from './workspace/datasets-section';
import { MonitorsSection } from './workspace/monitors-section';
import { PipelinesSection } from './workspace/pipelines-section';
import { RunsSection } from './workspace/runs-section';
import { DevelopersSection } from './workspace/developers-section';
import { SettingsSection } from './workspace/settings-section';
import { UsageSection } from './workspace/usage-section';
import { WebhooksSection } from './workspace/webhooks-section';
import { SectionTabs, useSectionTab, type SectionTab } from './workspace/section-tabs';
import { PageHead } from './workspace/shared';

const runTabs: SectionTab[] = [
  { value: 'all', label: 'All runs' },
  { value: 'batches', label: 'Batches' },
  { value: 'saved', label: 'Saved' },
];

const searchTabs: SectionTab[] = [
  { value: 'pages', label: 'Pages' },
  { value: 'companies', label: 'Companies' },
];

const developerTabs: SectionTab[] = [
  { value: 'api', label: 'API & MCP' },
  { value: 'webhooks', label: 'Webhooks' },
];

function RunsWorkspace() {
  const tab = useSectionTab('tab', runTabs, 'all');
  const headings = {
    all: ['All runs', 'Every execution, with scope, status, usage and actionable exceptions.'],
    batches: ['Batches', 'Bounded batches of 2–10 items with per-item status.'],
    saved: ['Saved', 'Saved runs available as labelled prior research.'],
  } as const;
  const [title, description] = headings[tab as keyof typeof headings];

  return <>
    <PageHead group="Operate" title={title} description={description} />
    <SectionTabs value={tab} tabs={runTabs} fallback="all" />
    {tab === 'batches' ? <BatchesSection showHeader={false} /> : null}
    {tab === 'saved' ? <SavedRunsSection showHeader={false} /> : null}
    {tab === 'all' ? <RunsSection showHeader={false} /> : null}
  </>;
}

function SearchWorkspace() {
  const tab = useSectionTab('tab', searchTabs, 'pages');
  const description = tab === 'companies'
    ? 'Discover first; qualify selected candidates separately.'
    : 'Ranked sources to inspect, not verified answers.';

  return <>
    <PageHead group="Build" title="Search" description={description} />
    <SectionTabs value={tab} tabs={searchTabs} fallback="pages" />
    {tab === 'companies' ? <CandidatesSection showHeader={false} /> : <SearchSection showHeader={false} />}
  </>;
}

function DevelopersWorkspace() {
  const tab = useSectionTab('tab', developerTabs, 'api');
  const title = tab === 'webhooks' ? 'Webhooks' : 'API & MCP';
  const description = tab === 'webhooks'
    ? 'Deliver completed runs and meaningful monitor changes to your systems.'
    : 'The same task model through API and MCP.';

  return <>
    <PageHead group="Develop" title={title} description={description} />
    <SectionTabs value={tab} tabs={developerTabs} fallback="api" />
    {tab === 'webhooks' ? <WebhooksSection showHeader={false} /> : <DevelopersSection showHeader={false} />}
  </>;
}

const legacyRedirects: Record<string, string> = {
  memories: '/runs?tab=saved',
  groups: '/runs?tab=batches',
  candidates: '/search?tab=companies',
  qualify: '/search?tab=companies&view=qualified',
  webhooks: '/developers?tab=webhooks',
  enrich: '/datasets?type=enrichment',
};

export function WorkspaceSection({ section }: { section: string }) {
  if (legacyRedirects[section]) redirect(legacyRedirects[section]);

  const content = section === 'runs' ? <RunsWorkspace />
    : section === 'search' ? <SearchWorkspace />
      : section === 'developers' ? <DevelopersWorkspace />
        : section === 'datasets' ? <DatasetsSection />
          : section === 'pipelines' ? <PipelinesSection />
            : section === 'monitors' ? <MonitorsSection />
              : section === 'usage' ? <UsageSection />
              : section === 'settings' ? <SettingsSection />
                : <PipelinesSection />;

  return <div className="page">{content}</div>;
}
