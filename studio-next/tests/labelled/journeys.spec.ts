import { expect, test, waitForStudio } from '../fixtures';
import { runJourney } from '../journey-helpers';

test('journey 06 · bounded Collect sample to dataset', async ({ page }) => {
  await runJourney(page, '06-collect-sample', async (capture) => {
    await page.goto('/build?template=collect');
    await waitForStudio(page);
    await page.getByRole('button', { name: 'Limits' }).click();
    await page.getByLabel('Maximum records').fill('25');
    await capture('Over limit');
    await page.getByRole('button', { name: 'Plan workflow', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Run a sample (10 records)' })).toBeVisible();
    await capture('Sample offered');
    await page.getByRole('button', { name: 'Run a sample (10 records)' }).click();
    await capture('Sample complete');
    await page.getByRole('button', { name: 'Review data →' }).click();
    await page.getByRole('button', { name: 'Save dataset' }).click();
    await capture('Dataset saved');
  });
});
