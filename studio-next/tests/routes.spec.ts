import { expect, test, waitForStudio } from './fixtures';

const routes = [
  { path: '/search', heading: 'Search', title: 'Search · Import.io Studio' },
  { path: '/runs', heading: 'All runs', title: 'All runs · Import.io Studio' },
  { path: '/usage', heading: 'Usage', title: 'Usage · Import.io Studio' },
  { path: '/developers', heading: 'API & MCP', title: 'API & MCP · Import.io Studio' },
  { path: '/settings', heading: 'Settings', title: 'Settings · Import.io Studio' },
] as const;

for (const route of routes) {
  test(`${route.path} has the expected heading and title`, async ({ page }) => {
    await page.goto(route.path);
    await waitForStudio(page);
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    await expect(page).toHaveTitle(route.title);
  });
}
