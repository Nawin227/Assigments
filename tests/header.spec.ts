import { test, expect } from '@playwright/test';

test('Click all header menus', async ({ page }) => {

  await page.goto('https://demowebshop.tricentis.com/');

  const menus = page.locator('.top-menu > li > a');
  const count = await menus.count();

  for (let i = 0; i < count; i++) {

    const menuText = await menus.nth(i).textContent();
    console.log(`Clicking menu: ${menuText}`);

    await menus.nth(i).click();

    await page.waitForLoadState('domcontentloaded');

    console.log(`Page URL: ${page.url()}`);

    await page.goBack();

  }

});