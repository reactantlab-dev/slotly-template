import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// UI tests run against a server started by scripts/grade.mjs (npm test).
// The grader passes GRADE_RESULTS_DIR, a temporary directory outside the project, for the JSON results.
const resultsDir = process.env.GRADE_RESULTS_DIR;
export default defineConfig({
  testDir: "tests/ui",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 15_000,
  expect: { timeout: 5_000 },
  reporter: [
    ["list"],
    ...(process.env.CI ? [["github"] as const] : []),
    ...(resultsDir ? [["json", { outputFile: path.join(resultsDir, "ui.json") }] as const] : []),
  ],
  use: {
    baseURL: process.env.SLOTLY_BASE_URL ?? "http://127.0.0.1:3100",
    timezoneId: "UTC",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
