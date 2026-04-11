import { expect } from '@playwright/test';
import { BasePage } from './00_BasePage';

export class SearchResultsPage extends BasePage {
  private async hasSeatMapVisible(timeoutMs: number): Promise<boolean> {
    const checks = [
      // Step tab "1. Select seats" visible inside the seat-layout dialog/overlay
      this.page.getByText(/1\.\s*select seats/i).first(),
      // Deck title visible
      this.page.getByText(/lower deck|upper deck/i).first(),
      // Any seat element with an aria-label describing seat status
      this.page.locator('[aria-label*="seat status"]').first(),
      // Fallback: "Know your seat types" text
      this.page.getByText(/know your seat types/i).first(),
    ];

    for (const locator of checks) {
      if (await locator.isVisible({ timeout: timeoutMs }).catch(() => false)) {
        return true;
      }
    }

    return false;
  }

  private async isFilterActive(filterButton: ReturnType<typeof this.page.getByRole>): Promise<boolean> {
    return filterButton.evaluate((el) => {
      const node = el as HTMLElement;
      const cls = node.className || '';
      return node.hasAttribute('active') || /active|selected/i.test(cls) || node.getAttribute('aria-pressed') === 'true';
    }).catch(() => false);
  }

  async waitForResultsLoaded(): Promise<void> {
    await expect(this.page.getByText(/\bbuses found\b/i).first()).toBeVisible({ timeout: 60000 });
    const firstBusCard = this.page
      .locator('button[aria-label*="Departs" i], button[aria-label*="Duration" i], [data-autoid*="bus" i]')
      .first();
    await expect(firstBusCard).toBeVisible({ timeout: 30000 });
  }

  async applyACFilter(): Promise<void> {
    const acFilter = this.page.getByRole('button', { name: /^AC\s*\(/i }).first();
    await this.retryAction(async () => {
      await expect(acFilter).toBeVisible({ timeout: 15000 });
      if (!(await this.isFilterActive(acFilter))) {
        await this.safeClick(acFilter);
      }
      await this.page.waitForTimeout(1200);
    });
  }

  async applyFiveStarOrHighRatedFilter(): Promise<void> {
    const ratingFilter = this.page
      .getByRole('button', { name: /5\s*star|high rated buses/i })
      .first();

    await this.retryAction(async () => {
      await expect(ratingFilter).toBeVisible({ timeout: 15000 });
      if (!(await this.isFilterActive(ratingFilter))) {
        await this.safeClick(ratingFilter);
      }
      await this.page.waitForTimeout(1200);
    });
  }

  async assertFilteredResultsVisible(): Promise<void> {
    await expect(this.page.getByText(/\bbuses found\b/i).first()).toBeVisible({ timeout: 30000 });
    const viewSeats = this.page.getByRole('button', { name: /view seats for|^view seats$/i }).first();
    await expect(viewSeats).toBeVisible({ timeout: 20000 });
  }

  async getViewSeatButtonsCount(limit = 12): Promise<number> {
    const viewSeatButtons = this.page.getByRole('button', { name: /view seats for|^view seats$|select seats/i });
    const count = await viewSeatButtons.count();
    return Math.min(count, limit);
  }

  async openSeatLayoutByIndex(index: number): Promise<boolean> {
    const viewSeatButtons = this.page.getByRole('button', { name: /view seats for|^view seats$|select seats/i });
    const count = await viewSeatButtons.count();
    if (index < 0 || index >= count) {
      return false;
    }

    const btn = viewSeatButtons.nth(index);
    if (!(await btn.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false;
    }

    await this.safeClick(btn).catch(async () => {
      await this.page.evaluate((i) => {
        const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        const view = buttons.filter((b) => /view seats/i.test((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '')));
        if (view[i]) view[i].click();
      }, index);
    });
    return this.hasSeatMapVisible(8000);
  }

  async openFirstBusSeatLayout(): Promise<void> {
    const opened = await this.openSeatLayoutByIndex(0);
    expect(opened).toBeTruthy();
  }
}
