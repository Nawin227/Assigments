import { expect, type Locator, type Page } from '@playwright/test';

export class RbTc001Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getNextSaturdayDate(): Date {
    const today = new Date();
    const day = today.getDay();

    let diff = (6 - day + 7) % 7;
    if (diff === 0) diff = 7;

    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + diff);
    return nextSaturday;
  }

  private async safeClick(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    try {
      await locator.click({ timeout: 8000 });
    } catch {
      try {
        await locator.click({ force: true });
      } catch {
        await locator.evaluate((el) => {
          (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
          (el as HTMLElement).click();
        });
      }
    }
  }

  async openHome(): Promise<void> {
    await this.page.goto('https://www.redbus.in/', { waitUntil: 'domcontentloaded' });

    const closeBanner = this.page.getByRole('button', { name: /close app install banner/i });
    if (await closeBanner.isVisible().catch(() => false)) {
      await closeBanner.click();
    }
  }

  private async selectCity(fieldName: 'From' | 'To', city: string): Promise<void> {
    const input = this.page.getByRole('combobox', { name: new RegExp(`^${fieldName}$`, 'i') }).first();
    await expect(input).toBeVisible({ timeout: 20000 });

    await input.click({ force: true });
    await input.fill(city);

    const suggestions = this.page.locator('.autoFill li, [role="option"], li[class*="auto"]');
    const citySuggestion = suggestions
      .filter({ hasText: new RegExp(`\\b${this.escapeRegExp(city)}\\b`, 'i') })
      .first();

    if (await citySuggestion.isVisible({ timeout: 6000 }).catch(() => false)) {
      await citySuggestion.click();
      return;
    }

    if (await suggestions.first().isVisible({ timeout: 6000 }).catch(() => false)) {
      await suggestions.first().click();
      return;
    }

    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  private async selectNextSaturday(): Promise<void> {
    await this.page.getByRole('combobox', { name: /select date of journey/i }).first().click();

    const nextSaturday = this.getNextSaturdayDate();
    const fullDateLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(nextSaturday);

    const targetCell = this.page.getByRole('button', {
      name: new RegExp(this.escapeRegExp(fullDateLabel), 'i'),
    }).first();

    await expect(targetCell).toBeVisible({ timeout: 15000 });
    await targetCell.click();
  }

  private async clickSearchBuses(): Promise<void> {
    const searchButton = this.page.locator('#search_btn, button:has-text("Search buses"), button:has-text("Search Buses")').first();
    await this.safeClick(searchButton);
  }

  private busCards(): Locator {
    return this.page.locator('.bus-items, [class*="bus-item"], li:has([class*="travels"])');
  }

  private async waitForResults(): Promise<void> {
    await this.page.waitForSelector('.bus-items, [class*="bus-item"], li:has([class*="travels"])', {
      timeout: 60000,
    });
    await expect(this.busCards().first()).toBeVisible({ timeout: 30000 });
  }

  async run(fromCity: string, toCity: string): Promise<void> {
    await this.openHome();
    await this.selectCity('From', fromCity);
    await this.selectCity('To', toCity);
    await this.selectNextSaturday();
    await this.clickSearchBuses();
    await this.waitForResults();

    const cards = this.busCards();
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  }
}
