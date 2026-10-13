import { expect, test, waitForStudio } from './fixtures';

test('approved product identity, workspace identity, readiness, and compact theme control remain distinct', async ({ page }) => {
  await page.goto('/');
  await waitForStudio(page);
  await expect(page.getByRole('link', { name: 'Import.io Studio home' })).toContainText('Studio');
  await expect(page.getByRole('button', { name: /Northwind Research.*Switch workspace/ })).toBeVisible();
  const theme = page.getByRole('button', { name: 'Theme' });
  await expect(theme).toBeVisible();
  await expect(theme.locator('svg')).toBeVisible();
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(theme.locator('svg')).toBeVisible();
  await expect(page.getByLabel('API & database ready')).toBeVisible();
  await expect(page.getByText('Interactive demo', { exact: false })).toHaveCount(0);
});

test('pipeline repair compares evidence, creates a version, and rolls back', async ({ page }) => {
  await page.goto('/pipelines/competitor-prices/repair');
  await waitForStudio(page);
  await expect(page.getByRole('heading', { name: 'Product cards changed' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve repair (creates v5)' }).click();
  await expect(page.getByText('Repair approved. Version 5 created and activated.')).toBeVisible();
  await page.getByRole('button', { name: 'Close toast' }).click();
  await page.getByRole('button', { name: 'Roll back to v4' }).click();
  await expect(page.getByText('Rolled back to v4.')).toBeVisible();
  await page.reload();
  await waitForStudio(page);
  await expect(page.getByRole('button', { name: 'Approve repair (creates v5)' })).toBeVisible();
});

test('monitor event supports evidence, baseline acceptance, muting, and opening its run', async ({ page }) => {
  await page.goto('/monitors');
  await waitForStudio(page);
  await page.getByRole('link', { name: /Trailhead availability changed/ }).click();
  await expect(page.getByRole('heading', { name: 'Trailhead availability changed' })).toBeVisible();
  await page.getByRole('button', { name: 'Mute field for 7 days' }).click();
  await expect(page.getByText('Muted 7 days').first()).toBeVisible();
  await page.getByRole('button', { name: 'Accept as new baseline' }).click();
  await expect(page.getByText('Baseline accepted').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open run' })).toHaveAttribute('href', '/runs/run_monitor');
  await page.reload();
  await waitForStudio(page);
  await expect(page.getByText('Baseline accepted').first()).toBeVisible();
});

test('running multi-worker run exposes queue warnings, resolve action, API code, cancel, and capture artefacts', async ({ page }) => {
  await page.goto('/runs/run_batch_91af');
  await waitForStudio(page);
  await expect(page.getByText('Input required')).toBeVisible();
  await page.getByRole('button', { name: 'Get API code' }).click();
  await expect(page.getByRole('dialog', { name: 'Run with the API' })).toContainText('run_batch_91af');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cancel run' }).click();
  await expect(page.getByRole('link', { name: 'Retry as new run' })).toBeVisible();
  await page.getByRole('button', { name: 'Resolve inputs (1)' }).last().click();
  await expect(page.getByText('Ready to review')).toBeVisible();
  await page.getByRole('button', { name: 'View screenshot' }).click();
  await expect(page.getByText('Screenshot preview opened for this capture.')).toBeVisible();
});

test('review evidence preserves context and resolution remains synchronized', async ({ page }) => {
  await page.goto('/review');
  await waitForStudio(page);
  await page.getByRole('link', { name: /Price supported/ }).click();
  await expect(page.getByText('Availability needs review').first()).toBeVisible();
  await expect(page.getByText('Trail Shop availability was not found.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to review' }).click();
  await page.getByRole('button', { name: 'Accept unknown' }).click();
  await page.goto('/runs/run_7f3a?from=review');
  await expect(page.getByText('Ready to review')).toBeVisible();
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

test('real demo actions appear in the member-filterable audit log', async ({ page }) => {
  await page.goto('/pipelines/competitor-prices/repair');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Approve repair (creates v5)' }).click();

  await page.goto('/monitors');
  await page.getByRole('button', { name: 'Choose a pipeline to monitor' }).click();
  await page.getByRole('button', { name: 'Create monitor' }).click();

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Create key' }).click();
  await page.getByPlaceholder('Cursor laptop').fill('Audit journey');
  await page.getByRole('dialog').getByRole('button', { name: 'Create key' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Revoke' }).last().click();

  await page.getByRole('button', { name: 'Invite members' }).click();
  await page.getByPlaceholder('maya@example.com, sam@example.com').fill('alex@example.com');
  await page.getByRole('button', { name: 'Send invites' }).click();

  await expect(page.getByText('Jordan Davis approved repair for “Competitor prices” and created v5')).toBeVisible();
  await expect(page.getByText(/created monitor “Competitor prices monitor”/)).toBeVisible();
  await expect(page.getByText(/created API key “Audit journey”/)).toBeVisible();
  await expect(page.getByText(/revoked API key “Audit journey”/)).toBeVisible();
  await expect(page.getByText(/invited 1 member as Editor/)).toBeVisible();

  await page.getByRole('combobox', { name: 'Filter audit log by member' }).click();
  await page.getByRole('option', { name: 'Jordan Davis' }).click();
  await expect(page.getByText('Jordan Davis approved repair for “Competitor prices” and created v5')).toBeVisible();
});

test('qualification can save candidates and extend search', async ({ page }) => {
  await page.goto('/search?tab=companies&view=qualified');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Save qualified candidates' }).click();
  await expect(page.getByRole('button', { name: 'Saved to dataset' })).toBeDisabled();
  await page.getByRole('button', { name: 'Extend search' }).click();
  await expect(page.getByText('Search extended · 18 more candidates queued for qualification.')).toBeVisible();
});

test('quick try is intentionally removed in favour of New workflow Extract', async ({ page }) => {
  await page.goto('/try');
  await expect(page.getByText('Not found')).toBeVisible();
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
