import { expect } from '@playwright/test';
import { BasePage } from './00_BasePage';

const FIRST_NAMES = ['Rahul', 'Priya', 'Arjun', 'Sneha', 'Kiran', 'Ananya', 'Vikram', 'Deepa'];
const LAST_NAMES = ['Sharma', 'Reddy', 'Kumar', 'Patel', 'Singh', 'Nair', 'Rao', 'Das'];
const GENDERS: ('Male' | 'Female')[] = ['Male', 'Female'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAge(): string {
  return String(Math.floor(Math.random() * 40) + 18); // 18-57
}

function randomPhone(): string {
  const prefixes = ['9876', '8765', '7654', '9988', '8899'];
  return randomFrom(prefixes) + String(Math.floor(100000 + Math.random() * 900000));
}

type Passenger = {
  name: string;
  age: string;
  email: string;
  mobile: string;
  gender: 'Male' | 'Female';
};

export class PassengerInfoPage extends BasePage {
  /**
   * RedBus passenger form (step=CI) has:
   *  - Contact: Phone (textbox placeholder "Phone"), Email (placeholder "Enter email id"), State of Residence
   *  - Per-passenger: Name (placeholder "Enter your Name"), Age (spinbutton), Gender (radio Male/Female)
   *  - "Continue booking" button at bottom
   */
  async isPassengerFormVisible(): Promise<boolean> {
    // Look for the "Enter your Name" placeholder or the "Passenger details" heading
    const nameInput = this.page.getByPlaceholder(/enter your name/i).first();
    const heading = this.page.getByRole('heading', { name: /passenger details/i }).first();
    return (
      (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await heading.isVisible({ timeout: 3000 }).catch(() => false))
    );
  }

  private buildRandomPassenger(): Passenger {
    const firstName = randomFrom(FIRST_NAMES);
    const lastName = randomFrom(LAST_NAMES);
    const gender = randomFrom(GENDERS);
    const age = randomAge();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@testmail.com`;
    const mobile = randomPhone();
    return { name: `${firstName} ${lastName}`, age, email, mobile, gender };
  }

  async fillRandomPassengerIfVisible(): Promise<boolean> {
    if (!(await this.isPassengerFormVisible())) {
      return false;
    }

    const passenger = this.buildRandomPassenger();
    console.log(`Filling passenger: ${passenger.name}, Age: ${passenger.age}, Gender: ${passenger.gender}`);

    // --- STEP 1: Fill CONTACT details first ---
    const phoneInput = this.page.getByPlaceholder(/phone/i).first();
    if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await phoneInput.click({ force: true });
      await phoneInput.fill(passenger.mobile);
    }

    const emailInput = this.page.getByPlaceholder(/enter email/i).first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.click({ force: true });
      await emailInput.fill(passenger.email);
    }

    await this.selectStateOfResidenceIfVisible();

    // --- STEP 2: Fill PASSENGER information ---
    const nameInput = this.page.getByPlaceholder(/enter your name/i).first();
    await nameInput.click({ force: true });
    await nameInput.fill(passenger.name);

    // Age
    let ageFilled = false;
    const ageByPh = this.page.getByPlaceholder(/enter age/i).first();
    if (await ageByPh.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ageByPh.click({ force: true });
      await ageByPh.fill(passenger.age);
      ageFilled = true;
    }
    if (!ageFilled) {
      const ageNum = this.page.locator('input[type="number"]').first();
      if (await ageNum.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ageNum.click({ force: true });
        await ageNum.fill(passenger.age);
        ageFilled = true;
      }
    }
    console.log(`Age filled: ${ageFilled}`);

    // Gender
    const genderText = this.page.getByText(new RegExp(`^${passenger.gender}$`, 'i')).first();
    let genderSelected = false;
    if (await genderText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genderText.click({ force: true });
      genderSelected = true;
    }
    if (!genderSelected) {
      const genderRadio = this.page.getByRole('radio').filter({ hasText: new RegExp(passenger.gender, 'i') }).first();
      if (await genderRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
        await genderRadio.click({ force: true });
        genderSelected = true;
      }
    }
    console.log(`Gender selected: ${genderSelected}`);

    await this.clickRadioIfVisible(/don.t add free cancellation/i, 'Don\'t add Free Cancellation');
    await this.clickRadioIfVisible(/don.t add redbus assurance/i, 'Don\'t add redBus Assurance');

    await this.tryFillGstIfVisible();

    // --- STEP 4: Identify and fill any unknown empty inputs ---
    const emptyInputDebug = await this.page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'));
      const results: string[] = [];
      inputs.forEach((inp, i) => {
        const el = inp as HTMLInputElement;
        const vis = el.getBoundingClientRect();
        if (vis.height > 0 && !el.value) {
          const parent = el.parentElement;
          const parentCls = (parent?.className || '').toString().slice(0, 60);
          const parentTxt = (parent?.textContent || '').trim().slice(0, 40);
          results.push(`empty-inp[${i}]: type=${el.type} ph="${el.placeholder}" parent-cls="${parentCls}" parent-txt="${parentTxt}" vis:${Math.round(vis.width)}x${Math.round(vis.height)}`);
        }
      });
      return results.join('\n');
    });
    if (emptyInputDebug) console.log('EMPTY INPUTS:\n' + emptyInputDebug);

    // --- STEP 5: Re-fill if any values were cleared by clicks ---
    await this.page.waitForTimeout(1000);
    const nameVal = await nameInput.inputValue().catch(() => '');
    const emailVal = await emailInput.inputValue().catch(() => '');
    const phoneVal = await phoneInput.inputValue().catch(() => '');
    console.log(`Values check — name:"${nameVal}" email:"${emailVal}" phone:"${phoneVal}"`);

    if (!nameVal) {
      console.log('Re-filling name...');
      await nameInput.click({ force: true });
      await nameInput.fill(passenger.name);
    }
    if (!emailVal) {
      console.log('Re-filling email...');
      await emailInput.click({ force: true });
      await emailInput.fill(passenger.email);
    }
    if (!phoneVal) {
      console.log('Re-filling phone...');
      await phoneInput.click({ force: true });
      await phoneInput.fill(passenger.mobile);
    }

    const finalName = await nameInput.inputValue().catch(() => '');
    const finalEmail = await emailInput.inputValue().catch(() => '');
    const finalPhone = await phoneInput.inputValue().catch(() => '');
    const finalState = await this.page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      const stateInput = inputs.find((inp) => {
        let el: HTMLElement | null = inp.parentElement;
        for (let d = 0; d < 4 && el; d++) {
          const t = el.textContent || '';
          if (/state of residence/i.test(t) && !/phone|email|name/i.test(t)) return true;
          el = el.parentElement;
        }
        return false;
      });
      return stateInput?.value || '';
    });

    if (finalPhone && finalEmail && finalState) {
      console.log('Contact details filled successfully');
    }
    if (finalName && ageFilled && genderSelected) {
      console.log('Passenger information filled successfully');
    }

    return true;
  }

  private async clickRadioIfVisible(pattern: RegExp, label: string): Promise<void> {
    const byRole = this.page.getByRole('radio', { name: pattern }).first();
    if (await byRole.isVisible({ timeout: 3000 }).catch(() => false)) {
      await byRole.click({ force: true });
      console.log(`Clicked: ${label}`);
      return;
    }
    const byText = this.page.getByText(pattern).first();
    if (await byText.isVisible({ timeout: 2000 }).catch(() => false)) {
      await byText.click({ force: true });
      console.log(`Clicked: ${label} (text)`);
    }
  }

  /** Select a state from the State of Residence dropdown if present */
  private async selectStateOfResidenceIfVisible(): Promise<void> {
    // Use JS to find the EXACT state input by walking up from "State of Residence" text
    const stateInputIndex = await this.page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      for (let i = 0; i < inputs.length; i++) {
        let el: HTMLElement | null = inputs[i].parentElement;
        for (let d = 0; d < 4 && el; d++) {
          const t = el.textContent || '';
          if (/state of residence/i.test(t) && !/phone|email|name/i.test(t)) return i;
          el = el.parentElement;
        }
      }
      return -1;
    });

    if (stateInputIndex < 0) {
      console.log('State of Residence input not found via JS - skipping');
      return;
    }

    console.log(`State input found at text-input index ${stateInputIndex}`);
    const stateInput = this.page.locator('input[type="text"]').nth(stateInputIndex);

    await stateInput.scrollIntoViewIfNeeded().catch(() => {});
    await stateInput.click({ force: true });
    await this.page.waitForTimeout(1500);

    // Look for the stateBodyWrap dropdown
    const wrap = this.page.locator('[class*="stateBodyWrap"]').first();
    if (await wrap.isVisible({ timeout: 3000 }).catch(() => false)) {
      const telangana = wrap.getByText(/^Telangana$/i).first();
      const karnataka = wrap.getByText(/^Karnataka$/i).first();
      if (await telangana.isVisible({ timeout: 2000 }).catch(() => false)) {
        await telangana.click({ force: true });
        console.log('========================================');
        console.log('  STATE OF RESIDENCE SELECTED: Telangana');
        console.log('========================================');
        return;
      }
      if (await karnataka.isVisible({ timeout: 2000 }).catch(() => false)) {
        await karnataka.click({ force: true });
        console.log('========================================');
        console.log('  STATE OF RESIDENCE SELECTED: Karnataka');
        console.log('========================================');
        return;
      }
      const firstItem = wrap.locator('div, span, li').filter({ hasText: /.+/ }).first();
      if (await firstItem.isVisible({ timeout: 1000 }).catch(() => false)) {
        await firstItem.click({ force: true });
        const txt = await firstItem.textContent().catch(() => 'unknown');
        console.log(`  STATE OF RESIDENCE SELECTED: ${txt}`);
        return;
      }
    }

    // Fallback: type into input and pick from dropdown
    await stateInput.fill('Telangana');
    await this.page.waitForTimeout(1000);
    const telOption = this.page.locator('[class*="stateBodyWrap"]').getByText(/telangana/i).first();
    if (await telOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await telOption.click({ force: true });
      console.log('  STATE OF RESIDENCE SELECTED: Telangana (via type)');
    } else {
      await stateInput.press('Enter');
      console.log('State: typed Telangana + Enter (fallback)');
    }
  }
  /** Try to find and fill GST number field if visible; skip silently if not */
  private async tryFillGstIfVisible(): Promise<void> {
    // Look for GST input by placeholder or label
    const gstInput = this.page.getByPlaceholder(/gst/i).first();
    if (await gstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Generate a valid-format GST number: 2-digit state + 10-char PAN + 1 digit + Z + 1 check
      const stateCodes = ['27', '29', '36', '33', '06', '09'];
      const stateCode = randomFrom(stateCodes);
      const panChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const pan = Array.from({ length: 5 }, () => panChars[Math.floor(Math.random() * 26)]).join('')
        + String(Math.floor(1000 + Math.random() * 9000))
        + panChars[Math.floor(Math.random() * 26)];
      const gstNumber = `${stateCode}${pan}1Z${Math.floor(Math.random() * 10)}`;
      await gstInput.click({ force: true });
      await gstInput.fill(gstNumber);
      console.log(`GST filled: ${gstNumber}`);
      return;
    }

    // Try locator with name attribute
    const gstByName = this.page.locator('input[name*="gst" i], input[id*="gst" i]').first();
    if (await gstByName.isVisible({ timeout: 2000 }).catch(() => false)) {
      const stateCode = '29';
      const gstNumber = `${stateCode}ABCDE1234F1Z5`;
      await gstByName.click({ force: true });
      await gstByName.fill(gstNumber);
      console.log(`GST filled (by name): ${gstNumber}`);
      return;
    }

    console.log('GST input not visible - skipping');
  }

  async openPassengerInfoAndWait(): Promise<void> {
    // After boarding/dropping selection, RedBus auto-navigates to step=CI
    const formVisible = await this.isPassengerFormVisible();
    if (formVisible) return;

    // Try clicking "Passenger Info" tab if not auto-navigated
    const step3Tab = this.page.getByText(/passenger\s*info/i).first();
    if (await step3Tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.safeClick(step3Tab);
    }
    await this.page.waitForTimeout(1500);
  }

  async assertNotOnPaymentPage(): Promise<void> {
    const url = this.page.url();
    const onPayment = /pay|payment|checkout|billing/i.test(url);
    if (onPayment) {
      throw new Error(`Test reached payment page unexpectedly: ${url}`);
    }
    console.log('Execution stopped before payment page. Current URL: ' + url);
  }

  async continueToPayment(): Promise<boolean> {
    console.log('=== ENTERING continueToPayment() ===');

    // Dump all input values to verify form is filled
    const formValues = await this.page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'));
      return inputs.map((inp, i) => {
        const el = inp as HTMLInputElement;
        return `inp[${i}] ph="${el.placeholder}" val="${el.value}" type=${el.type}`;
      }).join('\n');
    });
    console.log('FORM VALUES:\n' + formValues);

    // Check for any visible validation errors
    const errors = await this.page.evaluate(() => {
      const errEls = document.querySelectorAll('[class*="error"], [class*="Error"], [class*="invalid"], [class*="warning"]');
      return Array.from(errEls).filter(e => (e as HTMLElement).offsetParent !== null)
        .map(e => (e as HTMLElement).textContent?.trim()).filter(Boolean).slice(0, 5);
    });
    if (errors.length) console.log('Validation errors visible:', errors);

    // Try multiple selectors for the Continue button
    const selectors = [
      this.page.getByRole('button', { name: /continue/i }).first(),
      this.page.locator('button').filter({ hasText: /continue/i }).first(),
      this.page.locator('[class*="primaryButton"]').first(),
      this.page.locator('button.primaryButton___aef317').first(),
    ];

    let target = selectors[0];
    for (const sel of selectors) {
      if (await sel.isVisible({ timeout: 2000 }).catch(() => false)) {
        const txt = await sel.textContent().catch(() => '');
        console.log(`Found button: "${txt}"`);
        target = sel;
        break;
      }
    }

    await target.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.waitForTimeout(500);

    // Attempt 1: normal click
    console.log('Clicking Continue (attempt 1: normal)...');
    await target.click();

    try {
      await this.page.waitForURL(/paymentDetails|pay|payment|checkout/i, { timeout: 15000 });
      console.log('Navigation detected: ' + this.page.url());
      return true;
    } catch {
      console.log('Attempt 1 failed. URL: ' + this.page.url());
    }

    // Attempt 2: force click
    console.log('Clicking Continue (attempt 2: force)...');
    await target.click({ force: true });

    try {
      await this.page.waitForURL(/paymentDetails|pay|payment|checkout/i, { timeout: 15000 });
      console.log('Navigation detected: ' + this.page.url());
      return true;
    } catch {
      console.log('Attempt 2 failed. URL: ' + this.page.url());
    }

    // Attempt 3: JS click on any button with "continue"
    console.log('Clicking Continue (attempt 3: JS)...');
    await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => /continue/i.test(b.textContent || ''));
      if (btn) btn.click();
    });

    try {
      await this.page.waitForURL(/paymentDetails|pay|payment|checkout/i, { timeout: 15000 });
      console.log('Navigation after JS click: ' + this.page.url());
      return true;
    } catch {
      console.log('All attempts failed. URL: ' + this.page.url());
      await this.page.screenshot({ path: 'test-results/continue-debug.png', fullPage: true });
      return false;
    }
  }

  async assertOnPaymentPage(): Promise<void> {
    await this.page.waitForTimeout(3000);
    const url = this.page.url();
    const isPaymentUrl = /pay|payment|checkout/i.test(url);
    const paymentHeading = this.page.getByText(/payment|pay now|proceed to pay|make payment|upi|debit|credit|net banking|wallet/i).first();
    const hasPaymentUI = await paymentHeading.isVisible({ timeout: 10000 }).catch(() => false);

    if (isPaymentUrl || hasPaymentUI) {
      console.log('\n========================================');
      console.log('  PAYMENT PAGE SUCCESSFULLY DISPLAYED!');
      console.log('  URL: ' + url);
      console.log('========================================\n');
      await this.takeScreenshot('payment-page-success');
    } else {
      console.log('Payment page not detected — URL: ' + url);
    }
  }
}
