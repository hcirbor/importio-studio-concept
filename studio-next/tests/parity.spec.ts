import { expect, test, waitForStudio } from './fixtures';

test('persistent identity and compact theme control distinguish product and workspace', async ({ page }) => {
  await page.goto('/');
  await waitForStudio(page);
  await expect(page.getByRole('link', { name: 'Import.io Studio home' })).toContainText('Studio');
  await expect(page.getByRole('button', { name: /Demo workspace.*Switch workspace/ })).toBeVisible();
  await expect(page.locator('.theme-control')).toBeVisible();
  await expect(page.getByText('API & database ready')).toHaveCount(0);
});

test('pipeline repair compares evidence, creates a version, and rolls back', async ({ page }) => {
  await page.goto('/pipelines/competitor-prices#repair');
  await waitForStudio(page);
  await expect(page.getByRole('heading', { name: 'Product cards changed' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve repair (creates v5)' }).click();
  await expect(page.getByText('Repair approved. Version 5 created and activated.')).toBeVisible();
  await page.getByRole('button', { name: 'Roll back to v4' }).click();
  await expect(page.getByText('Rolled back to v4.')).toBeVisible();
});

test('monitor event supports evidence, baseline acceptance, muting, and opening its run', async ({ page }) => {
  await page.goto('/monitors');
  await waitForStudio(page);
  await page.getByRole('button', { name: /Trailhead availability changed/ }).click();
  await expect(page.getByRole('heading', { name: 'Trailhead availability changed' })).toBeVisible();
  await page.getByRole('button', { name: 'Mute field for 7 days' }).click();
  await expect(page.getByText('Muted 7 days').last()).toBeVisible();
  await page.getByRole('button', { name: 'Accept new baseline' }).click();
  await expect(page.getByText('Baseline accepted').last()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open run' })).toHaveAttribute('href', '/runs/run_monitor');
});

test('running multi-worker run exposes queue warnings, resolve action, API code, cancel, and capture artefacts', async ({ page }) => {
  await page.goto('/runs/run_batch_91af');
  await waitForStudio(page);
  await expect(page.getByText('1 source needs input').first()).toBeVisible();
  await page.getByRole('button', { name: 'Get API code' }).click();
  await expect(page.getByRole('dialog', { name: 'Run with the API' })).toContainText('run_batch_91af');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Resolve input' }).last().click();
  await expect(page.getByRole('button', { name: 'Accept necessary only' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel run' }).click();
  await expect(page.getByRole('button', { name: 'Cancelled' })).toBeDisabled();
  await page.getByRole('button', { name: 'View screenshot' }).click();
  await expect(page.getByText('Screenshot preview opened for this capture.')).toBeVisible();
});

test('review evidence preserves context and resolution remains synchronized', async ({ page }) => {
  await page.goto('/review');
  await waitForStudio(page);
  await page.getByRole('link', { name: /Price supported/ }).click();
  await expect(page.getByText('Availability needs review').first()).toBeVisible();
  await expect(page.getByText('Price supported; availability not found.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to review' }).click();
  await page.getByRole('button', { name: 'Accept unknown' }).click();
  await page.goto('/runs/run_7f3a?from=review');
  await expect(page.getByText('Run complete')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open review item' })).toHaveCount(0);
});

test('enrichment retries failed rows', async ({ page }) => {
  await page.goto('/datasets/enrichments/supplier-enrichment');
  await waitForStudio(page);
  await page.getByRole('button', { name: /Retry 2 failed/ }).click();
  await expect(page.getByText('Retry complete · failed rows were checked again.')).toBeVisible();
});

test('settings include notifications and audit log', async ({ page }) => {
  await page.goto('/settings');
  await waitForStudio(page);
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
});

test('qualification can save candidates and extend search', async ({ page }) => {
  await page.goto('/search?tab=companies&view=qualified');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Save qualified candidates' }).click();
  await expect(page.getByRole('button', { name: 'Saved to dataset' })).toBeDisabled();
  await page.getByRole('button', { name: 'Extend search' }).click();
  await expect(page.getByText('Search extended · 18 more candidates queued for qualification.')).toBeVisible();
});

test('quick try previews a page and saves it to the workspace', async ({ page }) => {
  await page.goto('/try');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Preview extract' }).click();
  await expect(page.getByRole('heading', { name: 'Trailhead 2P Tent' })).toBeVisible();
  await page.getByRole('button', { name: 'Save to workspace' }).click();
  await expect(page.getByRole('link', { name: 'Open workspace datasets' })).toBeVisible();
});

test('usage downloads JSON and runs load older history', async ({ page }) => {
  await page.goto('/usage');
  await waitForStudio(page);
  await expect(page.getByRole('heading', { name: 'Usage by pipeline' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('studio-usage.json');
  await page.goto('/runs');
  await page.getByRole('button', { name: 'Load older' }).click();
  await expect(page.getByText('run_archive_6c10')).toBeVisible();
});

test('large run shows its domain queue', async ({ page }) => {
  await page.goto('/runs/run_7e91');
  await waitForStudio(page);
  await expect(page.getByRole('heading', { name: 'Domain queue' })).toBeVisible();
  await expect(page.getByText('1,284 / 1,284', { exact: true })).toBeVisible();
});
