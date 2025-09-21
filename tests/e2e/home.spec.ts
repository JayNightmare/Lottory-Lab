import { test, expect } from '@playwright/test';

test('home hero renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-title')).toHaveText("Lottery Lab: explore, don't predict.");
});
