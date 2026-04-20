import { expect } from '@playwright/test';
import { BasePage } from './00_BasePage';

export class BoardingDroppingPage extends BasePage {
  /**
   * After seat selection, navigate to the Board/Drop step.
   * Two approaches:
   *  1. Click the "Select boarding & dropping points" CTA button (appears after seat is selected)
   *  2. Click the "Board/Drop point" tab (tab text may or may not have "2." prefix)
   */
  async openBoardingDroppingMenu(): Promise<{ visible: boolean; clicked: boolean; source: string }> {
    // Primary: the CTA button "Select boarding & dropping points" that appears after seat selection
    const ctaButton = this.page.getByRole('button', { name: /select boarding.*dropping/i }).first();
    if (await ctaButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.safeClick(ctaButton).catch(async () => { await ctaButton.click({ force: true }); });
      await this.page.waitForTimeout(2000);
      return { visible: true, clicked: true, source: 'cta-button' };
    }

    // Secondary: click the "Board/Drop point" tab (may or may not have "2." prefix)
    const stepTab = this.page.getByText(/board\s*\/?\s*drop\s*point/i).first();
    if (await stepTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.safeClick(stepTab).catch(async () => { await stepTab.click({ force: true }); });
      await this.page.waitForTimeout(2000);
      return { visible: true, clicked: true, source: 'step-tab' };
    }

    // Fallback: role="tab" with Board/Drop text
    const roleTab = this.page.getByRole('tab', { name: /board.*drop|drop.*board/i }).first();
    if (await roleTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.safeClick(roleTab);
      await this.page.waitForTimeout(2000);
      return { visible: true, clicked: true, source: 'role-tab' };
    }

    return { visible: false, clicked: false, source: 'none' };
  }

  /**
   * Select the FIRST boarding point radio and FIRST dropping point radio.
   * Boarding radios have id="bp-point-N", dropping radios have id="dp-point-N".
   * Uses force:true because the seat layout overlay can intercept pointer events.
   *
   * DOM structure (from MCP inspection):
   *  - Boarding: heading "Boarding points" → sibling radiogroup → radio items
   *  - Dropping: heading "Dropping points" → sibling radio items (no radiogroup wrapper)
   */
  async selectRandomBoardingAndDropping(): Promise<{ selected: boolean; details: string }> {
    await this.page.waitForTimeout(2000);
    const labels: string[] = [];

    // --- Boarding point ---
    // Primary: boarding radios have id="bp-point-N" (confirmed from DOM inspection)
    let boardingDone = false;
    const boardingById = this.page.locator('[id^="bp-point-"]').first();
    if (await boardingById.isVisible({ timeout: 10000 }).catch(() => false)) {
      await boardingById.scrollIntoViewIfNeeded().catch(() => undefined);
      await boardingById.click({ force: true, timeout: 5000 });
      const bLabel = (await boardingById.getAttribute('aria-label').catch(() => '')) ||
                     (await boardingById.textContent().catch(() => '')) || '';
      labels.push('Boarding: ' + bLabel.replace(/\s+/g, ' ').trim().slice(0, 60));
      boardingDone = true;
      await this.page.waitForTimeout(1000);
    }
    // Fallback: heading-scoped approach using getByRole (matches both <h3> and div[role="heading"][aria-level="3"])
    if (!boardingDone) {
      try {
        const heading = this.page.getByRole('heading', { level: 3, name: /boarding points/i }).first();
        await heading.scrollIntoViewIfNeeded({ timeout: 5000 });
        const container = heading.locator('..').locator('..');
        const radio = container.getByRole('radio').first();
        await radio.click({ force: true, timeout: 5000 });
        labels.push('Boarding: (heading-scoped click)');
        await this.page.waitForTimeout(1000);
      } catch { /* fallback didn't work */ }
    }

    // --- Dropping point ---
    // The BPDP panel uses virtual/lazy rendering — only a few radios are visible at a time.
    // We must scroll the BPDP panel's scrollable container and use JS to click the dropping radio.
    try {
      // Step 1: Find the scrollable container in the BPDP panel and scroll it to the bottom
      // to trigger rendering of the dropping section
      const scrolled = await this.page.evaluate(() => {
        // Find the "Select Dropping Point" text element
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let targetEl: HTMLElement | null = null;
        while (walker.nextNode()) {
          if (walker.currentNode.textContent?.trim() === 'Select Dropping Point') {
            targetEl = walker.currentNode.parentElement;
            break;
          }
        }
        if (!targetEl) return 'no-target';

        // Find the nearest scrollable ancestor
        let el: HTMLElement | null = targetEl;
        while (el) {
          const style = getComputedStyle(el);
          const overflowY = style.overflowY;
          if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
            // Scroll this container to bring the target element into view
            const targetRect = targetEl.getBoundingClientRect();
            const containerRect = el.getBoundingClientRect();
            el.scrollTop += targetRect.top - containerRect.top - 100;
            return 'scrolled-container';
          }
          el = el.parentElement;
        }
        // Fallback: just scrollIntoView on the target
        targetEl.scrollIntoView({ behavior: 'instant', block: 'center' });
        return 'scrolled-target';
      });
      await this.page.waitForTimeout(2000); // Wait for lazy content to render

      // Step 2: Navigate up from "Select Dropping Point" to find the bpdpContainer,
      // then get the LAST radiogroup (dropping is after boarding) and click first radio
      const dropResult = await this.page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let selectDropNode: Node | null = null;
        while (walker.nextNode()) {
          if (walker.currentNode.textContent?.trim() === 'Select Dropping Point') {
            selectDropNode = walker.currentNode;
            break;
          }
        }
        if (!selectDropNode) return 'no-select-drop-text';
        // Navigate up until we find a container that has [role="radiogroup"]
        let container: HTMLElement | null = (selectDropNode as any).parentElement;
        while (container && !container.querySelector('[role="radiogroup"]')) {
          container = container.parentElement;
        }
        if (!container) return 'no-container-with-rg';
        // Get all radiogroups — the LAST one is the dropping radiogroup
        const radiogroups = container.querySelectorAll('[role="radiogroup"]');
        if (radiogroups.length === 0) return 'no-radiogroups';
        const droppingRg = radiogroups[radiogroups.length - 1];
        const firstRadio = droppingRg.querySelector('[role="radio"]') as HTMLElement;
        if (!firstRadio) return `no-radio-in-rg(count=${radiogroups.length})`;
        firstRadio.scrollIntoView({ behavior: 'instant', block: 'center' });
        firstRadio.click();
        return 'clicked:' + (firstRadio.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      });
      labels.push('Dropping: ' + dropResult);
      await this.page.waitForTimeout(1500);
    } catch (e: any) {
      labels.push('Dropping-error: ' + (e?.message || String(e)).slice(0, 120));
    }

    if (labels.length === 0) {
      return { selected: false, details: 'No boarding/dropping radio buttons found' };
    }
    return { selected: true, details: labels.join(' | ') };
  }

  /** After boarding/dropping selection, the page auto-navigates to passenger info (step=CI).
   *  If not, click "3. Passenger Info" tab or "Continue booking" button. */
  async clickProceedIfVisible(): Promise<boolean> {
    // After selecting both boarding + dropping, RedBus auto-advances to step=CI.
    // Check if we're already on the passenger info step.
    const url = this.page.url();
    const waitForForm = async () => await this.page.getByPlaceholder(/enter your name/i).first().isVisible({ timeout: 7000 }).catch(() => false);
    if (/step=CI/i.test(url)) {
      if (await waitForForm()) return true;
    }

    // Wait a moment for auto-navigation
    await this.page.waitForTimeout(2000);
    if (/step=CI/i.test(this.page.url())) {
      if (await waitForForm()) return true;
    }

    // Try clicking the "Passenger Info" tab (may or may not have "3." prefix)
    const step3Tab = this.page.getByText(/passenger\s*info/i).first();
    if (await step3Tab.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.safeClick(step3Tab).catch(async () => { await step3Tab.click({ force: true }); });
      if (await waitForForm()) return true;
    }

    // Try "Continue booking" button (visible on passenger info page)
    const continueBtn = this.page.getByRole('button', { name: /continue booking/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (await waitForForm()) return true;
    }

    // Try more selectors for proceed/fill details/continue
    const altSelectors = [
      this.page.getByRole('button', { name: /proceed|continue|fill passenger details|next/i }).first(),
      this.page.locator('button').filter({ hasText: /proceed|continue|fill passenger details|next/i }).first(),
      this.page.locator('a').filter({ hasText: /proceed|continue|fill passenger details|next/i }).first(),
    ];
    for (const btn of altSelectors) {
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(1500);
        if (await waitForForm()) return true;
      }
    }

    // Retry after a short wait (sometimes UI is slow in FF/WebKit)
    await this.page.waitForTimeout(2000);
    if (await waitForForm()) return true;

    // Take a debug screenshot for analysis
    await this.page.screenshot({ path: 'test-results/proceed-debug.png' });

    return false;
  }
}
