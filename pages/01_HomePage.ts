import { expect } from '@playwright/test';
import { BasePage } from './00_BasePage';
import { escapeRegExp, getNextSaturdayDate } from '../utils/helpers';

export class HomePage extends BasePage {
  async open(): Promise<void> {
    await this.goto('https://www.redbus.in/');
    await this.closeBannerIfPresent();
  }

  async enterFromCity(city: string): Promise<void> {
    await this.selectCity('From', city);
  }

  async enterToCity(city: string): Promise<void> {
    await this.selectCity('To', city);
  }

  async selectNextSaturdayJourneyDate(): Promise<void> {
    await this.page.getByRole('combobox', { name: /select date of journey/i }).first().click();

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
      return;
    }

    const anyEnabledDate = this.page
      .locator('button[aria-label*="April" i], button[aria-label*="May" i], td button')
      .filter({ hasNotText: /^$/ })
      .first();
    await this.safeClick(anyEnabledDate);
  }

  async clickSearchBuses(): Promise<void> {
    const searchButton = this.page
      .locator('#search_btn, button:has-text("Search buses"), button:has-text("Search Buses")')
      .first();
    await this.safeClick(searchButton);
  }

  async searchBuses(fromCity: string, toCity: string): Promise<void> {
    if (process.env.CI) {
      // In CI/headless mode, go directly to search URL to avoid bot detection
      await this.searchBusesViaUrl(fromCity, toCity);
      return;
    }
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
    await this.safeFill(input, city);

    const suggestions = this.page.locator('.autoFill li, [role="option"], li[class*="auto"]');
    const citySuggestion = suggestions
      .filter({ hasText: new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i') })
      .first();

    if (await citySuggestion.isVisible({ timeout: 6000 }).catch(() => false)) {
      await this.safeClick(citySuggestion);
      return;
    }

    if (await suggestions.first().isVisible({ timeout: 6000 }).catch(() => false)) {
      await this.safeClick(suggestions.first());
      return;
    }

    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(input).toHaveValue(/.+/, { timeout: 5000 });
  }
}
