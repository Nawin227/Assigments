import { expect, type Page } from '@playwright/test';
import { RedBusPage } from './redbus.page';

export class RbTc005Page extends RedBusPage {
  constructor(page: Page) {
    super(page);
  }

  async run(fromCity: string, toCity: string): Promise<void> {
    await this.openHome();
    await this.searchBuses(fromCity, toCity);
    await this.applyFilter(/After 6\s*pm|18:00-24:00|19:00-24:00|evening/i);
    await this.assertDepartureAtOrAfter6PM();
    await this.openViewSeatsForFirstVisibleBus();
    await this.selectAnyAvailableSeat();
    expect(await this.isSeatSelected()).toBeTruthy();
  }
}
