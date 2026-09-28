import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config();
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "api", testMatch: "api/**/*.spec.ts" },
    {
      name: "chromium",
      testMatch: "ui/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testMatch: "ui/**/*.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: "ui/**/*.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  // Start the backend separately; Playwright can manage Vite for local test runs.
  webServer:
    process.env.PW_SKIP_WEBSERVER === "1"
      ? undefined
      : {
          command: "npm run dev",
          url: "http://localhost:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
});
