'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function useQualificationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showQualifications, setShowQualifications] = useState(searchParams.get('view') === 'qualified');

  function setQualificationView(open: boolean) {
    setShowQualifications(open);
    const next = new URLSearchParams(searchParams.toString());
    if (open) next.set('view', 'qualified');
    else next.delete('view');
    router.replace(`/search?${next.toString()}`, { scroll: false });
  }

  return { showQualifications, setQualificationView };
}
