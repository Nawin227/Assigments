import { expect, type Locator, type Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async safeClick(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    try {
      await locator.click({ timeout: 10000 });
    } catch {
      try {
        await locator.click({ force: true, timeout: 5000 });
      } catch {
        await locator.evaluate((el) => {
          (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
          (el as HTMLElement).click();
        });
      }
    }
  }

  async safeFill(locator: Locator, value: string): Promise<void> {
    await expect(locator).toBeVisible({ timeout: 15000 });
    await locator.click({ force: true });
    await locator.fill('');
    await locator.fill(value);
  }

  /** Fill input using native React value setter to ensure React state updates */
  async reactFill(locator: Locator, value: string): Promise<void> {
    await expect(locator).toBeVisible({ timeout: 15000 });
    await locator.evaluate((el, val) => {
      const input = el as HTMLInputElement;
      input.focus();
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        nativeSetter.call(input, val);
      } else {
        input.value = val;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }, value);
  }

  async closeBannerIfPresent(): Promise<void> {
    const closeBanner = this.page.getByRole('button', { name: /close app install banner/i });
    if (await closeBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.safeClick(closeBanner);
    }
  }

  async retryAction(action: () => Promise<void>, attempts = 3, waitMs = 1200): Promise<void> {
    let lastError: unknown;
    for (let i = 1; i <= attempts; i++) {
      try {
        await action();
        return;
      } catch (error) {
        lastError = error;
        if (i < attempts) {
          await this.page.waitForTimeout(waitMs);
        }
      }
    }
    throw lastError;
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/${name}.png`,
      fullPage: true,
    });
  }
}
