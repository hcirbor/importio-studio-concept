import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

async function expectAccessible(page: Page, state: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
  expect(violations, `Serious or critical axe findings for ${state}`).toEqual([]);
}

async function openCollectLimits(page: Page) {
  await page.goto('/build?template=collect');
  await page.getByRole('button', { name: 'Limits' }).click();
  await expect(page.getByText('Maximum records')).toBeVisible();
}

test('coming-soon controls expose their note to pointer and keyboard', async ({ page }) => {
  await page.goto('/build?template=collect');
  const browserActions = page.getByRole('button', { name: 'Browser actions' });
  await expect(page.getByRole('button', { name: 'Coming soon' })).toHaveCount(0);
  await browserActions.click();
  const panel = page.locator('#workflow-tool-panel');
  await expect(panel.getByRole('heading', { name: 'Browser actions' })).toBeVisible();
  const tag = panel.getByRole('button', { name: 'Coming soon' });
  await expect(tag).toBeVisible();
  const note = page.getByRole('tooltip').filter({ hasText: "Clicks, forms and logins aren't available yet." });
  await expect(note).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(note).toBeHidden();
  await expect(tag).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(note).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(note).toBeHidden();
  await expect(tag).toBeFocused();
  await expectAccessible(page, 'labelled builder');
});

test('Collect preview offers a bounded sample and flags the review plan', async ({ page }) => {
  await openCollectLimits(page);
  await expect(page.getByRole('button', { name: 'Preview' })).toHaveCount(2);
  await page.getByLabel('Maximum records').fill('25');
  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run a sample (10 records)' })).toBeVisible();
  const flaggedStep = page.locator('.plan-step-flagged');
  await expect(flaggedStep).toContainText('Coming soon');
  await expect(flaggedStep.getByRole('button', { name: 'Coming soon' })).toHaveCount(1);
  await expectAccessible(page, 'labelled review plan');
});

test('monitor rules and channels stay visible and explain unsupported choices', async ({ page }) => {
  await page.goto('/monitors');
  await page.getByRole('button', { name: 'Choose a pipeline to monitor' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a monitor' });
  await expect(dialog.getByRole('button', { name: 'Coming soon' })).toHaveCount(2);
  await dialog.getByRole('combobox', { name: 'Alert when' }).click();
  await page.getByRole('option', { name: 'Price falls below' }).click();
  await expect(page.getByRole('tooltip').filter({ hasText: "Price thresholds aren't available yet." })).toBeVisible();
  await expectAccessible(page, 'labelled monitor dialog');
});

test('input decisions and take control explain why they cannot run', async ({ page }) => {
  await page.goto('/build?template=research');
  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
  await expect(page.locator('.plan-step-flagged').getByRole('button', { name: 'Coming soon' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Approve and run →' }).click();
  await page.getByRole('button', { name: /BrightSend · needs input/i }).click();
  await page.getByRole('button', { name: 'Open decision in browser' }).click();
  await page.getByRole('button', { name: 'Accept necessary only' }).click();
  await expect(page.getByRole('tooltip').filter({ hasText: "Interactive decisions on a page aren't available yet." })).toBeVisible();
  await page.getByRole('button', { name: 'Take control' }).click();
  await expect(page.getByRole('tooltip').filter({ hasText: "Taking control of the browser isn't available yet." })).toBeVisible();
  await page.getByRole('button', { name: 'Skip domain' }).click();
  const reviewData = page.getByRole('button', { name: 'Review data →' });
  await expect(reviewData).toBeEnabled();
  await reviewData.click();
  await expect(page.getByRole('heading', { name: 'Check the records and their evidence.' })).toBeVisible();
  await expectAccessible(page, 'labelled input decision');
});

test('capture artefacts keep capability-driven Preview and Coming soon labels', async ({ page }) => {
  await page.goto('/runs/run_7f3a');
  const captures = page.locator('.capture-actions');
  await expect(captures.getByRole('button', { name: 'Preview' })).toHaveCount(2);
  await expect(captures.getByRole('button', { name: 'Coming soon' })).toHaveCount(1);
  await captures.getByRole('button', { name: 'Coming soon' }).hover();
  await expect(captures.locator('.status-tag-note').filter({ hasText: "Full run recordings aren't available yet." })).toBeVisible();
  await expectAccessible(page, 'labelled capture artefacts');
});
