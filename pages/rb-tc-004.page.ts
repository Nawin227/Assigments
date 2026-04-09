import { type Page } from '@playwright/test';
import { RedBusPage } from './redbus.page';

export class RbTc004Page extends RedBusPage {
  constructor(page: Page) {
    super(page);
  }

  async run(fromCity: string, toCity: string): Promise<void> {
    await this.openHome();
    await this.searchBuses(fromCity, toCity);
    await this.applyACFilter();
    await this.applyHighRatingFilter();
    await this.assertAllVisibleBusesAreAC();
    await this.assertAllVisibleBusesRatingAtLeast4();
  }
}
