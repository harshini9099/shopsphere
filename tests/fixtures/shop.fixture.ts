import { test as base, expect } from "@playwright/test";
import { customer } from "../data/customer";
import { apiURL } from "../utils/api-client";
import { CatalogPage } from "../pages/CatalogPage";
import { CartPage } from "../pages/CartPage";
import { CheckoutPage } from "../pages/CheckoutPage";
type Account = ReturnType<typeof customer> & { token: string };
type Fixtures = {
  account: Account;
  catalog: CatalogPage;
  cart: CartPage;
  checkout: CheckoutPage;
};
export const test = base.extend<Fixtures>({
  account: async ({ request }, use) => {
    const data = customer();
    const response = await request.post(`${apiURL}/api/auth/register`, {
      data,
    });
    expect(response.status()).toBe(201);
    const { token } = await response.json();
    await use({ ...data, token });
    await request.post(`${apiURL}/api/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  page: async ({ page, account }, use) => {
    // Per-test browser context + per-test account: no shared cart, cookies or state file.
    await page.addInitScript(
      (token) => sessionStorage.setItem("shopsphere.token", token),
      account.token,
    );
    await use(page);
  },
  catalog: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  cart: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkout: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});
export { expect };
