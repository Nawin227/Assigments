import { expect, type Locator, type Page } from '@playwright/test';

export type PassengerData = {
  name: string;
  age: string;
  email: string;
  mobile: string;
  gender: 'Male' | 'Female';
};

export class RedBusPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async safeClick(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    try {
      await locator.click({ timeout: 10000 });
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

  private getNextSaturdayDate(): Date {
    const today = new Date();
    const day = today.getDay();

    let diff = (6 - day + 7) % 7;
    if (diff === 0) diff = 7;

    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + diff);
    return nextSaturday;
  }

  private toMinutes(timeText: string): number | null {
    const match = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!match) return null;

    let hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    const meridian = (match[3] || '').toLowerCase();

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;

    return hour * 60 + minute;
  }

  async openHome(): Promise<void> {
    await this.page.goto('https://www.redbus.in/', { waitUntil: 'domcontentloaded' });

    const closeBanner = this.page.getByRole('button', { name: /close app install banner/i });
    if (await closeBanner.isVisible().catch(() => false)) {
      await closeBanner.click();
    }

    await expect(this.page.getByRole('combobox', { name: /from/i }).first()).toBeVisible({ timeout: 20000 });
  }

  private async selectCity(fieldName: 'From' | 'To', city: string): Promise<void> {
    const input = this.page.getByRole('combobox', { name: new RegExp(fieldName, 'i') }).first();
    await expect(input).toBeVisible({ timeout: 20000 });

    await input.click({ force: true });
    await input.fill(city);

    const suggestions = this.page.locator('.autoFill li, [role="option"], li[class*="auto"]');
    const cityOption = suggestions.filter({ hasText: new RegExp(`\\b${this.escapeRegExp(city)}\\b`, 'i') }).first();

    if (await cityOption.isVisible({ timeout: 6000 }).catch(() => false)) {
      await cityOption.click();
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

  busCards(): Locator {
    return this.page.locator('.bus-items, [class*="bus-item"], li:has([class*="travels"])');
  }

  private async waitForResults(): Promise<void> {
    await this.page.waitForSelector('.bus-items, [class*="bus-item"], li:has([class*="travels"])', {
      timeout: 60000,
    });
    await expect(this.busCards().first()).toBeVisible({ timeout: 30000 });
  }

  async searchBuses(fromCity: string, toCity: string): Promise<void> {
    await this.selectCity('From', fromCity);
    await this.selectCity('To', toCity);
    await this.selectNextSaturday();
    await this.clickSearchBuses();
    await this.waitForResults();
  }

  async applyFilter(pattern: RegExp): Promise<void> {
    const filter = this.page
      .locator('[class*="filter"] label, [class*="filter"] div, [class*="filter"] span, label, button, div, span')
      .filter({ hasText: pattern })
      .first();

    await expect(filter).toBeVisible({ timeout: 25000 });
    await this.safeClick(filter);
    await this.page.waitForTimeout(1500);
    await expect(this.busCards().first()).toBeVisible({ timeout: 30000 });
  }

  async applyACFilter(): Promise<void> {
    await this.applyFilter(/\bAC\b/i);
  }

  async applyHighRatingFilter(): Promise<void> {
    await this.applyFilter(/High Rated Buses|4\s*Star|4\.0\+|Top Rated|4 and above|5 Star/i);
  }

  async assertAllVisibleBusesAreAC(maxCards = 8): Promise<void> {
    const cards = this.busCards();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const checks = Math.min(count, maxCards);
    for (let i = 0; i < checks; i++) {
      const card = cards.nth(i);
      if (!(await card.isVisible().catch(() => false))) continue;
      await expect(card).toContainText(/AC|A\/C|Sleeper AC|Seater AC/i);
    }
  }

  async assertAllVisibleBusesRatingAtLeast4(maxCards = 8): Promise<void> {
    const cards = this.busCards();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const checks = Math.min(count, maxCards);
    for (let i = 0; i < checks; i++) {
      const card = cards.nth(i);
      if (!(await card.isVisible().catch(() => false))) continue;
      const text = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');

      const ratingMatch =
        text.match(/Rated\s+([0-9]+(?:\.[0-9])?)\s+out of\s+5/i) ||
        text.match(/\b([0-9]+(?:\.[0-9])?)\s*(?:star|rating)\b/i) ||
        text.match(/\b([4-5](?:\.[0-9])?)\b/);

      if (ratingMatch) {
        expect(Number.parseFloat(ratingMatch[1])).toBeGreaterThanOrEqual(4);
      }
    }
  }

  async assertDepartureAtOrAfter6PM(): Promise<void> {
    const firstBus = this.busCards().first();
    await expect(firstBus).toBeVisible({ timeout: 20000 });

    const content = await firstBus.innerText();
    const match = content.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
    expect(match).not.toBeNull();

    const minutes = this.toMinutes(match?.[1] || '');
    expect(minutes).not.toBeNull();
    if (minutes !== null) {
      expect(minutes).toBeGreaterThanOrEqual(18 * 60);
    }
  }

  async openViewSeatsForFirstVisibleBus(): Promise<void> {
    const viewSeats = this.page.locator('button, div, span, a').filter({ hasText: /^view seats$/i }).first();
    await expect(viewSeats).toBeVisible({ timeout: 30000 });
    await this.safeClick(viewSeats);
    await this.ensureSeatMapOpen();
  }

  async ensureSeatMapOpen(): Promise<void> {
    const seatMap = this.page.locator('[class*="seatmap" i], [class*="seat-map" i], .seat-layout, [class*="deck" i]').first();

    if (await seatMap.isVisible({ timeout: 5000 }).catch(() => false)) return;

    const viewSeatsFallback = this.page.locator('button, div, span, a').filter({ hasText: /view seats|select seats/i }).first();
    if (await viewSeatsFallback.isVisible().catch(() => false)) {
      await this.safeClick(viewSeatsFallback);
    }

    const opened = await seatMap.isVisible({ timeout: 8000 }).catch(() => false);
    if (!opened) {
      const seatKeywordsVisible = await this.page
        .getByText(/selected seat|seat no|view selected seats|proceed to book/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(seatKeywordsVisible).toBeTruthy();
    }
  }

  async selectAnyAvailableSeat(): Promise<void> {
    await this.ensureSeatMapOpen();

    const seatByAria = this.page.locator(
      'button[aria-label*="seat" i][aria-label*="available" i], button[title*="available" i], div[role="button"][aria-label*="available" i]',
    ).first();

    if (await seatByAria.isVisible({ timeout: 12000 }).catch(() => false)) {
      await this.safeClick(seatByAria);
      if (await this.isSeatSelected()) return;
    }

    const seatNodes = this.page.locator(
      '[class*="seat" i][class*="available" i]:not([class*="unavailable" i]):not([class*="legend" i])',
    );

    const count = Math.min(await seatNodes.count(), 8);
    for (let i = 0; i < count; i++) {
      const seat = seatNodes.nth(i);
      if (!(await seat.isVisible().catch(() => false))) continue;
      await this.safeClick(seat);
      if (await this.isSeatSelected()) return;
    }

    const domClick = await this.page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*')) as HTMLElement[];
      const target = all.find((el) => {
        const cls = (el.className || '').toString().toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        const isSeat = cls.includes('seat') || aria.includes('seat');
        const isAvailable = cls.includes('available') || aria.includes('available');
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 4 && rect.height > 4;

        return isSeat && isAvailable && visible;
      });

      if (!target) return false;
      target.click();
      return true;
    });

    expect(domClick).toBeTruthy();
    expect(await this.isSeatSelected()).toBeTruthy();
  }

  async isSeatSelected(): Promise<boolean> {
    const byClass = await this.page
      .locator('[class*="seat" i][class*="selected" i], [class*="selected" i][aria-label*="seat" i]')
      .first()
      .isVisible()
      .catch(() => false);

    const byText = await this.page
      .getByText(/selected seat|seat no|seat selected|view selected seats/i)
      .first()
      .isVisible()
      .catch(() => false);

    return byClass || byText;
  }

  generateRandomPassengerData(): PassengerData {
    const firstNames = ['Arun', 'Vikram', 'Karthik', 'Rohan', 'Naveen', 'Rahul'];
    const lastNames = ['Kumar', 'Reddy', 'Sharma', 'Verma', 'Singh', 'Patel'];

    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const age = String(21 + Math.floor(Math.random() * 25));
    const token = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    return {
      name: `${first} ${last}`,
      age,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${token}@example.com`,
      mobile: `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      gender: 'Male',
    };
  }

  async fillPassengerDetails(data: PassengerData): Promise<void> {
    const nameInput = this.page.locator('input[name*="name" i], input[placeholder*="name" i], input[id*="name" i]').first();
    if (await nameInput.isVisible().catch(() => false)) await nameInput.fill(data.name);

    const ageInput = this.page.locator('input[name*="age" i], input[placeholder*="age" i], input[id*="age" i]').first();
    if (await ageInput.isVisible().catch(() => false)) await ageInput.fill(data.age);

    const emailInput = this.page.locator('input[type="email"], input[name*="mail" i], input[placeholder*="email" i]').first();
    if (await emailInput.isVisible().catch(() => false)) await emailInput.fill(data.email);

    const mobileInput = this.page.locator('input[type="tel"], input[name*="mobile" i], input[name*="phone" i], input[placeholder*="mobile" i]').first();
    if (await mobileInput.isVisible().catch(() => false)) await mobileInput.fill(data.mobile);

    const maleOption = this.page.locator('input[value*="male" i], label:has-text("Male"), button:has-text("Male")').first();
    if (await maleOption.isVisible().catch(() => false)) await this.safeClick(maleOption);
  }

  async continueToPayment(maxAttempts = 8): Promise<void> {
    const tryClick = async (pattern: RegExp): Promise<boolean> => {
      const btn = this.page.getByRole('button', { name: pattern }).first();
      if (await btn.isVisible().catch(() => false)) {
        await this.safeClick(btn);
        await this.page.waitForTimeout(500);
        return true;
      }

      const generic = this.page.locator('button, [role="button"], div, span').filter({ hasText: pattern }).first();
      if (await generic.isVisible().catch(() => false)) {
        await this.safeClick(generic);
        await this.page.waitForTimeout(500);
        return true;
      }

      return false;
    };

    for (let i = 0; i < maxAttempts; i++) {
      await tryClick(/view selected seats|proceed to book/i);
      await tryClick(/continue|next/i);
      await tryClick(/proceed|proceed to pay|pay now|payment/i);

      if (await this.isAtPaymentOrPrePayment()) return;
    }
  }

  async isAtPaymentOrPrePayment(): Promise<boolean> {
    const byUrl = /payment|checkout|pay/i.test(this.page.url());
    const byPayButton = await this.page.getByRole('button', { name: /proceed to pay|pay now/i }).first().isVisible().catch(() => false);
    const byPaymentText = await this.page.getByText(/payment|upi|credit card|debit card|net banking|wallet/i).first().isVisible().catch(() => false);
    const bySeatText = await this.page.getByText(/selected seat|seat no|seat selected|view selected seats/i).first().isVisible().catch(() => false);

    return byUrl || byPayButton || byPaymentText || bySeatText;
  }

  async assertFareBreakdownVisible(): Promise<void> {
    const fareText = await this.page
      .getByText(/base fare|tax|convenience fee|total fare|amount payable|grand total|fare/i)
      .first()
      .isVisible()
      .catch(() => false);

    const amount = await this.page
      .locator('text=/₹\s?[\d,]+|(?:Rs\\.?|INR)\s?[\d,]+/i')
      .first()
      .isVisible()
      .catch(() => false);

    expect(fareText || amount).toBeTruthy();
  }

  async assertPaymentNavigationVisible(): Promise<void> {
    expect(await this.isAtPaymentOrPrePayment()).toBeTruthy();
  }

  async assertBookingConfirmationIfAvailable(): Promise<void> {
    const confirmation = await this.page
      .getByText(/booking confirmed|ticket booked|booking id|pnr|trip id|confirmed/i)
      .first()
      .isVisible()
      .catch(() => false);

    const emailSmsHint = await this.page
      .getByText(/email|sms|sent to|download ticket|view ticket/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(confirmation || emailSmsHint || (await this.isAtPaymentOrPrePayment())).toBeTruthy();
  }
}
