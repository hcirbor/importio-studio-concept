import type { CapabilityMap } from '@/lib/data/StudioDataSource';

const available = { status: 'available' as const };

export const mockCapabilities: CapabilityMap = Object.freeze({
  'workflow-planning': available,
  'run-execution': available,
  evidence: available,
  search: available,
  enrichment: available,
  monitors: available,
  workspaces: available,
  members: available,
  humanReview: available,
  datasets: available,
  pipelines: available,
  'api-keys': available,
});
