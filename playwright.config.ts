import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build. WebGL needs a GPU or SwiftShader:
 * by default the locally installed Chrome is used (`PW_CHANNEL=chromium` to use the
 * Playwright-bundled browser after `npx playwright install chromium`).
 */
const PORT = Number(process.env.E2E_PORT ?? 3218);
const channel = process.env.PW_CHANNEL ?? "chrome";
const launchOptions = { args: ["--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel, launchOptions },
    },
    {
      name: "mobile-chrome",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"], channel, launchOptions },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 400_000,
  },
});
