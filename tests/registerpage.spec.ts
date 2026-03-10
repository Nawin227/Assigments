import { test, expect } from '@playwright/test';
test('User Registration', async ({ page }) => {
  await page.goto('https://demowebshop.tricentis.com/');
  await page.click('text=Register');
  await page.check('#gender-male');
  await page.fill('#FirstName', 'Naveen');
  await page.fill('#LastName', 'Kumar');
  const email = `user${Date.now()}@test.com`;
  await page.fill('#Email', email);
  await page.fill('#Password', 'Password123');
  await page.fill('#ConfirmPassword', 'Password123');
  await page.click('#register-button');

// Verify success while still on the registration result page
await expect(page.locator('.result')).toContainText('Your registration completed');
await page.screenshot({ path: 'registration_result.png' });

// Then continue and log out
await page.click('input.button-1.register-continue-button');
await page.getByRole('link', { name: 'Log out' }).click();
});