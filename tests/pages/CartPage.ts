import { type Page, expect } from "@playwright/test";
export class CartPage {
  constructor(readonly page: Page) {}
  async open() {
    await this.page.goto("/cart");
    await expect(
      this.page.getByRole("heading", { name: "Your cart", exact: true }),
    ).toBeVisible();
  }
  async quantity(name: string, value: number) {
    await this.page
      .getByLabel(`Quantity for ${name}`, { exact: true })
      .selectOption(String(value));
  }
  async remove(name: string) {
    await this.page
      .getByRole("button", { name: `Remove ${name}`, exact: true })
      .click();
  }
  async expectTotal(value: string) {
    await expect(this.page.getByTestId("cart-total")).toHaveText(value);
  }
  async checkout() {
    await this.page.getByRole("link", { name: "Proceed to checkout" }).click();
  }
}
