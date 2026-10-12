import type { Page } from '@playwright/test';
import { expect, test, waitForStudio } from './fixtures';

async function openTemplate(page: Page, template: 'research' | 'extract' | 'collect' | 'monitor') {
  await page.goto(`/build?template=${template}`);
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confirm what Studio will do.' })).toBeVisible();
}

async function runToReview(page: Page) {
  await page.getByRole('button', { name: 'Approve and run →' }).click();
  await expect(page.getByRole('heading', { name: /run complete|working through/ })).toBeVisible();
  await page.getByRole('button', { name: 'Review data →' }).click();
  await expect(page.getByRole('heading', { name: 'Check the records and their evidence.' })).toBeVisible();
}

test('Research resolves the BrightSend decision and honours the edited schema', async ({ page }) => {
  await openTemplate(page, 'research');
  await page.getByRole('button', { name: 'Edit fields' }).click();
  await page.getByRole('button', { name: 'Remove plan_details' }).click();
  await page.getByRole('button', { name: '+ Add field' }).click();
  await page.getByRole('textbox', { name: 'Field 6 name' }).fill('seat_limit');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('seat limit · text')).toBeVisible();

  await page.getByRole('button', { name: 'Approve and run →' }).click();
  await page.getByRole('button', { name: /BrightSend · needs input/i }).click();
  await page.getByRole('button', { name: 'Open decision in browser' }).click();
  await page.getByRole('button', { name: 'Accept necessary only' }).click();
  await expect(page.getByRole('button', { name: 'Review data →' })).toBeEnabled();
  await page.getByRole('button', { name: 'Review data →' }).click();

  const headers = page.locator('.scenario-review thead th');
  await expect(headers).toHaveText(['Source', 'Company', 'Pricing URL', 'Starting price', 'Free plan', 'Free trial', 'Seat limit']);
  await expect(page.getByRole('columnheader', { name: 'Plan details' })).toHaveCount(0);
  await expect(page.getByText('Not stated · unknown').first()).toBeVisible();
});

for (const template of ['extract', 'collect'] as const) {
  test(`${template} runs end to end and saves its dataset`, async ({ page }) => {
    await openTemplate(page, template);
    await runToReview(page);
    await page.getByRole('button', { name: 'Save dataset' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Open dataset' })).toBeVisible();
  });
}

test('Monitor runs end to end and creates a scheduled monitor', async ({ page }) => {
  await openTemplate(page, 'monitor');
  await runToReview(page);
  await page.getByRole('button', { name: 'Create monitor' }).click();
  await expect(page.getByRole('dialog', { name: 'Create a monitor' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Create monitor' }).click();
  await page.getByRole('link', { name: 'Open monitors' }).click();
  await expect(page).toHaveURL(/\/monitors/);
  await expect(page.getByRole('heading', { name: 'Active monitors' })).toBeVisible();
});

test('Enrich uses the five-row sample, runs, and shows results', async ({ page }) => {
  await page.goto('/datasets?type=enrichment&create=csv');
  const dialog = page.getByRole('dialog', { name: 'Create an enrichment' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Use sample CSV' }).click();
  await expect(dialog.getByText(/5 rows/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Create enrichment' }).click();

  const row = page.getByRole('row').filter({ hasText: 'New supplier enrichment' });
  await expect(row).toContainText('Validated → Ready');
  await row.getByRole('link', { name: 'Open' }).click();
  await page.getByRole('button', { name: 'Run enrichment' }).click();
  await expect(page.getByRole('table')).toContainText('Supported');
});
