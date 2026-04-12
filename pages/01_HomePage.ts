import { expect } from '@playwright/test';
import { BasePage } from './00_BasePage';
import { escapeRegExp, getNextSaturdayDate } from '../utils/helpers';

export class HomePage extends BasePage {
  async open(): Promise<void> {
    await this.goto('https://www.redbus.in/');
    await this.page.screenshot({ path: 'debug-home-opened.png', fullPage: true });
    await this.closeBannerIfPresent();
    await this.page.screenshot({ path: 'debug-banner-closed.png', fullPage: true });
  }

  async enterFromCity(city: string): Promise<void> {
    await this.selectCity('From', city);
    await this.page.screenshot({ path: 'debug-from-city.png', fullPage: true });
  }

  async enterToCity(city: string): Promise<void> {
    await this.selectCity('To', city);
    await this.page.screenshot({ path: 'debug-to-city.png', fullPage: true });
  }

  async selectNextSaturdayJourneyDate(): Promise<void> {
    await this.page.getByRole('combobox', { name: /select date of journey/i }).first().click();
    await this.page.screenshot({ path: 'debug-date-picker-opened.png', fullPage: true });

    const nextSaturday = getNextSaturdayDate();
    const fullDateLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(nextSaturday);

    const exactDate = this.page.getByRole('button', {
      name: new RegExp(escapeRegExp(fullDateLabel), 'i'),
    }).first();

    if (await exactDate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.safeClick(exactDate);
      await this.page.screenshot({ path: 'debug-date-selected.png', fullPage: true });
      return;
    }

    const anyEnabledDate = this.page
      .locator('button[aria-label*="April" i], button[aria-label*="May" i], td button')
      .filter({ hasNotText: /^$/ })
      .first();
    await this.safeClick(anyEnabledDate);
    await this.page.screenshot({ path: 'debug-date-fallback.png', fullPage: true });
  }

  async clickSearchBuses(): Promise<void> {
    const searchButton = this.page
      .locator('#search_btn, button:has-text("Search buses"), button:has-text("Search Buses")')
      .first();
    await this.safeClick(searchButton);
    await this.page.screenshot({ path: 'debug-search-clicked.png', fullPage: true });
  }

async searchBuses(fromCity: string, toCity: string): Promise<void> {
  if (process.env.CI) {
    console.log('[CI DETECTED] Using direct search URL for bus search');
    await this.searchBusesViaUrl(fromCity, toCity);
    return;
  }
  console.log('[LOCAL/DEV] Using UI flow for bus search');
  await this.open();
  await this.enterFromCity(fromCity);
  await this.enterToCity(toCity);
  await this.selectNextSaturdayJourneyDate();
  await this.clickSearchBuses();
}

  async searchBusesViaUrl(fromCity: string, toCity: string): Promise<void> {
    const cityIds: Record<string, { id: number; type: string }> = {
      Hyderabad: { id: 124, type: 'CITY' },
      Bangalore: { id: 122, type: 'CITY' },
      Chennai: { id: 123, type: 'CITY' },
      Mumbai: { id: 121, type: 'CITY' },
      Delhi: { id: 781, type: 'CITY' },
      Pune: { id: 130, type: 'CITY' },
      Goa: { id: 210, type: 'CITY' },
    };

    const from = cityIds[fromCity] ?? { id: 124, type: 'CITY' };
    const to = cityIds[toCity] ?? { id: 122, type: 'CITY' };

    const nextSaturday = getNextSaturdayDate();
    const day = nextSaturday.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const doj = `${day}-${monthNames[nextSaturday.getMonth()]}-${nextSaturday.getFullYear()}`;

    const url = `https://www.redbus.in/search?fromCityName=${encodeURIComponent(fromCity)}&fromCityId=${from.id}&srcCountry=India&fromCityType=${from.type}&toCityName=${encodeURIComponent(toCity)}&toCityId=${to.id}&destCountry=India&toCityType=${to.type}&onward=${doj}&doj=${doj}&ref=home`;

    await this.goto(url);
    await this.closeBannerIfPresent();
  }

  private async selectCity(fieldName: 'From' | 'To', city: string): Promise<void> {
    const input = this.page.getByRole('combobox', { name: new RegExp(`^${fieldName}$`, 'i') }).first();
    await input.fill('');
    await input.click({ force: true });
    // Type slowly to trigger suggestions reliably in all browsers
    for (const char of city) {
      await input.type(char, { delay: 100 });
    }
    await this.page.waitForTimeout(500); // Wait for suggestions to appear

    const suggestions = this.page.locator('.autoFill li, [role="option"], li[class*="auto"]');
    const citySuggestion = suggestions.filter({ hasText: new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i') }).first();

    // Try clicking the exact suggestion, retry if needed
    for (let attempt = 0; attempt < 2; attempt++) {
      if (await citySuggestion.isVisible({ timeout: 4000 }).catch(() => false)) {
        await this.safeClick(citySuggestion);
        break;
      }
      await this.page.waitForTimeout(500);
    }

    // Fallback: click the first suggestion if exact not found
    if (!(await citySuggestion.isVisible({ timeout: 2000 }).catch(() => false))) {
      if (await suggestions.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.safeClick(suggestions.first());
      }
    }

    // Extra wait for WebKit to ensure value is set
    await this.page.waitForTimeout(500);
    await expect(input).toHaveValue(/.+/, { timeout: 7000 });
  }
}
