import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3102';

export default defineConfig({
  testDir: './tests/restricted',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    locale: 'en-GB',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: {
      cookies: [],
      origins: [{
        origin: baseURL,
        localStorage: [{
          name: 'importio-studio-demo-auth',
          value: JSON.stringify({
            session: {
              user: { id: 'jordan', name: 'Jordan Davis', email: 'jordan@example.com' },
              workspaceId: 'studio',
              role: 'Owner',
            },
          }),
        }],
      }],
    },
  },
  webServer: {
    command: 'NEXT_PUBLIC_SHOW_STATUS_TAGS=false NEXT_PUBLIC_CAPABILITY_PROFILE=citeotter npm run build && PORT=3102 node scripts/serve-static.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
