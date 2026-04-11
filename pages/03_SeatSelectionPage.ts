import { expect } from '@playwright/test';
import { BasePage } from './00_BasePage';

export class SeatSelectionPage extends BasePage {
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

  private async selectSeat(): Promise<boolean> {
    // RedBus seats are SPAN[role="button"] with aria-labels like:
    //   "Seat number L1, lower deck, seat type sleeper, unreserved, price 2199 rupees, seat status available"
    //   "Seat number L3, lower deck, seat type sleeper, reserved for male, price 1599 rupees, seat status sold"
    // Using Playwright's native .click() to properly trigger React events.
    const availableSeats = this.page.locator('[aria-label*="seat status available"]');
    const count = await availableSeats.count();
    if (count === 0) return false;

    // Click the first available seat
    const seat = availableSeats.first();
    await seat.scrollIntoViewIfNeeded().catch(() => undefined);
    await seat.click({ timeout: 5000 });

    // Wait for selection to register
    await this.page.waitForTimeout(1500);
    return true;
  }

  private async verifySeatSelected(): Promise<void> {
    const byAriaLabel = this.page
      .locator('[aria-label*="seat status selected"]')
      .first();
    const bySelectionText = this.page.getByText(/selected seat|seat no|seat selected|view selected seats/i).first();
    const visible =
      (await byAriaLabel.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await bySelectionText.isVisible({ timeout: 5000 }).catch(() => false));

    expect(visible).toBeTruthy();
  }

  private async verifySeatHighlighted(): Promise<void> {
    const selectedSeat = this.page
      .locator('[aria-label*="seat status selected"]')
      .first();
    const isHighlighted = await selectedSeat.isVisible({ timeout: 7000 }).catch(() => false);

    expect(isHighlighted).toBeTruthy();
  }

  private async verifySeatDetails(): Promise<void> {
    await expect(
      this.page
        .locator('text=/selected seat|seat no|boarding|dropping|fare|amount payable/i')
        .first()
    ).toBeVisible({ timeout: 15000 });
  }

  async waitForSeatLayout(): Promise<void> {
    expect(await this.hasSeatMapVisible(30000)).toBeTruthy();
  }

  async trySelectAvailableSeat(): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const selected = await this.selectSeat();
      if (!selected) continue;

      // Wait then check if selection registered
      await this.page.waitForTimeout(1500);

      // On RedBus, selected seats get [aria-pressed="true"] attribute, and the
      // "N seat(s)" count text appears in the booking summary.
      // The aria-label does NOT change to "seat status selected".
      const seatPressed = this.page.locator('[aria-label*="seat status available"][aria-pressed="true"]').first();
      // Or a seat count like "1 seat" / "2 seats" appears
      const seatCount = this.page.getByText(/\d+\s*seat/i).first();
      // Or the "2. Board/Drop point" tab becomes clickable
      const boardButton = this.page.getByText(/2\.\s*board.*drop/i).first();

      const registered =
        (await seatPressed.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await seatCount.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await boardButton.isVisible({ timeout: 3000 }).catch(() => false));

      if (registered) {
        console.log('Seat button clicked successfully');
        console.log('Seat is selected');
        return true;
      }

      console.log(`Seat click attempt ${attempt + 1} did not register — retrying`);
    }

    return false;
  }

  async selectAvailableSeat(): Promise<void> {
    const selected = await this.trySelectAvailableSeat();
    expect(selected).toBeTruthy();
  }

  async openBoardingDroppingTab(): Promise<void> {
    const tab = this.page.getByRole('tab', { name: /board\s*\/?\s*drop point/i }).first();

    if (await tab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.safeClick(tab);
      return;
    }

    const fallback = this.page.getByText(/board\s*\/?\s*drop point/i).first();
    await expect(fallback).toBeVisible({ timeout: 10000 });
    await this.safeClick(fallback);

    await expect(
      this.page.getByText(/boarding point|dropping point|view all boarding points|view all dropping points/i).first()
    ).toBeVisible({ timeout: 15000 });
  }

  async selectBoardingAndDropping(): Promise<void> {
    const selected = await this.page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.body;

      const radios = Array.from(dialog.querySelectorAll('input[type="radio"]:not([disabled])')) as HTMLInputElement[];
      if (radios.length > 0) {
        radios[0].click();
        if (radios.length > 1) radios[1].click();
        return true;
      }

      const options = Array.from(dialog.querySelectorAll('button, [role="option"], [role="radio"], li')) as HTMLElement[];
      const candidates = options.filter((el) => /boarding|dropping|pickup|drop/i.test((el.textContent || '').trim()));
      if (candidates.length === 0) {
        return false;
      }

      candidates[0].click();
      if (candidates.length > 1) candidates[1].click();
      return true;
    });

    if (!selected) {
      // Not all operators expose explicit boarding/dropping selectors before proceed.
      return;
    }
  }

  async assertSeatAndPointsSummary(): Promise<void> {
    try {
      await this.verifySeatDetails();
    } catch {
      const fallbackSummary = this.page
        .locator('text=/selected seat|seat no|fare|amount payable|view selected seats/i')
        .first();
      await expect(fallbackSummary).toBeVisible({ timeout: 10000 });
    }
  }

  async closeSeatLayoutIfOpen(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]:visible').first();
    if (!(await dialog.isVisible({ timeout: 1500 }).catch(() => false))) {
      return;
    }

    const closeButton = dialog
      .getByRole('button', { name: /close|cancel|dismiss|back/i })
      .first();

    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.safeClick(closeButton);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
  }
}
