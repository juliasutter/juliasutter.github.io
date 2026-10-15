import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT || "4173";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: `./dev --port ${port}`,
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 15_000
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-iphone", testMatch: ["**/dialog-focus.spec.js", "**/form-confirmation.spec.js", "**/registration.spec.js", "**/admin.spec.js", "**/course-refresh.spec.js"], use: { ...devices["iPhone 13"] } }
  ]
});
