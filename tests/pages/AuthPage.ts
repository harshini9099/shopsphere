import { type Page } from "@playwright/test";
export class AuthPage {
  constructor(readonly page: Page) {}
  async register(user: { name: string; email: string; password: string }) {
    await this.page.goto("/register");
    await this.page.getByLabel("Name", { exact: true }).fill(user.name);
    await this.credentials(user.email, user.password);
    await this.page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
  }
  async credentials(email: string, password: string) {
    await this.page.getByLabel("Email", { exact: true }).fill(email);
    await this.page.getByLabel("Password", { exact: true }).fill(password);
  }
  async login(email: string, password: string) {
    await this.page.goto("/login");
    await this.credentials(email, password);
    await this.page
      .getByRole("button", { name: "Log in", exact: true })
      .click();
  }
}
