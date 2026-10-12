'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Clock3, Database, FileText, Layers3, Search } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/design-system';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

const pageDestinations = [
  ['Home', '/'],
  ['New workflow', '/build'],
  ['Search · Pages', '/search?tab=pages'],
  ['Search · Companies', '/search?tab=companies'],
  ['Pipelines', '/pipelines'],
  ['Runs · All runs', '/runs?tab=all'],
  ['Runs · Batches', '/runs?tab=batches'],
  ['Runs · Saved', '/runs?tab=saved'],
  ['Review inbox', '/review'],
  ['Datasets · All', '/datasets'],
  ['Datasets · Enrichments', '/datasets?type=enrichment'],
  ['Monitors', '/monitors'],
  ['Developers · API & MCP', '/developers?tab=api'],
  ['Developers · Webhooks', '/developers?tab=webhooks'],
  ['Usage', '/usage'],
  ['Settings', '/settings'],
] as const;

const recentItems = [
  ['Run · run_7f3a', '/runs/run_7f3a', Clock3],
  ['Run · run_batch_91af', '/runs/run_batch_91af', Clock3],
  ['Pipeline · Competitor prices', '/pipelines/competitor-prices', Layers3],
  ['Pipeline · Outdoor catalogue', '/pipelines', Layers3],
  ['Dataset · Competitor prices', '/datasets/competitor-prices', Database],
  ['Dataset · Outdoor catalogue', '/datasets?type=dataset', Database],
] as const;

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  function goTo(href: string) {
    setOpen(false);
    if (href === '/build' && pathname === '/build') {
      window.dispatchEvent(new CustomEvent('studio:new-workflow'));
      return;
    }
    router.push(href);
  }

  return (
    <>
      <Button variant="secondary" className="command-trigger" onClick={() => setOpen(true)} aria-label="Open command palette">
        <Search aria-hidden="true" />
        <kbd>⌘K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="command-dialog">
          <DialogHeader className="sr-only">
            <DialogTitle>Command palette</DialogTitle>
            <DialogDescription>Jump to a Studio page or open a recent item.</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Search pages, runs, pipelines and datasets…" autoFocus />
            <CommandList>
              <CommandEmpty>No matching destination.</CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => goTo('/build')}><FileText />New workflow<CommandShortcut>Action</CommandShortcut></CommandItem>
                <CommandItem onSelect={() => goTo('/review')}><ArrowRight />Open review inbox<CommandShortcut>Action</CommandShortcut></CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Pages and tabs">
                {pageDestinations.map(([label, href]) => (
                  <CommandItem key={href} value={label} onSelect={() => goTo(href)}><ArrowRight />{label}</CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Recent">
                {recentItems.map(([label, href, Icon]) => (
                  <CommandItem key={label} value={label} onSelect={() => goTo(href)}><Icon />{label}</CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
