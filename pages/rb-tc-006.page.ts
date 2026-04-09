import { expect, type Page } from '@playwright/test';
import { RedBusPage } from './redbus.page';

export class RbTc006Page extends RedBusPage {
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

    const nameVisible = await this.page
      .locator('input[name*="name" i], input[placeholder*="name" i], input[id*="name" i]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(nameVisible || (await this.isSeatSelected())).toBeTruthy();
  }
}
