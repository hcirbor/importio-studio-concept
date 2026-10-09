'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

export function Command({ className = '', ...props }: ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive className={`command ${className}`.trim()} {...props} />;
}

export function CommandInput({ className = '', ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="command-input-wrap" cmdk-input-wrapper="">
      <Search aria-hidden="true" />
      <CommandPrimitive.Input className={`command-input ${className}`.trim()} {...props} />
    </div>
  );
}

export function CommandList({ className = '', ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List className={`command-list ${className}`.trim()} {...props} />;
}

export function CommandEmpty({ className = '', ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className={`command-empty ${className}`.trim()} {...props} />;
}

export function CommandGroup({ className = '', ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
  return <CommandPrimitive.Group className={`command-group ${className}`.trim()} {...props} />;
}

export function CommandItem({ className = '', ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return <CommandPrimitive.Item className={`command-item ${className}`.trim()} {...props} />;
}

export function CommandSeparator({ className = '', ...props }: ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator className={`command-separator ${className}`.trim()} {...props} />;
}

export function CommandShortcut({ className = '', ...props }: ComponentProps<'span'>) {
  return <span className={`command-shortcut ${className}`.trim()} {...props} />;
}
