'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type { CapabilityId, PermissionAction, Role, StudioDataSource, StudioSnapshot } from '@/lib/data/StudioDataSource';
import { createMockStudioDataSource } from '@/lib/data/mock/mock-control-plane';

export {
  isNotificationChannel,
  isRole,
  pipelineVersionForRepair,
  ROLE_VALUES,
} from '@/lib/data/StudioDataSource';
export type {
  CapabilityId,
  DatasetRecord,
  Member,
  NotificationChannel,
  PermissionAction,
  Role,
  RunPresentation,
  RunWorker,
  RunWorkerState,
  StudioDataSource,
  StudioSnapshot,
  WorkspaceApiKey,
  WorkspaceDataset,
  WorkspaceEnrichment,
  WorkspaceRun,
} from '@/lib/data/StudioDataSource';

export const viewerTooltip = "Viewers can't run workflows. Ask an Admin for Editor access.";

const permissions: Record<Role, Set<PermissionAction>> = {
  Owner: new Set(['run','review','promote','create_monitor','create_dataset','manage_members','assign_owner','manage_api_keys','manage_webhooks','manage_billing','delete_workspace']),
  Admin: new Set(['run','review','promote','create_monitor','create_dataset','manage_members','manage_api_keys','manage_webhooks']),
  Editor: new Set(['run','review','promote','create_monitor','create_dataset']),
  Viewer: new Set(),
};

export function can(user: { role: Role } | null | undefined, action: PermissionAction) {
  return Boolean(user && permissions[user.role].has(action));
}

function getStudioDataSource(): StudioDataSource {
  return createMockStudioDataSource();
}

const StudioDataContext = createContext<StudioDataSource | null>(null);

export function StudioDataProvider({ children, source: providedSource }: { children?: React.ReactNode; source?: StudioDataSource }) {
  const [defaultSource] = useState(getStudioDataSource);
  const source = providedSource ?? defaultSource;

  useEffect(() => {
    source.initialize();
  }, [source]);

  return <StudioDataContext.Provider value={source}>{children}</StudioDataContext.Provider>;
}

export function useStudio<T>(selector: (snapshot: StudioSnapshot) => T): T {
  const source = useContext(StudioDataContext);
  if (!source) throw new Error('useStudio must be used within StudioDataProvider');
  return useSyncExternalStoreWithSelector(
    source.subscribe,
    source.getSnapshot,
    source.getSnapshot,
    selector,
    shallowEqual,
  );
}

export function useCapability(id: CapabilityId) {
  return useStudio((snapshot) => snapshot.capabilities[id]);
}

function shallowEqual<T>(left: T, right: T) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && Object.is(Reflect.get(left, key), Reflect.get(right, key)));
}
