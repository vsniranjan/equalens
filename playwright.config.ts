import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  ...(process.env.EQUALENS_LIVE ? {} : { testIgnore: "**/*live.spec.ts" }),
  outputDir: process.env.EQUALENS_LIVE ? "test-results/live" : "test-results/browser",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
});
