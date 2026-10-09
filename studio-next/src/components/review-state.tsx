'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';

type ReviewStateValue = {
  hasReviewItem: boolean;
  reviewCount: number;
  pipelineVersion: number;
  pipelineStatus: 'Needs review' | 'Healthy';
  acceptReviewItem: () => void;
  restoreReviewItem: () => void;
  promotePipeline: () => void;
};

const ReviewStateContext = createContext<ReviewStateValue | null>(null);
const reviewStateKey = 'importio-studio-review-state';
type WorkspaceReviewState = { hasReviewItem: boolean; pipelineVersion: number };
type ReviewStateMap = Record<string, WorkspaceReviewState>;
const seededReviewState: ReviewStateMap = {
  studio: { hasReviewItem: true, pipelineVersion: 4 },
  northwind: { hasReviewItem: false, pipelineVersion: 4 },
};

export function ReviewStateProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [workspaceState, setWorkspaceState] = useState<ReviewStateMap>(seededReviewState);
  const [stateReady, setStateReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(reviewStateKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ReviewStateMap | WorkspaceReviewState;
          if ('hasReviewItem' in parsed) {
            setWorkspaceState({ ...seededReviewState, studio: parsed as WorkspaceReviewState });
          } else {
            setWorkspaceState({ ...seededReviewState, ...parsed });
          }
        } catch {
          window.localStorage.removeItem(reviewStateKey);
        }
      }
      setStateReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!stateReady) return;
    window.localStorage.setItem(reviewStateKey, JSON.stringify(workspaceState));
  }, [stateReady, workspaceState]);
  const workspaceId = auth.session?.workspaceId ?? 'studio';
  const current = workspaceState[workspaceId] ?? { hasReviewItem: false, pipelineVersion: 4 };
  const updateCurrent = useCallback((updates: Partial<WorkspaceReviewState>) => {
    setWorkspaceState((all) => ({ ...all, [workspaceId]: { ...(all[workspaceId] ?? { hasReviewItem: false, pipelineVersion: 4 }), ...updates } }));
  }, [workspaceId]);
  const acceptReviewItem = useCallback(() => updateCurrent({ hasReviewItem: false }), [updateCurrent]);
  const restoreReviewItem = useCallback(() => updateCurrent({ hasReviewItem: true }), [updateCurrent]);
  const promotePipeline = useCallback(() => updateCurrent({ pipelineVersion: 5 }), [updateCurrent]);
  const value = useMemo(() => ({
    hasReviewItem: current.hasReviewItem,
    reviewCount: current.hasReviewItem ? 1 : 0,
    pipelineVersion: current.pipelineVersion,
    pipelineStatus: current.hasReviewItem ? 'Needs review' as const : 'Healthy' as const,
    acceptReviewItem,
    restoreReviewItem,
    promotePipeline,
  }), [acceptReviewItem, current.hasReviewItem, current.pipelineVersion, promotePipeline, restoreReviewItem]);
  return (
    <ReviewStateContext.Provider value={value}>
      {children}
    </ReviewStateContext.Provider>
  );
}

export function useReviewState() {
  const state = useContext(ReviewStateContext);
  if (!state) throw new Error('useReviewState must be used within ReviewStateProvider');
  return state;
}

export function ReviewRailCount() {
  const { reviewCount } = useReviewState();
  return reviewCount > 0 ? <em>{reviewCount}</em> : null;
}
