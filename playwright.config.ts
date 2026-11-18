import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * The suites run against the *production build* served by `vite preview`, not
 * the dev server, so they exercise the same bundle Vercel ships. `vite preview`
 * deliberately has no Sanity host in its CORS allow-list, so anything that
 * depends on CMS content is out of scope here — these tests cover behaviour
 * owned by the app itself (consent, routing and metadata), which is also what
 * keeps them runnable in CI with no credentials.
 *
 * CI builds with no `VITE_SANITY_*` / `VITE_META_PIXEL_ID` values, so CMS
 * requests fail fast against `missing-project-id` and the Meta Pixel never
 * loads. The tests are written for that: no external host is asserted as
 * reachable, and pixel-specific assertions branch on whether the build has a
 * pixel ID.
 */
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  // The Sanity-backed suites (sanity-reliability.spec.ts, cards.spec.ts) run
  // under their own config (playwright.sanity.config.ts) against a build with
  // a fake project ID and mocked CMS responses; they are ignored here.
  testIgnore: ["**/sanity-reliability.spec.ts", "**/cards.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  timeout: 45_000,
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
    // Always rebuild: a stale `dist/` would silently test different code than
    // the commit under review, which is worse than the extra few seconds.
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
