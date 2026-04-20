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
    // Wait for the search results page URL (not the SEO info page)
    await this.page.waitForURL(/search\?|bus-tickets/i, { timeout: 30000 }).catch(() => {});
    await this.page.screenshot({ path: 'debug-search-results-url.png', fullPage: true });

    // Primary signal: "View Seats" button means dynamic bus cards loaded
    const viewSeatsButton = this.page.getByRole('button', { name: /view seats for|^view seats$|select seats/i }).first();

    // Wait up to 60s for View Seats button to appear
    await expect(viewSeatsButton).toBeVisible({ timeout: 60000 });
    await this.page.screenshot({ path: 'debug-view-seats-visible.png', fullPage: true });
  }

  async applyACFilter(): Promise<void> {
    // Match "AC", "A/C", or similar (case-insensitive, with or without parenthesis)
    const acFilter = this.page.getByRole('button', { name: /A\/?C|AC/i }).first();
    if (!(await acFilter.isVisible({ timeout: 12000 }).catch(() => false))) {
      console.log('AC filter not available - continuing without AC filter');
      return;
    }
    await this.retryAction(async () => {
      if (!(await this.isFilterActive(acFilter))) {
        await this.safeClick(acFilter);
      }
      await this.page.waitForTimeout(1200);
    });
  }

  async applyFiveStarOrHighRatedFilter(): Promise<void> {
    // Match "5 star", "star rated", "top rated", or similar
    const ratingFilter = this.page
      .getByRole('button', { name: /5\s*star|star rated|top rated|high rated/i })
      .first();

    if (!(await ratingFilter.isVisible({ timeout: 12000 }).catch(() => false))) {
      console.log('High-rated filter not available - continuing without rating filter');
      return;
    }

    await this.retryAction(async () => {
      if (!(await this.isFilterActive(ratingFilter))) {
        await this.safeClick(ratingFilter);
      }
      await this.page.waitForTimeout(1200);
    });
  }

  async assertFilteredResultsVisible(): Promise<void> {
    // Take a debug screenshot before assertion
    await this.page.screenshot({ path: 'debug-before-buses-found.png', fullPage: true });

    // Try multiple selectors for robustness
    const busesFoundCandidates = [
      this.page.getByText(/\bbuses found\b/i).first(),
      this.page.getByText(/results found/i).first(),
      this.page.getByText(/bus(es)? available/i).first(),
      this.page.locator('[data-testid*="bus-count" i]').first(),
    ];
    let foundVisible = false;
    for (const candidate of busesFoundCandidates) {
      try {
        if (await candidate.isVisible({ timeout: 10000 }).catch(() => false)) {
          foundVisible = true;
          break;
        }
      } catch {}
    }

    // If none of the above, check for at least one bus card or "View Seats" button
    if (!foundVisible) {
      const busCard = this.page.locator('[data-testid*="bus-card" i], .bus-card, .BusCard').first();
      const viewSeats = this.page.getByRole('button', { name: /view seats for|^view seats$|select seats/i }).first();
      if (
        (await busCard.isVisible({ timeout: 5000 }).catch(() => false)) ||
        (await viewSeats.isVisible({ timeout: 5000 }).catch(() => false))
      ) {
        foundVisible = true;
      }
    }

    if (!foundVisible) {
      // Log all visible text for diagnosis
      const allText = await this.page.evaluate(() => document.body.innerText);
      console.log('No bus results text or cards visible. Visible text on page:\n' + allText.slice(0, 2000));
      await this.page.screenshot({ path: 'debug-buses-found-missing.png', fullPage: true });
      throw new Error('No bus results or "View Seats" button visible after search.');
    }

    // Still require "View Seats" button to be visible for downstream steps
    const viewSeats = this.page.getByRole('button', { name: /view seats for|^view seats$|select seats/i }).first();
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
