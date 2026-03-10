import { test, expect } from '@playwright/test';

test('Book a room on Marriott', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('https://www.marriott.com/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Marriott|Hotels/i);

  // Fill destination and launch hotel search.
  const destination = page.getByPlaceholder(/where can we take you\??/i);
  await expect(destination).toBeVisible({ timeout: 20_000 });
  await destination.fill('New York');

  const findHotels = page.getByRole('button', { name: /find hotels|search/i }).first();
  await expect(findHotels).toBeEnabled();
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    findHotels.click(),
  ]);

  // Open the first hotel from results using resilient, dynamic selectors.
  const resultCandidates = [
    page.locator('a[href*="/hotels/"]'),
    page.locator('[data-testid*="property"] a[href]'),
    page.locator('.property-card a[href]'),
    page.getByRole('link', { name: /hotel|marriott|resort|inn|suites/i }),
  ];

  let firstHotel = resultCandidates[0].first();
  let found = false;
  for (const candidate of resultCandidates) {
    const count = await candidate.count();
    if (count > 0) {
      firstHotel = candidate.first();
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error('No hotel result link found after search; page structure or location query may have changed.');
  }

  await firstHotel.scrollIntoViewIfNeeded();
  await expect(firstHotel).toBeVisible({ timeout: 30_000 });

  const [hotelPage] = await Promise.all([
    page.context().waitForEvent('page').catch(() => null),
    firstHotel.click(),
  ]);

  const bookingPage = hotelPage ?? page;
  await bookingPage.waitForLoadState('domcontentloaded');

  // Pick first available room action.
  const selectRoom = bookingPage
    .getByRole('button', { name: /select|book now|view rates/i })
    .first();
  await expect(selectRoom).toBeVisible({ timeout: 30_000 });
  await selectRoom.click();

  // Confirmation that booking journey advanced beyond listing.
  await expect(bookingPage).toHaveURL(/rooms|rate|reservation|booking|hotel/i, {
    timeout: 30_000,

  });
});
    