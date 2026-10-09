'use client';

import type { ComponentType } from 'react';
import {
  CandidatesSection,
  QualifySection,
  SearchSection,
} from './workspace/discovery-sections';
import {
  EnrichSection,
  GroupsSection,
  MemoriesSection,
} from './workspace/library-sections';
import {
  DatasetsSection,
  MonitorsSection,
  PipelinesSection,
  RunsSection,
} from './workspace/operate-sections';
import {
  DevelopersSection,
  SettingsSection,
  UsageSection,
  WebhooksSection,
} from './workspace/reference-sections';
import {
  isWorkspaceSectionSlug,
  type WorkspaceSectionSlug,
} from './workspace/registry';

const sections: Record<WorkspaceSectionSlug, ComponentType> = {
  pipelines: PipelinesSection,
  runs: RunsSection,
  datasets: DatasetsSection,
  monitors: MonitorsSection,
  memories: MemoriesSection,
  groups: GroupsSection,
  enrich: EnrichSection,
  search: SearchSection,
  candidates: CandidatesSection,
  qualify: QualifySection,
  developers: DevelopersSection,
  webhooks: WebhooksSection,
  usage: UsageSection,
  settings: SettingsSection,
};

export function WorkspaceSection({ section }: { section: string }) {
  const Section = isWorkspaceSectionSlug(section) ? sections[section] : PipelinesSection;
  return <div className="page"><Section /></div>;
}
