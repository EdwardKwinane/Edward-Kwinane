import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared helpers for the behaviour suites.
 *
 * The consent suites were originally written as throwaway scripts against the
 * installed Chrome (see PROJECT_MEMORY.md). They are ported here onto
 * `@playwright/test` so they run in CI with a pinned browser, real assertions
 * and an HTML report.
 */

/** Only Meta's own hosts count as tracking traffic. */
const META_HOST = /^https?:\/\/([a-z0-9-]+\.)*(facebook\.com|facebook\.net)\//i;

/**
 * Extends the base test with a recorder for every request the page makes to a
 * Meta host. Registered per context, so it observes the whole page lifecycle
 * including SPA navigations.
 */
export const test = base.extend<{ metaRequests: string[] }>({
  metaRequests: async ({ context }, use) => {
    const urls: string[] = [];
    context.on("request", (request) => {
      if (META_HOST.test(request.url())) urls.push(request.url());
    });
    await use(urls);
  },
});

export { expect };

/** The consent banner (first-layer modal). */
export const banner = (page: Page) => page.locator(".cm");

/** The preferences modal (second layer). */
export const preferences = (page: Page) => page.locator(".pm");

/** Open the site and wait for the app shell to render. */
export async function gotoHome(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main#main")).toBeVisible();
}

/**
 * Wait until the consent library has finished its initial show/hide decision.
 *
 * The library runs this synchronously during module init, so once the app
 * shell is visible the decision is taken. `show--consent` on `<html>` is added
 * exactly when the consent banner is shown; if it never appears within a
 * bounded window, the library finished quietly with the banner hidden (a
 * saved choice or a fresh visitor with consent suppressed). A short settle
 * lets any transition finish so negative assertions are stable.
 */
export async function waitForConsentReady(page: Page): Promise<void> {
  await expect(page.locator("main#main")).toBeVisible();
  // The consent library's show/hide decision happens synchronously during
  // module init, so by the time the app shell is visible the outcome is fixed.
  // A short settle absorbs the init promise chain so negative assertions
  // ("banner must not appear") can't race a not-yet-run `show(true)`.
  await page.waitForTimeout(400);
}

/**
 * Meaningful negative assertion: give the library a window in which a wrongly
 * shown banner would appear, then assert it did not.
 *
 * The library's show/hide logic happens synchronously during module init, so
 * after the app shell is visible (waitForConsentReady), we have a bounded
 * window (400ms) to observe whether the banner appears. This is a meaningful
 * negative test that prevents flakiness in reload scenarios.
 */
export async function expectBannerStaysHidden(page: Page): Promise<void> {
  await waitForConsentReady(page);
  await expect(page.locator("html.show--consent")).toHaveCount(0);
  await expect(banner(page)).toBeHidden();
}

/** The parsed `cc_cookie` payload, or null when the visitor has not chosen. */
export async function consentCookie(page: Page) {
  return page.evaluate(() => {
    const match = document.cookie.match(/(?:^|;\s*)cc_cookie=([^;]*)/);
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(match[1])) as {
        categories: string[];
        revision: number;
        consentId: string;
        consentTimestamp: string;
        lastConsentTimestamp: string;
      };
    } catch {
      return null;
    }
  });
}

/** The session-scoped "banner already answered" flag. */
export async function sessionFlag(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    try {
      return sessionStorage.getItem("ek-cc-banner-dismissed");
    } catch {
      return "error";
    }
  });
}

/** True when either first-party Meta cookie is present. */
export async function hasMetaCookies(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    /(?:^|;\s*)_fbp=/.test(document.cookie) || /(?:^|;\s*)_fbc=/.test(document.cookie)
  );
}

/** `window.fbq` is only defined once the pixel stub has been installed. */
export async function fbqDefined(page: Page): Promise<boolean> {
  return page.evaluate(() => typeof (window as { fbq?: unknown }).fbq !== "undefined");
}

// --- consent actions -------------------------------------------------------

export async function acceptAll(page: Page): Promise<void> {
  await page.locator('.cm button[data-role="all"]').click();
  await expect(banner(page)).toBeHidden();
}

export async function rejectOptional(page: Page): Promise<void> {
  await page.locator('.cm button[data-role="necessary"]').click();
  await expect(banner(page)).toBeHidden();
}

export async function openPreferences(page: Page): Promise<void> {
  await page.locator('footer button:has-text("Cookie settings")').click();
  await expect(preferences(page)).toBeVisible();
}

export async function savePreferences(page: Page): Promise<void> {
  await page.locator('.pm button[data-role="save"]').click();
  await expect(preferences(page)).toBeHidden();
}

export async function setCategory(
  page: Page,
  category: "analytics" | "marketing",
  checked: boolean
): Promise<void> {
  const toggle = page.locator(`input[name="cc-${category}"]`);
  if (checked) {
    await toggle.check({ force: true });
  } else {
    await toggle.uncheck({ force: true });
  }
}

/**
 * A bundle built without `VITE_META_PIXEL_ID` never installs the pixel, so
 * Meta-positive assertions may only run when the pixel is actually present.
 * Annotating the test distinguishes "passed" from "not applicable to this
 * build" in the report.
 */
export function annotateBuild(testInfo: {
  annotations: { type: string; description?: string }[];
}, hasPixel: boolean): void {
  testInfo.annotations.push({
    type: "build",
    description: hasPixel
      ? "Meta Pixel configured — pixel assertions run"
      : "no VITE_META_PIXEL_ID — pixel stays dormant (asserting privacy path only)",
  });
}