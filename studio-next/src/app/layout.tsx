import type { Metadata } from 'next';
import '@importio/design-system/styles.css';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { ReviewStateProvider } from '@/components/review-state';
import { Toaster } from '@/components/ui/sonner';
import { DemoAuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: { default: 'Home · Import.io Studio', template: '%s · Import.io Studio' },
  description: 'Design-system-backed Import.io Studio application.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body><DemoAuthProvider><ReviewStateProvider><AppShell>{children}</AppShell><Toaster /></ReviewStateProvider></DemoAuthProvider></body>
    </html>
  );
}
