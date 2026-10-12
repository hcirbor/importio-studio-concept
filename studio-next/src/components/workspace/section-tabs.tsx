'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/design-system';

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

  function changeTab(nextValue: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextValue === fallback) next.delete(param);
    else next.set(param, nextValue);
    if (param === 'tab' && nextValue !== 'companies') next.delete('view');
    if (param === 'type' && nextValue !== 'enrichment') next.delete('create');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Tabs value={value} onValueChange={changeTab} className="workspace-section-tabs">
      <TabsList aria-label="Page sections">
        {tabs.map((tab) => <TabsTrigger value={tab.value} key={tab.value}>{tab.label}</TabsTrigger>)}
      </TabsList>
      {tabs.map((tab) => <TabsContent value={tab.value} forceMount hidden key={`${tab.value}-panel`} />)}
    </Tabs>
  );
}
