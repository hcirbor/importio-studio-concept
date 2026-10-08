'use client';

import { createContext, useContext, useState } from 'react';

type ReviewStateValue = {
  hasReviewItem: boolean;
  acceptReviewItem: () => void;
  restoreReviewItem: () => void;
};

const ReviewStateContext = createContext<ReviewStateValue | null>(null);

export function ReviewStateProvider({ children }: { children: React.ReactNode }) {
  const [hasReviewItem, setHasReviewItem] = useState(true);
  return (
    <ReviewStateContext.Provider value={{
      hasReviewItem,
      acceptReviewItem: () => setHasReviewItem(false),
      restoreReviewItem: () => setHasReviewItem(true),
    }}>
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
  const { hasReviewItem } = useReviewState();
  return hasReviewItem ? <em>1</em> : <em>0</em>;
}
