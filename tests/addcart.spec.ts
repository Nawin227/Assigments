import { test, expect } from '@playwright/test';
test('Add Product To Cart', async ({ page }) => {
await page.goto('https://demowebshop.tricentis.com/');
await page.click('text=Books');
await page.click('text=Add to cart');
await page.click('#topcartlink');
await expect(page.locator('.cart')).toBeVisible();
})