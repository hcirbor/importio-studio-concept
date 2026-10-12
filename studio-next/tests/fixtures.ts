import { expect, test as base } from '@playwright/test';

const fixedTime = new Date('2026-10-12T10:00:00Z').valueOf();

export const test = base.extend<{ consoleErrors: string[] }>({
  page: async ({ page }, use) => {
    await page.addInitScript(({ timestamp }) => {
      Date.now = () => timestamp;
    }, { timestamp: fixedTime });
    await use(page);
  },
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
  },
});

test.afterEach(async ({ consoleErrors }) => {
  expect(consoleErrors, 'Browser console errors').toEqual([]);
});

export { expect };

export async function waitForStudio(page: import('@playwright/test').Page) {
  await expect(page.getByRole('button', { name: 'Open command palette' })).toBeVisible();
}
