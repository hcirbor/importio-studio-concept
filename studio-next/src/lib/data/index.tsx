'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { PermissionAction, Role, StudioDataSource, StudioSnapshot } from '@/lib/data/StudioDataSource';
import { createMockStudioDataSource } from '@/lib/data/mock/mock-control-plane';

export * from '@/lib/data/StudioDataSource';

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

export function StudioDataProvider({ children }: { children: React.ReactNode }) {
  const [source] = useState(getStudioDataSource);

  useEffect(() => {
    source.initialize();
  }, [source]);

  return <StudioDataContext.Provider value={source}>{children}</StudioDataContext.Provider>;
}

export function useStudio<T>(selector: (snapshot: StudioSnapshot) => T): T {
  const source = useContext(StudioDataContext);
  if (!source) throw new Error('useStudio must be used within StudioDataProvider');
  const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  return selector(snapshot);
}
