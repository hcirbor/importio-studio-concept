'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Role, useStudio } from '@/lib/data';

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const auth = useStudio((snapshot) => ({
    currentWorkspace: snapshot.auth.currentWorkspace,
    workspaces: snapshot.auth.workspaces,
    switchWorkspace: snapshot.auth.switchWorkspace,
    createWorkspace: snapshot.auth.createWorkspace,
  }));
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const workspace = auth.currentWorkspace;

  function selectWorkspace(id: string) {
    auth.switchWorkspace(id);
    setOpen(false);
    router.push('/');
  }

  function createWorkspace() {
    if (!workspaceName.trim()) return;
    auth.createWorkspace(workspaceName);
    setWorkspaceName('');
    setCreating(false);
    setOpen(false);
    router.push('/');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setCreating(false);
      }}
    >
      <Tooltip><TooltipTrigger asChild><Button
        variant="ghost"
        className={collapsed ? 'workspace-card workspace-card-collapsed' : 'workspace-card'}
        aria-label={`Switch workspace · ${workspace?.name ?? 'Import.io Studio'}`}
        onClick={() => setOpen(true)}
      >
        <span className="workspace-icon">{workspace?.name.slice(0, 1) ?? 'I'}</span>
        <span>
          <strong>{workspace?.name ?? 'Import.io Studio'}</strong>
          <small>{workspace?.subtitle ?? 'Demo workspace'}</small>
        </span>
        <span className="workspace-chevron">⌄</span>
      </Button></TooltipTrigger>{collapsed ? <TooltipContent side="right">{workspace?.name ?? 'Import.io Studio'} · {workspace?.subtitle ?? 'Demo workspace'}</TooltipContent> : null}</Tooltip>
      <DialogContent className="workspace-dialog">
        <DialogHeader>
          <DialogTitle>Switch workspace</DialogTitle>
          <DialogDescription>Your role and demo data change with the workspace.</DialogDescription>
        </DialogHeader>
        <div className="workspace-options">
          {auth.workspaces.map((item) => (
            <Button variant="ghost" key={item.id} onClick={() => selectWorkspace(item.id)}>
              <span className="workspace-icon">{item.name.slice(0, 1)}</span>
              <span>
                <strong>{item.name}</strong>
                <small>{item.subtitle}</small>
              </span>
              {item.id === workspace?.id ? <Check size={17} /> : null}
            </Button>
          ))}
          {creating ? (
            <div className="workspace-create">
              <label htmlFor="workspace-name">Workspace name</label>
              <input
                id="workspace-name"
                autoFocus
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') createWorkspace();
                }}
              />
              <div>
                <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                <Button onClick={createWorkspace} disabled={!workspaceName.trim()}>Create</Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <Plus size={17} />
              Create workspace
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UserMenu({ compact = false, rail = false }: { compact?: boolean; rail?: boolean }) {
  const auth = useStudio((snapshot) => ({
    currentUser: snapshot.auth.currentUser,
    currentRole: snapshot.auth.currentRole,
    signOut: snapshot.auth.signOut,
    setDemoRole: snapshot.auth.setDemoRole,
  }));
  const router = useRouter();
  const user = auth.currentUser;
  const initials = user?.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JD';

  function signOut() {
    auth.signOut();
    router.replace('/login');
  }

  return (
    <DropdownMenu>
      <Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild>
        <button
          type="button"
          className={compact || rail ? `avatar user-menu-trigger${rail ? ' sidebar-user-avatar' : ''}` : 'profile user-menu-trigger'}
          aria-label="Open user menu"
        >
          {compact || rail ? initials : (
            <>
              <span>{initials}</span>
              <div>
                <strong>{user?.name}</strong>
                <small>{auth.currentRole}</small>
              </div>
            </>
          )}
        </button>
      </DropdownMenuTrigger></TooltipTrigger>{rail ? <TooltipContent side="right">{user?.name} · {auth.currentRole}</TooltipContent> : null}</Tooltip>
      <DropdownMenuContent className="user-menu-dropdown" align={compact ? 'end' : 'start'} side={compact ? 'bottom' : 'right'}>
        <DropdownMenuLabel className="user-menu-identity">
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
          <small>{auth.currentRole}</small>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/settings')}>Profile</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="user-menu-section-label">View as <span>(demo only)</span></DropdownMenuLabel>
        <DropdownMenuRadioGroup value={auth.currentRole ?? undefined} onValueChange={(value) => auth.setDemoRole(value as Role)}>
          {(['Owner', 'Admin', 'Editor', 'Viewer'] as Role[]).map((role) => (
            <DropdownMenuRadioItem key={role} value={role}>{role}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
