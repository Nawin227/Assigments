import { test, expect } from '@playwright/test';

test('Flipkart login page opens and accepts identifier', async ({ page }) => {
  test.setTimeout(90_000);

  const loginId = process.env.FLIPKART_LOGIN_ID;
  test.skip(!loginId, 'Set FLIPKART_LOGIN_ID to run this test.');

  // Navigate to login route directly to avoid homepage pop-up timing issues.
  await page.goto('https://www.flipkart.com/account/login', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Flipkart/i);

  const identifierInput = page
    .locator('input[type="text"]')
    .or(page.getByPlaceholder(/enter email\/mobile number/i))
    .first();

  await expect(identifierInput).toBeVisible({ timeout: 30_000 });
  await identifierInput.fill(loginId!);

  const continueButton = page
    .getByRole('button', { name: /request otp|continue|login/i })
    .first();

  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // Flipkart typically proceeds to OTP verification after identifier submission.
  await expect(page.getByText(/otp|verification code|enter code/i).first()).toBeVisible({
    timeout: 20_000,
  });
});
