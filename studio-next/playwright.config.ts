import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/unit/**', '**/labelled/**', '**/restricted/**'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{platform}/{arg}{ext}',
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
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixels: 0,
    },
  },
  webServer: {
    command: 'npm run build && node scripts/serve-static.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
