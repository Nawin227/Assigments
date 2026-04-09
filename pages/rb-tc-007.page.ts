import { type Page } from '@playwright/test';
import { RedBusPage } from './redbus.page';

export class RbTc007Page extends RedBusPage {
  constructor(page: Page) {
    super(page);
  }

  async run(fromCity: string, toCity: string): Promise<void> {
    await this.openHome();
    await this.searchBuses(fromCity, toCity);
    await this.openViewSeatsForFirstVisibleBus();
    await this.selectAnyAvailableSeat();

    const passenger = this.generateRandomPassengerData();
    await this.fillPassengerDetails(passenger);
    await this.continueToPayment();
    await this.assertFareBreakdownVisible();
  }
}
