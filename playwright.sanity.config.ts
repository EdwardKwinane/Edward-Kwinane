import { defineConfig, devices } from "@playwright/test";

/**
 * Reliability-suite configuration (Sanity outage behaviour).
 *
 * Unlike the default config, this build is *configured* with a fake Sanity
 * project ID so the app actually issues CMS requests, and every request to
 * apicdn.sanity.io is intercepted and answered deterministically from the
 * test itself — no real CMS is ever contacted. A short request timeout keeps
 * the timeout/retry tests fast while exercising the same code path.
 *
 * The fake project (`reliability-test`) cannot resolve to a real Content Lake,
 * so even a mocking mistake fails loudly rather than reading production data.
 */
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  // The Sanity reliability suite runs under this config (see below) with a
  // build against a fake project ID and mocked CMS responses.
  testMatch: ["sanity-reliability.spec.ts", "cards.spec.ts", "blog.spec.ts", "layout-stability.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    // Inline env wins over .env files for `vite build`, so the reliability
    // build is always the one under test here.
    command: `VITE_SANITY_PROJECT_ID=reliability-test VITE_SANITY_DATASET=test VITE_SANITY_TIMEOUT_MS=2000 npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
