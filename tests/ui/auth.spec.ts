// Use the base test for public authentication flows: no pre-authenticated fixture.
import { test, expect } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { customer } from "../data/customer";
test("registration, logout, invalid login and successful login", async ({
  page,
}) => {
  const user = customer(),
    auth = new AuthPage(page);
  await auth.register(user);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(
    page.getByRole("link", { name: "Log in", exact: true }),
  ).toBeVisible();
  await auth.login(user.email, "WrongPassword!");
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await auth.credentials(user.email, user.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
});
test("guest sees a login prompt for a saved cart", async ({ page }) => {
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Please log in" }),
  ).toBeVisible();
});
