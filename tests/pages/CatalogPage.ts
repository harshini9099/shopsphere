import { type Page, expect } from "@playwright/test";
export class CatalogPage {
  constructor(readonly page: Page) {}
  async open() {
    await this.page.goto("/");
    await expect(
      this.page.getByRole("heading", { name: "Small things. Better days." }),
    ).toBeVisible();
  }
  async search(name: string) {
    await this.page.getByLabel("Search products").fill(name);
  }
  async selectProduct(name: string) {
    await this.page.getByRole("heading", { name, exact: true }).click();
    await expect(
      this.page.getByRole("button", { name: "Add to cart" }),
    ).toBeVisible();
  }
  async addToCart() {
    await this.page.getByRole("button", { name: "Add to cart" }).click();
    await expect(this.page.getByRole("status")).toContainText("Added to cart");
  }
}
