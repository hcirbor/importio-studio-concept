import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import accessibilityBaseline from '../accessibility-baseline.json';
import { expect, test, waitForStudio } from './fixtures';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
] as const;

const routes = [
  { name: 'search', path: '/search' },
  { name: 'runs', path: '/runs' },
  { name: 'datasets', path: '/datasets' },
  { name: 'dataset-detail', path: '/datasets/outdoor-catalogue' },
  { name: 'monitors', path: '/monitors' },
  { name: 'review', path: '/review' },
  { name: 'usage', path: '/usage' },
  { name: 'developers', path: '/developers' },
  { name: 'settings', path: '/settings' },
  { name: 'quick-try', path: '/try' },
  { name: 'pipeline-repair', path: '/pipelines/competitor-prices#repair' },
  { name: 'run-needs-input', path: '/runs/run_batch_91af' },
] as const;

type BuildStep = 1 | 2 | 3 | 4;

async function openBuildStep(page: Page, step: BuildStep) {
  await page.goto('/build?template=extract');
  await waitForStudio(page);
  if (step === 1) return;

  await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confirm what Studio will do.' })).toBeVisible();
  if (step === 2) return;

  await page.getByRole('button', { name: 'Approve and run →' }).click();
  await expect(page.getByRole('heading', { name: 'Extract run complete.' })).toBeVisible();
  if (step === 3) return;

  await page.getByRole('button', { name: 'Review data →' }).click();
  await expect(page.getByRole('heading', { name: 'Check the records and their evidence.' })).toBeVisible();
}

async function expectNoAccessibilityRegressions(page: Page, surface: string) {
  const baselineIssues: string[] = accessibilityBaseline.issues;
  const results = await new AxeBuilder({ page }).analyze();
  const actualIssues = results.violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .flatMap(({ id, impact, nodes }) => nodes.map(({ target }) =>
      `${surface} | ${impact} | ${id} | ${target.join(' > ')}`))
    .sort();
  const expectedIssues = baselineIssues
    .filter((issue) => issue.startsWith(`${surface} | `))
    .sort();

  expect(actualIssues, `Serious or critical axe findings for ${surface}`).toEqual(expectedIssues);
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} accessibility`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route.name} has no accessibility regressions`, async ({ page }) => {
        await page.goto(route.path);
        await waitForStudio(page);
        await expectNoAccessibilityRegressions(page, `${route.name}-${viewport.name}`);
      });
    }

    for (const step of [1, 2, 3, 4] as const) {
      test(`build step ${step} has no accessibility regressions`, async ({ page }) => {
        await openBuildStep(page, step);
        await expectNoAccessibilityRegressions(page, `build-step-${step}-${viewport.name}`);
      });
    }
  });
}
