import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test, waitForStudio } from './fixtures';

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
}

test('exported CSV and JSON have matching, unique keys with source first', async ({ page }) => {
  await page.goto('/datasets/outdoor-catalogue');
  await waitForStudio(page);

  await page.getByRole('button', { name: 'Export' }).click();
  let event = page.waitForEvent('download');
  await page.getByRole('link', { name: 'CSV' }).click();
  const csv = await event;
  const csvPath = await csv.path();
  expect(csvPath).not.toBeNull();
  const header = (await readFile(csvPath!, 'utf8')).split(/\r?\n/, 1)[0].split(',');
  expect(header[0]).toBe('source');
  expect(new Set(header).size).toBe(header.length);

  await page.getByRole('button', { name: 'Export' }).click();
  event = page.waitForEvent('download');
  await page.getByRole('link', { name: 'JSON' }).click();
  const json = await event;
  const jsonPath = await json.path();
  expect(jsonPath).not.toBeNull();
  const records = JSON.parse(await readFile(jsonPath!, 'utf8')) as Array<Record<string, unknown>>;
  expect(Object.keys(records[0])).toEqual(header);
});

test('reviewer enters a sourced value and Undo restores the item', async ({ page }) => {
  await page.goto('/review');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Enter value' }).click();
  await choose(page, 'Reviewed availability', 'In stock');
  await page.getByLabel('Source or reason').fill('Confirmed on the retained product page.');
  await page.getByRole('button', { name: 'Save reviewed value' }).click();
  await expect(page.getByText('Review queue clear')).toBeVisible();
  const toast = page.getByText('Value saved').locator('..');
  await expect(toast).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Trailhead availability is unknown').first()).toBeVisible();
});

test('API key is revealed once, copied, then stored masked', async ({ page }) => {
  await page.goto('/settings');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Create key' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create API key' });
  await dialog.getByPlaceholder('Cursor laptop').fill('Cursor laptop');
  await dialog.getByRole('button', { name: 'Create key' }).click();
  const revealed = page.getByRole('dialog', { name: 'Your API key' });
  await expect(revealed.getByText(/^mcp_live_[A-Za-z0-9]{24}$/)).toBeVisible();
  await revealed.getByRole('button', { name: 'Copy' }).click();
  await revealed.getByRole('button', { name: 'Done' }).click();
  const row = page.locator('.settings-row').filter({ hasText: 'Cursor laptop' });
  await expect(row).toContainText(/mcp_live_••••[A-Za-z0-9]{4}/);
  await expect(row).not.toContainText(/mcp_live_[A-Za-z0-9]{24}/);
});

test('monitor creator stores a price threshold and email rule', async ({ page }) => {
  await page.goto('/monitors');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Choose a pipeline to monitor' }).click();
  await choose(page, 'Alert when', 'Price falls below');
  await page.getByPlaceholder('€230').fill('€230');
  await choose(page, 'Notify via', 'Email · jordan@example.com');
  await page.getByRole('dialog').getByRole('button', { name: 'Create monitor' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Price falls below €230 · Email' })).toBeVisible();
});

test('workspace owner invites two members', async ({ page }) => {
  await page.goto('/settings');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Invite members' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invite members' });
  await dialog.getByPlaceholder('maya@example.com, sam@example.com').fill('alex@example.com, taylor@example.com');
  await dialog.getByRole('button', { name: 'Send invites' }).click();
  await expect(page.getByText('2 invites sent')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'alex@example.com' })).toContainText('Invited');
  await expect(page.getByRole('row').filter({ hasText: 'taylor@example.com' })).toContainText('Invited');
});

test('dataset detail survives reload', async ({ page }) => {
  await page.goto('/datasets/competitor-prices');
  await waitForStudio(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Competitor prices' })).toBeVisible();
  await page.reload();
  await waitForStudio(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Competitor prices' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Source' })).toBeVisible();
});

test('New workflow confirms before discarding an unsaved run', async ({ page }) => {
  await page.goto('/build?template=extract');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
  await page.getByRole('button', { name: 'Approve and run →' }).click();
  await page.getByRole('link', { name: 'New workflow' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Discard this run?' });
  await expect(dialog).toContainText("The run and its results won't be saved.");
  await dialog.getByRole('button', { name: 'Discard' }).click();
  await expect(page).toHaveURL(/\/build$/);
  await expect(page.getByLabel('Workflow request')).toHaveValue('');
});

test('collapsed sidebar preference persists after reload', async ({ page }) => {
  await page.goto('/');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('importio-studio-sidebar-collapsed'))).toBe('true');
  await page.reload();
  await waitForStudio(page);
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
});
