import type { Page } from '@playwright/test';
import { expect, test, waitForStudio } from './fixtures';
import { runJourney } from './journey-helpers';

async function planAndRun(page: Page, template: 'research' | 'collect' | 'monitor') {
  await page.goto(`/build?template=${template}`);
  await waitForStudio(page);
  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
}

async function completeResearch(
  page: Page,
  capture: (label: string) => Promise<void>,
) {
  await planAndRun(page, 'research');
  await capture('Plan');
  await page.getByRole('button', { name: 'Approve and run →' }).click();
  await capture('Input needed');
  await page.getByRole('button', { name: 'Resolve input', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review data →' })).toBeEnabled();
  await capture('Input resolved');
  await page.getByRole('button', { name: 'Review data →' }).click();
  await capture('Review data');
  await page.getByRole('button', { name: 'Save dataset' }).click();
  await capture('Dataset saved');
}

test.describe.configure({ mode: 'serial' });

test('journey 01 · resolve review from Home Needs attention', async ({ page }) => {
  await runJourney(page, '01-home-review', async (capture) => {
    await page.goto('/');
    await waitForStudio(page);
    await capture('Home needs attention');
    await page.getByRole('article').filter({ hasText: 'Needs attention' }).getByRole('link', { name: 'Review', exact: true }).click();
    await capture('Review decision');
    await page.getByRole('button', { name: 'Accept unknown' }).click();
    await expect(page.getByRole('heading', { name: 'Review queue clear' })).toBeVisible();
    await capture('Inbox clear');
  });
});

test('journey 02 · Review nav to evidence and Accept unknown', async ({ page }) => {
  await runJourney(page, '02-review-nav-evidence', async (capture) => {
    await page.goto('/');
    await waitForStudio(page);
    await page.getByRole('link', { name: 'Review', exact: true }).click();
    await capture('Review inbox');
    await page.getByRole('link', { name: /Price supported/ }).click();
    await capture('Evidence in run');
    await page.getByRole('link', { name: 'Back to review' }).click();
    await page.getByRole('button', { name: 'Accept unknown' }).click();
    await expect(page.getByText('0 items need review')).toBeVisible();
    await capture('Zero items');
  });
});

test('journey 03 · approve repair from pipeline', async ({ page }) => {
  await runJourney(page, '03-pipeline-repair', async (capture) => {
    await page.goto('/pipelines/competitor-prices');
    await waitForStudio(page);
    await capture('Repair ready');
    await page.getByRole('link', { name: 'Review repair' }).last().click();
    await capture('Repair evidence');
    await page.getByRole('button', { name: 'Approve repair (creates v5)' }).click();
    await page.getByRole('link', { name: 'Competitor prices' }).first().click();
    await expect(page.getByRole('link', { name: 'Run now' })).toBeVisible();
    await capture('Run now');
  });
});

test('journey 04 · accept monitor event baseline', async ({ page }) => {
  await runJourney(page, '04-monitor-event', async (capture) => {
    await page.goto('/monitors');
    await waitForStudio(page);
    await capture('Recent monitor events');
    await page.getByRole('link', { name: /Trailhead availability changed/ }).click();
    await capture('Change evidence');
    await page.getByRole('button', { name: 'Accept as new baseline' }).click();
    await expect(page.getByText('Baseline accepted').first()).toBeVisible();
    await capture('Baseline accepted');
  });
});

test('journey 05 · Research end to end', async ({ page }) => {
  await runJourney(page, '05-research', async (capture) => {
    await page.goto('/build?template=research');
    await waitForStudio(page);
    await capture('Research template');
    await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
    await capture('Plan');
    await page.getByRole('button', { name: 'Approve and run →' }).click();
    await capture('Run needs input');
    await page.getByRole('button', { name: 'Resolve input', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Review data →' })).toBeEnabled();
    await page.getByRole('button', { name: 'Review data →' }).click();
    await capture('Review data');
    await page.getByRole('button', { name: 'Save dataset' }).click();
    await capture('Dataset saved');
  });
});

test('journey 07 · enrich CSV, run, retry and inspect results', async ({ page }) => {
  await runJourney(page, '07-enrich-csv', async (capture) => {
    await page.goto('/datasets?type=enrichment&create=csv');
    const dialog = page.getByRole('dialog', { name: 'Create an enrichment' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Use sample CSV' }).click();
    await capture('CSV mapped');
    await dialog.getByRole('button', { name: 'Create enrichment' }).click();
    await page.getByRole('row').filter({ hasText: 'New supplier enrichment' }).getByRole('link', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Run enrichment' }).click();
    await expect(page.getByRole('table')).toContainText('Supported');
    await capture('Enrichment results');
    await page.goto('/datasets/enrichments/supplier-enrichment');
    await page.getByRole('button', { name: /Retry 2 failed/ }).click();
    await capture('Retry complete');
  });
});

test('journey 08 · export data, inspect API code and create key', async ({ page }) => {
  await runJourney(page, '08-get-data-out', async (capture) => {
    await page.goto('/datasets/outdoor-catalogue');
    await waitForStudio(page);
    await page.getByRole('button', { name: 'Export' }).click();
    await capture('Export formats');
    let download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'CSV' }).click();
    await download;
    await page.getByRole('button', { name: 'Export' }).click();
    download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'JSON' }).click();
    await download;
    await page.goto('/runs/run_7f3a');
    await page.getByRole('button', { name: 'Get API code' }).click();
    await capture('Run API code');
    await page.keyboard.press('Escape');
    await page.goto('/developers');
    await capture('Developers');
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Create key' }).click();
    await page.getByPlaceholder('Cursor laptop').fill('Journey export');
    await page.getByRole('dialog').getByRole('button', { name: 'Create key' }).click();
    await capture('API key created');
  });
});

test('journey 09 · create monitor from completed run', async ({ page }) => {
  await runJourney(page, '09-create-monitor', async (capture) => {
    await planAndRun(page, 'monitor');
    await page.getByRole('button', { name: 'Approve and run →' }).click();
    await capture('Completed run');
    await page.getByRole('button', { name: 'Review data →' }).click();
    await page.getByRole('button', { name: 'Create monitor' }).click();
    await capture('Monitor setup');
    await page.getByRole('dialog').getByRole('button', { name: 'Create monitor' }).click();
    await page.getByRole('link', { name: 'Open monitors' }).click();
    await capture('Monitor created');
  });
});

test('journey 10 · invite member, change role and inspect audit', async ({ page }) => {
  await runJourney(page, '10-member-audit', async (capture) => {
    await page.goto('/settings');
    await waitForStudio(page);
    await page.getByRole('button', { name: 'Invite members' }).click();
    await page.getByPlaceholder('maya@example.com, sam@example.com').fill('audit-member@example.com');
    await page.getByRole('button', { name: 'Send invites' }).click();
    await capture('Member invited');
    await page.getByRole('combobox', { name: 'Role for audit-member@example.com' }).click();
    await page.getByRole('option', { name: 'Viewer' }).click();
    await capture('Role changed');
    await expect(page.getByText(/invited 1 member as Editor/)).toBeVisible();
    await expect(page.getByText(/changed Pending invite to Viewer/)).toBeVisible();
    await capture('Audit entries');
  });
});

test.describe('mobile contact sheets', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('journey 11 · Home review at 375px', async ({ page }) => {
    await runJourney(page, '11-home-review-mobile', async (capture) => {
      await page.goto('/');
      await waitForStudio(page);
      await capture('Home');
      await page.getByRole('article').filter({ hasText: 'Needs attention' }).getByRole('link', { name: 'Review', exact: true }).click();
      await capture('Decision');
      await page.getByRole('button', { name: 'Accept unknown' }).click();
      await capture('Inbox clear');
    });
  });

  test('journey 12 · Research at 375px', async ({ page }) => {
    await runJourney(page, '12-research-mobile', async (capture) => {
      await completeResearch(page, capture);
    });
  });
});
