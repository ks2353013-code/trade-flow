const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 240000,
  expect: {
    timeout: 15000
  },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.TRADEFLOW_E2E_BASE_URL || "http://localhost:5000",
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    ...devices["Desktop Chrome"]
  },
  outputDir: "test-results/iteration2-release-smoke"
});
