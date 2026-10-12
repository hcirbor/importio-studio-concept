import type { Page } from '@playwright/test';
import { expect, test, waitForStudio } from './fixtures';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
] as const;

async function ready(page: Page, path: string) {
  await page.goto(path);
  await waitForStudio(page);
  await page.evaluate(() => document.fonts.ready);
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} visual baselines`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test(`app shell expanded · ${viewport.name}`, async ({ page }) => {
      await ready(page, '/');
      if (viewport.name === 'mobile') await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(page).toHaveScreenshot(`app-shell-expanded-${viewport.name}.png`);
    });

    test(`app shell collapsed · ${viewport.name}`, async ({ page }) => {
      await ready(page, '/');
      if (viewport.name === 'desktop') {
        await page.getByRole('button', { name: 'Collapse navigation' }).click();
        await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
      }
      await expect(page).toHaveScreenshot(`app-shell-collapsed-${viewport.name}.png`);
    });

    test(`build step 1 · ${viewport.name}`, async ({ page }) => {
      await ready(page, '/build?template=extract');
      await expect(page).toHaveScreenshot(`build-step-1-${viewport.name}.png`);
    });

    test(`build step 2 · ${viewport.name}`, async ({ page }) => {
      await ready(page, '/build?template=extract');
      await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Confirm what Studio will do.' })).toBeVisible();
      await expect(page).toHaveScreenshot(`build-step-2-${viewport.name}.png`);
    });

    test(`build step 3 · ${viewport.name}`, async ({ page }) => {
      await ready(page, '/build?template=extract');
      await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
      await page.getByRole('button', { name: 'Approve and run →' }).click();
      await expect(page.getByRole('heading', { name: 'Extract run complete.' })).toBeVisible();
      await expect(page).toHaveScreenshot(`build-step-3-${viewport.name}.png`);
    });

    test(`build step 4 · ${viewport.name}`, async ({ page }) => {
      await ready(page, '/build?template=extract');
      await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
      await page.getByRole('button', { name: 'Approve and run →' }).click();
      await page.getByRole('button', { name: 'Review data →' }).click();
      await expect(page.getByRole('heading', { name: 'Check the records and their evidence.' })).toBeVisible();
      await expect(page).toHaveScreenshot(`build-step-4-${viewport.name}.png`);
    });

    test(`review · ${viewport.name}`, async ({ page }) => {
      await ready(page, '/review');
      await expect(page).toHaveScreenshot(`review-${viewport.name}.png`);
    });

    test(`dataset detail · ${viewport.name}`, async ({ page }) => {
      await ready(page, '/datasets/competitor-prices');
      await expect(page.getByRole('heading', { level: 1, name: 'Competitor prices' })).toBeVisible();
      await expect(page).toHaveScreenshot(`dataset-detail-${viewport.name}.png`);
    });
  });
}
