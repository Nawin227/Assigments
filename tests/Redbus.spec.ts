import { test } from '@playwright/test';
import { HomePage } from '../pages/01_HomePage';
import { SearchResultsPage } from '../pages/02_SearchResultsPage';
import { SeatSelectionPage } from '../pages/03_SeatSelectionPage';
import { BoardingDroppingPage } from '../pages/04_BoardingDroppingPage';
import { PassengerInfoPage } from '../pages/05_PassengerInfoPage';

const FROM = 'Hyderabad';
const TO = 'Bangalore';

async function doSeatSelection(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  testInfo: Parameters<Parameters<typeof test>[1]>[1]
) {
  const homePage = new HomePage(page);
  const srp = new SearchResultsPage(page);
  const sp = new SeatSelectionPage(page);

  await homePage.searchBuses(FROM, TO);
  await srp.waitForResultsLoaded();
  await srp.applyACFilter();
  await srp.applyFiveStarOrHighRatedFilter();
  await srp.assertFilteredResultsVisible();
  await srp.takeScreenshot('01-filters-applied');

  const max = await srp.getViewSeatButtonsCount(10);
  let seatSelected = false;
  for (let i = 0; i < max; i++) {
    const opened = await srp.openSeatLayoutByIndex(i);
    if (!opened) continue;
    await sp.waitForSeatLayout();
    seatSelected = await sp.trySelectAvailableSeat();
    if (seatSelected) break;
    await sp.closeSeatLayoutIfOpen();
  }
  await testInfo.attach('Seat Selection Status', { body: seatSelected ? 'Seat is selected' : 'Seat is not selected', contentType: 'text/plain' });
  test.expect(seatSelected, 'A seat must be selected').toBeTruthy();
  await sp.takeScreenshot('02-seat-selected');
}

async function doBoardingDropping(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  testInfo: Parameters<Parameters<typeof test>[1]>[1]
) {
  const bdp = new BoardingDroppingPage(page);

  const menuStatus = await bdp.openBoardingDroppingMenu();
  test.expect(menuStatus.clicked, 'Boarding & Dropping menu must open after seat selection').toBeTruthy();
  await testInfo.attach('Board/Drop Menu', {
    body: `clicked=${menuStatus.clicked} source=${menuStatus.source}`,
    contentType: 'text/plain',
  });

  const bdStatus = await bdp.selectRandomBoardingAndDropping();
  test.expect(bdStatus.selected, 'First boarding and dropping points must be selected').toBeTruthy();
  console.log('Boarding/Dropping:', bdStatus.details);
  await testInfo.attach('Boarding/Dropping', { body: bdStatus.details, contentType: 'text/plain' });
  await bdp.takeScreenshot('03-boarding-dropping');

  const proceeded = await bdp.clickProceedIfVisible();
  test.expect(proceeded, 'Must click Fill Passenger Details / Proceed CTA').toBeTruthy();
  await testInfo.attach('Proceed CTA', {
    body: proceeded ? 'CTA clicked' : 'CTA not found',
    contentType: 'text/plain',
  });
}

test.describe('RedBus Combined Suite', () => {
  test.setTimeout(600000);

  test('RB_TC_001 Search buses for next Saturday', async ({ page }) => {
    const homePage = new HomePage(page);
    const srp = new SearchResultsPage(page);
    await homePage.searchBuses(FROM, TO);
    await srp.waitForResultsLoaded();
  });

  test('RB_TC_002 AC filter', async ({ page }) => {
    const homePage = new HomePage(page);
    const srp = new SearchResultsPage(page);
    await homePage.searchBuses(FROM, TO);
    await srp.waitForResultsLoaded();
    await srp.applyACFilter();
    await srp.assertFilteredResultsVisible();
  });

  test('RB_TC_003 4-5 star rating filter', async ({ page }) => {
    const homePage = new HomePage(page);
    const srp = new SearchResultsPage(page);
    await homePage.searchBuses(FROM, TO);
    await srp.waitForResultsLoaded();
    await srp.applyFiveStarOrHighRatedFilter();
    await srp.assertFilteredResultsVisible();
  });

  test('RB_TC_004 Seat selection with boarding and dropping', async ({ page }, testInfo) => {
    test.setTimeout(600000);
    await doSeatSelection(page, testInfo);
    await doBoardingDropping(page, testInfo);
  });

  test('RB_TC_005 Full E2E: seat -> boarding/dropping -> passenger details (stop before payment)', async ({ page }, testInfo) => {
    test.setTimeout(600000);

    // Steps 1-2: Search, seat selection (window preferred, any as fallback)
    await doSeatSelection(page, testInfo);

    // Step 3: Boarding & Dropping ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â first available boarding point, first available dropping point
    await doBoardingDropping(page, testInfo);

    // Step 4: Passenger details ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Name, Age, Gender with dummy test data
    const pp = new PassengerInfoPage(page);
    await pp.openPassengerInfoAndWait();
    const formVisible = await pp.isPassengerFormVisible();
    test.expect(formVisible, 'Passenger details form must be visible').toBeTruthy();
    await testInfo.attach('Passenger Form Visible', {
      body: formVisible ? 'yes' : 'no',
      contentType: 'text/plain',
    });

    const filled = await pp.fillRandomPassengerIfVisible();
    test.expect(filled, 'Passenger Name/Age/Gender must be filled with dummy data').toBeTruthy();
    await pp.takeScreenshot('04-passenger-filled');

    // Step 5: Click continue to proceed to payment page
    const continued = await pp.continueToPayment();
    test.expect(continued, 'Continue button must be clicked').toBeTruthy();
    await pp.takeScreenshot('05-payment-page');
    await pp.assertOnPaymentPage();
  });
});
