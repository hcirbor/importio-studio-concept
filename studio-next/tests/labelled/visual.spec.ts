import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('button', { name: 'Open command palette' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test('labelled builder', async ({ page }) => {
  await ready(page, '/build?template=collect');
  await page.getByRole('button', { name: 'Browser actions' }).click();
  await page.keyboard.press('Escape');
  await expect(page).toHaveScreenshot('labelled-builder.png');
});

test('labelled review plan with sample offer', async ({ page }) => {
  await ready(page, '/build?template=collect');
  await page.getByRole('button', { name: 'Limits' }).click();
  await page.getByLabel('Maximum records').fill('25');
  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run a sample (10 records)' })).toBeVisible();
  await expect(page).toHaveScreenshot('labelled-review-plan.png');
});

test('labelled monitor dialog', async ({ page }) => {
  await ready(page, '/monitors');
  await page.getByRole('button', { name: 'Choose a pipeline to monitor' }).click();
  await expect(page.getByRole('dialog', { name: 'Create a monitor' })).toBeVisible();
  await expect(page).toHaveScreenshot('labelled-monitor-dialog.png');
});

test('labelled input decision', async ({ page }) => {
  await ready(page, '/build?template=research');
  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
  await page.getByRole('button', { name: 'Approve and run →' }).click();
  await page.getByRole('button', { name: /BrightSend · needs input/i }).click();
  await page.getByRole('button', { name: 'Open decision in browser' }).click();
  await expect(page.getByRole('button', { name: 'Take control' })).toBeVisible();
  await expect(page).toHaveScreenshot('labelled-input-decision.png');
});
