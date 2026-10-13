import { expect, test } from '../fixtures';

test('citeotter restrictions still apply when status tags are hidden', async ({ page }) => {
  await page.goto('/monitors');
  await page.getByRole('button', { name: 'Choose a pipeline to monitor' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a monitor' });

  await expect(dialog.getByRole('button', { name: 'Coming soon' })).toHaveCount(0);
  const alertWhen = dialog.getByRole('combobox', { name: 'Alert when' });
  await alertWhen.click();
  await page.getByRole('option', { name: 'Price falls below' }).click();

  await expect(alertWhen).toContainText('Any change');
  await expect(page.getByRole('tooltip').filter({ hasText: "Price thresholds aren't available yet." })).toBeVisible();
});
