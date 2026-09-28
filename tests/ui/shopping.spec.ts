import { test, expect } from "../fixtures/shop.fixture";
import { apiURL, bearer, setCartItem } from "../utils/api-client";
test("search, product details, cart, checkout and API order verification", async ({
  page,
  catalog,
  cart,
  checkout,
  request,
  account,
}) => {
  await catalog.open();
  await catalog.search("Headphones");
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await catalog.selectProduct("Everyday Headphones");
  await catalog.addToCart();
  await cart.open();
  await cart.quantity("Everyday Headphones", 2);
  await cart.expectTotal("$159.98");
  await cart.checkout();
  await checkout.fill();
  await checkout.place();
  await expect(
    page.getByRole("heading", { name: "Order confirmed" }),
  ).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText("$159.98");
  const id = await page.getByTestId("order-id").innerText();
  const response = await request.get(`${apiURL}/api/orders/${id}`, {
    headers: bearer(account.token),
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).total).toBe(159.98);
  await page.getByRole("link", { name: "View order history" }).click();
  await expect(
    page.getByRole("link", { name: `Order ${id}`, exact: true }),
  ).toBeVisible();
  await cart.open();
  await expect(
    page.getByText("Your cart is empty.", { exact: true }),
  ).toBeVisible();
});
test("category, sort and empty search", async ({ page, catalog }) => {
  await catalog.open();
  await page.getByLabel("Category", { exact: true }).selectOption("Home");
  await expect(page.getByTestId("product-card")).toHaveCount(2);
  await page.getByLabel("Sort by").selectOption("price-desc");
  await expect(page.getByTestId("product-card").first()).toContainText(
    "Desk Lamp",
  );
  await catalog.search("no-such-product");
  await expect(
    page.getByText("No products found. Try a different search."),
  ).toBeVisible();
});
test("cart removal persists after reload", async ({
  request,
  account,
  page,
  cart,
}) => {
  await setCartItem(request, account.token, 4, 1);
  await cart.open();
  await cart.remove("Ceramic Coffee Mug");
  await expect(
    page.getByText("Your cart is empty.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Your cart is empty.", { exact: true }),
  ).toBeVisible();
});
test("declined payment keeps the cart and can be retried", async ({
  request,
  account,
  page,
  cart,
  checkout,
}) => {
  await setCartItem(request, account.token, 4, 1);
  await cart.open();
  await cart.checkout();
  await checkout.fill("DECLINED");
  await checkout.place();
  await expect(page.getByRole("alert")).toContainText("Mock payment declined");
  await page.getByLabel("Mock payment").selectOption("APPROVED");
  await checkout.place();
  await expect(
    page.getByRole("heading", { name: "Order confirmed" }),
  ).toBeVisible();
});
