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
import { useStudio } from '@/lib/data';

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

export function CommandPalette() {
  const recentItems = useStudio((snapshot) => snapshot.fixtures.recentItems);
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
                {recentItems.map((item) => {
                  const Icon = item.kind === 'run' ? Clock3 : item.kind === 'pipeline' ? Layers3 : Database;
                  return <CommandItem key={item.label} value={item.label} onSelect={() => goTo(item.href)}><Icon />{item.label}</CommandItem>;
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
