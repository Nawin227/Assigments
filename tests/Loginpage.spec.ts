import { test, expect } from '@playwright/test';
test('User Login', async ({ page }) => {
  await page.goto('https://demowebshop.tricentis.com/');

  // Create a fresh user so login credentials are always valid.
  const email = `user${Date.now()}@test.com`;
  const password = 'Password123';

  await page.getByRole('link', { name: 'Register' }).click();
  await page.check('#gender-male');
  await page.fill('#FirstName', 'Naveen');
  await page.fill('#LastName', 'Kumar');
  await page.fill('#Email', email);
  await page.fill('#Password', password);
  await page.fill('#ConfirmPassword', password);
  await page.click('#register-button');
  await expect(page.locator('.result')).toContainText('Your registration completed');

  await page.getByRole('link', { name: 'Log out' }).click();
  await page.getByRole('link', { name: 'Log in' }).click();
  await page.fill('#Email', email);
  await page.fill('#Password', password);
  await page.click('.login-button');

  await expect(page.getByRole('link', { name: 'Log out' })).toBeVisible();
});