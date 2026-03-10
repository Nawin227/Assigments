import { test, expect } from '@playwright/test';

test('Parabank End to End Scenario', async ({ page }) => {
  test.setTimeout(90_000);

  // 1. Launch application using URL
  await page.goto('https://parabank.parasoft.com/parabank/index.htm', {
    waitUntil: 'domcontentloaded',
  });

  // 2. Verify application logo is displayed
  const logo = page.locator('img[title="ParaBank"]');
  await expect(logo).toBeVisible();

  // 3. Verify caption displayed
  const caption = page.locator('text=Experience the difference');
  await expect(caption).toBeVisible();

  // 4. Enter invalid username
  await page.locator('input[name="username"]').fill('invalidUser');

  // 5. Enter empty password
  await page.locator('input[name="password"]').fill('');

  // 6. Click login button
  await page.locator('input[value="Log In"]').click();

  // 7. Verify error message
  const errorMessage = page.locator('text=Please enter a username and password.');
  await expect(errorMessage).toBeVisible();

  // 8. Click Admin Page link
  await page.getByRole('link', { name: 'Admin Page' }).first().click();
  await expect(page).toHaveURL(/admin\.htm/);

  // 9. Select SOAP option from DBA mode radio button
  await page.locator('input[value="soap"]').check();

  // 10. Locate Loan Provider dropdown in Application Settings
  const dropdown = page.locator('tr:has-text("Loan Provider:") select').first();
  await expect(dropdown).toBeVisible();
  await dropdown.scrollIntoViewIfNeeded();

  // 11. Select Web Service from dropdown
  await dropdown.selectOption({ label: 'Web Service' });
  // 12. Click submit button
  await page.locator('input[value="Submit"]').click();

  // 13. Verify success message
  const successMsg = page.getByText('Settings saved successfully.');
  await expect(successMsg).toBeVisible();

  // 14. Click Services page link. Prefer header, fallback to first visible link.
  const headerServicesLink = page.locator('#headerPanel').getByRole('link', { name: 'Services' }).first();
  const servicesLink = page.getByRole('link', { name: 'Services' }).first();
  if (await headerServicesLink.count()) {
    await headerServicesLink.click();
  } else {
    await servicesLink.click();
  }
  await expect(page).toHaveURL(/services\.htm/);

  // 15. Wait for service page
  await page.waitForLoadState('networkidle');

  // 16. Scroll to Bookstore services table
  const table = page.locator('table:has-text("Bookstore")').first();
  await expect(table).toBeVisible();
  await table.scrollIntoViewIfNeeded();

  // 17. Get total rows
  const rows = table.locator('tr');
  const rowCount = await rows.count();
  console.log("Total Rows:", rowCount);

  // 18. Get total columns
  const columns = rows.first().locator('th,td');
  const columnCount = await columns.count();
  console.log("Total Columns:", columnCount);

  // 19. Print table data
  for (let i = 0; i < rowCount; i++) {

    const row = rows.nth(i);
    const cells = row.locator('th,td');
    const cellCount = await cells.count();

    let rowData = '';

    for (let j = 0; j < cellCount; j++) {
      const cellText = await cells.nth(j).innerText();
      rowData += cellText + ' | ';
    }

    console.log(rowData);
  }

});