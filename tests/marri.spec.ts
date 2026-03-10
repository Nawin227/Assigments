import { test, expect } from '@playwright/test';

test('Marriott Signin and Book Hotel', async ({ page }) => {

  // Open website
  await page.goto('https://www.marriott.com/');

  // Wait for homepage to load
  await page.waitForLoadState('domcontentloaded');

  // Click Sign In
  const signInLink = page.getByRole('link', { name: /sign in/i });
  await expect(signInLink).toBeVisible();
  await signInLink.click();

  // Wait for login form
  const emailField = page.locator('#signInUserId');
  await emailField.waitFor({ state: 'visible' });

  // Enter credentials
  await emailField.fill('your_email@gmail.com');
  await page.locator('#signInPassword').fill('your_password');

  // Click Sign In
  const signInBtn = page.getByRole('button', { name: /sign in/i });

  await Promise.all([
    page.waitForLoadState('networkidle'),
    signInBtn.click()
  ]);

  // Wait for search field
  const destination = page.getByPlaceholder('Where can we take you?');
  await expect(destination).toBeVisible();

  // Enter location
  await destination.fill('New York');

  // Wait for Find Hotels button
  const findHotelsBtn = page.getByRole('button', { name: /find hotels/i });
  await expect(findHotelsBtn).toBeEnabled();

  await Promise.all([
    page.waitForLoadState('networkidle'),
    findHotelsBtn.click()
  ]);

  // Wait for hotel results
  const firstHotel = page.locator('.property-card').first();
  await firstHotel.waitFor({ state: 'visible' });

  // Open hotel page (new tab possible)
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    firstHotel.click()
  ]);

  await newPage.waitForLoadState('domcontentloaded');

  // Wait for room selection
  const selectRoom = newPage.getByRole('button', { name: /select/i }).first();
  await expect(selectRoom).toBeVisible();

  await selectRoom.click();

});