'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const sectionListClass = 'inline-flex min-h-10 items-center gap-1 rounded-control bg-background p-1';
const sectionLinkClass = 'inline-flex min-h-8 items-center justify-center rounded-[var(--io-radius-sm)] px-3 text-sm font-medium text-muted transition-colors data-[state=active]:bg-surface data-[state=active]:text-link data-[state=active]:shadow-sm disabled:opacity-50';

export type SectionTab = {
  value: string;
  label: string;
};

export function useSectionTab(param: string, tabs: SectionTab[], fallback: string) {
  const searchParams = useSearchParams();
  const requested = searchParams.get(param);
  return tabs.some((tab) => tab.value === requested) ? requested as string : fallback;
}

export function SectionTabs({
  value,
  tabs,
  param = 'tab',
  fallback,
}: {
  value: string;
  tabs: SectionTab[];
  param?: string;
  fallback: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function hrefForTab(nextValue: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextValue === fallback) next.delete(param);
    else next.set(param, nextValue);
    if (param === 'tab' && nextValue !== 'companies') next.delete('view');
    if (param === 'type' && nextValue !== 'enrichment') next.delete('create');
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <nav className="workspace-section-tabs" aria-label="Page sections">
      <div className={sectionListClass}>
        {tabs.map((tab) => (
          <button
            type="button"
            aria-current={tab.value === value ? 'page' : undefined}
            data-state={tab.value === value ? 'active' : 'inactive'}
            className={sectionLinkClass}
            onClick={() => router.replace(hrefForTab(tab.value), { scroll: false })}
            key={tab.value}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
