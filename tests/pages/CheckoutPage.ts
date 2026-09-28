import { type Page } from "@playwright/test";
import { shipping } from "../data/customer";
export class CheckoutPage {
  constructor(readonly page: Page) {}
  async fill(payment = "APPROVED") {
    await this.page.getByLabel("Full name").fill(shipping.name);
    await this.page.getByLabel("Street address").fill(shipping.address);
    await this.page.getByLabel("City", { exact: true }).fill(shipping.city);
    await this.page.getByLabel("Postal code").fill(shipping.postalCode);
    await this.page.getByLabel("Mock payment").selectOption(payment);
  }
  async place() {
    await this.page
      .getByRole("button", { name: "Place order", exact: true })
      .click();
  }
}
