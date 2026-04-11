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
    await this.open();
    await this.enterFromCity(fromCity);
    await this.enterToCity(toCity);
    await this.selectNextSaturdayJourneyDate();
    await this.clickSearchBuses();
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
