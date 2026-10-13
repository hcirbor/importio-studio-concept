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

test('pipeline repair approval leaves the pipeline ready to run and rollback remains available', async ({ page }) => {
  await page.goto('/pipelines/competitor-prices/repair');
  await waitForStudio(page);
  await expect(page.getByRole('heading', { name: 'Product cards changed' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve repair (creates v5)' }).click();
  await expect(page.getByText('Repair approved. Version 5 created and activated.')).toBeVisible();
  await page.getByRole('button', { name: 'Close toast' }).click();
  await page.goto('/pipelines/competitor-prices');
  await expect(page.getByText('Active · v5').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Run now' })).toBeVisible();
  await page.goto('/pipelines/competitor-prices/repair');
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
  await expect(page.getByText('Dataset ready')).toBeVisible();
  await page.getByRole('button', { name: 'View screenshot' }).click();
  await expect(page.getByText('Screenshot preview opened for this capture.')).toBeVisible();
});

test('Home review journey carries evidence and decision context until resolution', async ({ page }) => {
  await page.goto('/');
  await waitForStudio(page);
  const attention = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Needs attention' }) });
  await expect(attention).toContainText('3 items');
  await expect(page.getByRole('link', { name: 'Review 1' })).toBeVisible();
  await expect(attention).toContainText('Trail Shop · Trailhead 2P availability not found');
  await attention.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.getByText('Recommended:')).toBeVisible();
  await expect(page.getByText('No availability statement appears on the captured page.').first()).toBeVisible();
  await page.getByRole('link', { name: /Price supported/ }).click();
  await expect(page.getByText('Trail Shop · Trailhead 2P availability not found').first()).toBeVisible();
  await page.getByRole('link', { name: 'Back to review' }).click();
  await page.getByRole('button', { name: 'Accept unknown' }).click();
  await expect(page.getByText('0 items need review')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review queue clear' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review', exact: true })).toBeVisible();
  await page.goto('/runs/run_7f3a');
  await waitForStudio(page);
  await expect(page.getByRole('link', { name: 'Open dataset' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Needs review' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Trail Shop · complete' })).toBeVisible();
  await expect(page.getByText('1 to review', { exact: true })).toHaveCount(0);
  await page.goto('/datasets/competitor-prices');
  await waitForStudio(page);
  await expect(page.getByText('Validated · 0 unresolved')).toBeVisible();
  await expect(page.getByRole('link', { name: /Open review/ })).toHaveCount(0);
  await page.goto('/');
  await waitForStudio(page);
  await expect(attention).toContainText('2 items');
  await expect(attention).not.toContainText('Trail Shop · Trailhead 2P availability not found');
});

test('review state belongs to the affected run and the decision stays in the inbox', async ({ page }) => {
  await page.goto('/runs/run_7f3a');
  await waitForStudio(page);
  await expect(page.getByRole('link', { name: 'Needs review' })).toBeVisible();
  await expect(page.getByText('Trail Shop · Trailhead 2P availability not found').last()).toBeVisible();
  const openReview = page.getByRole('link', { name: /Open review/ });
  await expect(openReview).toHaveAttribute('href', '/review?dataset=competitor-prices');
  await expect(page.getByRole('link', { name: 'Review availability' })).toHaveAttribute('href', '/review?dataset=competitor-prices');
  await expect(page.getByRole('button', { name: 'Accept unknown' })).toHaveCount(0);
  await openReview.click();
  await expect(page.getByText('Trail Shop · Trailhead 2P availability not found').first()).toBeVisible();

  await page.goto('/runs/run_7f3a?from=review');
  await waitForStudio(page);
  await expect(page.getByRole('link', { name: 'Review availability' })).toHaveAttribute('href', '/review?dataset=competitor-prices');
  await expect(page.getByRole('link', { name: 'Back to review' })).toBeVisible();

  await page.goto('/runs/run_7e91');
  await waitForStudio(page);
  await expect(page.getByRole('link', { name: 'Needs review' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Open review/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open dataset' })).toBeVisible();
  await expect(page.getByText('Issues').first()).toBeVisible();
});

test('re-running Research versions one dataset instead of creating a copy', async ({ page }) => {
  async function runAndSaveResearch() {
    await page.goto('/build?template=research');
    await waitForStudio(page);
    await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
    await page.getByRole('button', { name: 'Approve and run →' }).click();
    await page.getByRole('button', { name: 'Resolve input', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Review data →' })).toBeEnabled();
    await page.getByRole('button', { name: 'Review data →' }).click();
    await page.getByRole('button', { name: 'Save dataset' }).click();
  }

  await runAndSaveResearch();
  await runAndSaveResearch();
  await page.goto('/datasets');
  const researchCards = page.locator('.dataset-card').filter({ hasText: 'Pricing · CloudHarbor, Letterloop, BrightSend' });
  await expect(researchCards).toHaveCount(1);
  await expect(researchCards).toContainText('Dataset V2');
  await expect(page.getByText(/Pricing · CloudHarbor, Letterloop, BrightSend \(2\)/)).toHaveCount(0);
});

test('re-running Outdoor catalogue creates v8 without replacing seeded records', async ({ page }) => {
  await page.goto('/build?template=collect');
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
  await page.getByRole('textbox', { name: 'Workflow name' }).fill('Outdoor catalogue');
  await page.getByRole('button', { name: 'Approve and run →' }).click();
  await page.getByRole('button', { name: 'Review data →' }).click();
  await page.getByRole('button', { name: 'Save dataset' }).click();
  await page.goto('/datasets/outdoor-catalogue');
  await expect(page.getByText('Dataset V8')).toBeVisible();
  await expect(page.getByText(/1,?284 records/)).toBeVisible();
  await expect(page.getByText('northwind-outdoors.example/tents/summit-solo')).toBeVisible();
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
