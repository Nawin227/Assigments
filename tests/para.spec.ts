import { test, expect } from '@playwright/test';

test('Marriott website sign in', async ({ page }) => {
  test.setTimeout(120_000);

  const email = process.env.MARRIOTT_EMAIL;
  const password = process.env.MARRIOTT_PASSWORD;

  test.skip(!email || !password, 'Set MARRIOTT_EMAIL and MARRIOTT_PASSWORD to run this sign-in test.');

  await page.goto('https://www.marriott.com/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Marriott|Hotels/i);

  const signInLink = page.getByRole('link', { name: /sign in|signin/i }).first();
  await expect(signInLink).toBeVisible({ timeout: 30_000 });
  await signInLink.click();

  const emailInput = page.locator('#signInUserId').or(page.getByRole('textbox', { name: /email|username/i })).first();
  const passwordInput = page.locator('#signInPassword').or(page.getByLabel(/password/i)).first();
  await expect(emailInput).toBeVisible({ timeout: 30_000 });
  await expect(passwordInput).toBeVisible({ timeout: 30_000 });

  await emailInput.fill(email!);
  await passwordInput.fill(password!);

  const signInButton = page.getByRole('button', { name: /^sign in$/i }).or(page.locator('button[type="submit"]')).first();
  await expect(signInButton).toBeEnabled();

  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    signInButton.click(),
  ]);

  // Post-login, user profile/menu should be visible, and sign-in link should not remain primary.
  await expect(
    page.getByRole('button', { name: /account|my account|profile/i })
      .or(page.getByRole('link', { name: /account|my account|profile/i }))
      .first(),
  ).toBeVisible({ timeout: 30_000 });
});