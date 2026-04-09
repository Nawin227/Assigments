import { test } from '@playwright/test';
import { RbTc001Page } from '../pages/rb-tc-001.page';
import { RbTc002Page } from '../pages/rb-tc-002.page';
import { RbTc003Page } from '../pages/rb-tc-003.page';
import { RbTc004Page } from '../pages/rb-tc-004.page';
import { RbTc005Page } from '../pages/rb-tc-005.page';
import { RbTc006Page } from '../pages/rb-tc-006.page';
import { RbTc007Page } from '../pages/rb-tc-007.page';
import { RbTc008Page } from '../pages/rb-tc-008.page';
import { RbTc009Page } from '../pages/rb-tc-009.page';

const FROM_CITY = 'Hyderabad';
const TO_CITY = 'Bangalore';

test.describe('RedBus Combined Suite', () => {
  test.setTimeout(240000);

  test('RB_TC_001 Verify user can search buses for next Saturday', async ({ page }) => {
    const tc001 = new RbTc001Page(page);
    await tc001.run(FROM_CITY, TO_CITY);
  });

  test('RB_TC_002 Verify AC filter functionality', async ({ page }) => {
    const tc002 = new RbTc002Page(page);
    await tc002.run(FROM_CITY, TO_CITY);
  });

  test('RB_TC_003 Verify 4-5 star rating filter', async ({ page }) => {
    const tc003 = new RbTc003Page(page);
    await tc003.run(FROM_CITY, TO_CITY);
  });

  test('RB_TC_004 Verify combined filters AC and High Rating', async ({ page }) => {
    const tc004 = new RbTc004Page(page);
    await tc004.run(FROM_CITY, TO_CITY);
  });

  test('RB_TC_005 Verify bus seat selection', async ({ page }) => {
    const tc005 = new RbTc005Page(page);
    await tc005.run(FROM_CITY, TO_CITY);
  });

  test('RB_TC_006 Verify passenger details entry', async ({ page }) => {
    const tc006 = new RbTc006Page(page);
    await tc006.run(FROM_CITY, TO_CITY);
  });

  test('RB_TC_007 Verify fare calculation', async ({ page }) => {
    const tc007 = new RbTc007Page(page);
    await tc007.run(FROM_CITY, TO_CITY);
  });

  test('RB_TC_008 Verify payment navigation', async ({ page }) => {
    const tc008 = new RbTc008Page(page);
    await tc008.run(FROM_CITY, TO_CITY);
  });

  test('RB_TC_009 Verify successful booking Happy Path', async ({ page }) => {
    const tc009 = new RbTc009Page(page);
    await tc009.run(FROM_CITY, TO_CITY);
  });
});
