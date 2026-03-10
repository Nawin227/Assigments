import { test, expect } from '@playwright/test';
test('Verify Home Page Loads', async ({ page }) => {
  await page.goto('https://demowebshop.tricentis.com/');
  await expect(page).toHaveTitle(/Demo Web Shop/);
  await.page.close();
  await page.screenshot({ path: 'home_page.png' }); 
});

