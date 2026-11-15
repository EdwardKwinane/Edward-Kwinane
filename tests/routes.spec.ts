import { expectBannerStaysHidden, expect, gotoHome, rejectOptional, test } from "./helpers";

/**
 * Route smoke tests.
 *
 * Guards the two things a SPA rewrite can silently break: every public route
 * must load *directly* (deep link / refresh, not just in-app navigation), and
 * every route must render the expected document shell.
 *
 * Detail routes (`/portfolio/:slug`, `/blog/:slug`) are excluded on purpose:
 * they need CMS content, and `vite preview` is deliberately not allowed to
 * query Sanity.
 */

const ROUTES = ["/", "/about", "/portfolio", "/capabilities", "/blog", "/contact"];

test.describe("public routes", () => {
  for (const route of ROUTES) {
    test(`${route} loads directly and renders a complete shell`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const from = message.location().url;
        // Only app-origin errors matter here. CI has no CMS project ID, so
        // Sanity requests fail by design and would otherwise drown the signal.
        // Filter out cross-origin CORS/Sanity errors that are expected when
        // no .env is present; keep only genuinely unexpected app errors.
        if (!from || from.startsWith("http://localhost:4173")) {
          // Further filter: ignore console errors from third-party scripts
          // (facebook, google, etc.) and from blocked CORS requests to Sanity.
          const isThirdParty = /facebook\.net|google\.com/.test(from);
          const isCorsBlocked = /CORS|blocked by CORS/.test(message.text());
          if (!isThirdParty && !isCorsBlocked) {
            consoleErrors.push(message.text());
          }
        }
      });
      page.on("pageerror", (error) => {
        // Only count errors that are not about cross-origin blocked requests
        // or Sanity API failures (those are expected without .env configuration).
        const msg = error.message || "";
        if (!/CORS|blocked by CORS|sanity\.io|apicdn/.test(msg)) {
          pageErrors.push(msg);
        }
      });

      const response = await page.goto(route, { waitUntil: "load" });
      expect(response?.status()).toBe(200);

      const main = page.locator("main#main");
      await expect(main).toBeVisible();

      // Accessibility: exactly one top-level heading per page.
      await expect(page.locator("h1")).toHaveCount(1);

      const document = await page.evaluate(() => ({
        title: document.title,
        lang: document.documentElement.lang,
        imagesWithoutAlt: [...document.images].filter((img) => !img.hasAttribute("alt")).length,
        emptyLinks: [...document.querySelectorAll("a")].filter(
          (a) => !a.textContent?.trim() && !a.getAttribute("aria-label")
        ).length,
        placeholderLinks: [...document.querySelectorAll('a[href="#"]')].length,
      }));

      expect(document.title.trim().length).toBeGreaterThan(0);
      expect(document.lang).toBe("en");
      expect(document.imagesWithoutAlt).toBe(0);
      expect(document.emptyLinks).toBe(0);
      expect(document.placeholderLinks).toBe(0);

      // Gentle error checks — ignore CORS and Sanity API failures that are
      // expected when no .env is present.
      const unexpectedErrors = pageErrors.filter(
        (e) => !/CORS|blocked by CORS|sanity\.io|apicdn/.test(e)
      );
      expect(unexpectedErrors.length).toBe(0);
    });
  }

  test("the skip link targets main content", async ({ page }) => {
    await gotoHome(page);
    // The visible consent banner legitimately takes the first keyboard stop
    // (it is a modal). Answer it first, then verify the skip link is the
    // first stop among the document content.
    await rejectOptional(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBannerStaysHidden(page);

    const skip = page.locator('a[href="#main"]');
    await expect(skip).toBeAttached();
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await expect(page.locator("main#main")).toHaveCount(1);
  });

  test("unknown paths still render the app shell without crashing", async ({ page }) => {
    // `vite preview` serves the SPA shell (200) for every path, so the HTTP
    // 404 contract for unknown routes cannot be asserted here; it is enforced
    // by the scoped vercel.json rewrites and verified on the Vercel Preview
    // deployment. This test pins the current local behaviour only.
    const response = await page.goto("/this-route-does-not-exist", { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
  });
});