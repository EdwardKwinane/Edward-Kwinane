import {
  test,
  expect,
  acceptAll,
  banner,
  consentCookie,
  fbqDefined,
  hasMetaCookies,
  gotoHome,
  openPreferences,
  preferences,
  rejectOptional,
  savePreferences,
  sessionFlag,
  setCategory,
  waitForConsentReady,
} from "./helpers";

/**
 * Consent gating — the privacy contract of the site.
 *
 * The invariant these tests exist to protect: **no request leaves the browser
 * for a Meta host until the visitor has explicitly granted Marketing consent.**
 * That is asserted unconditionally, because it holds whether or not the build
 * carries a pixel ID. Whichever happens next (pixel loads exactly once, or
 * stays dormant because no ID was configured) is asserted as a branch.
 */

const fbeventsLoads = (requests: string[]) =>
  requests.filter((url) => url.includes("fbevents.js")).length;

test.describe("consent banner", () => {
  test("shows on a first visit and sets no tracking state", async ({
    page,
    metaRequests,
  }) => {
    await gotoHome(page);

    await expect(banner(page)).toBeVisible();
    await expect(
      page.locator('.cm button[data-role="all"]')
    ).toBeVisible();
    await expect(
      page.locator('.cm button[data-role="necessary"]')
    ).toBeVisible();
    await expect(page.locator('.cm button[data-role="show"]')).toBeVisible();

    expect(await consentCookie(page)).toBeNull();
    expect(await fbqDefined(page)).toBe(false);
    expect(metaRequests).toEqual([]);
  });

  test("keeps the banner until an explicit choice is made", async ({ page }) => {
    await gotoHome(page);

    await page.locator('.cm button[data-role="show"]').click();
    await expect(preferences(page)).toBeVisible();

    const toggles = await page
      .locator("input.section__toggle")
      .evaluateAll((els) =>
        (els as HTMLInputElement[]).map((el) => ({
          name: el.name,
          checked: el.checked,
          disabled: el.disabled,
        }))
      );

    const necessary = toggles.find((t) => t.name === "cc-necessary");
    const analytics = toggles.find((t) => t.name === "cc-analytics");
    const marketing = toggles.find((t) => t.name === "cc-marketing");

    expect(necessary).toMatchObject({ checked: true, disabled: true });
    expect(analytics?.checked).toBe(false);
    expect(marketing?.checked).toBe(false);

    await page.keyboard.press("Escape");
    await expect(preferences(page)).toBeHidden();

    // Closing the preferences layer is not an answer to the banner.
    await expect(banner(page)).toBeVisible();
    expect(await consentCookie(page)).toBeNull();
  });

  test("accept all stores the three categories with an ID and timestamps", async ({
    page,
  }) => {
    await gotoHome(page);
    await acceptAll(page);

    const cookie = await consentCookie(page);
    expect(cookie).not.toBeNull();
    expect(cookie!.categories).toEqual(["necessary", "analytics", "marketing"]);
    expect(cookie!.revision).toBe(1);
    expect(cookie!.consentId).toEqual(expect.any(String));
    expect(cookie!.consentId.length).toBeGreaterThan(10);
    expect(cookie!.consentTimestamp).toEqual(expect.any(String));
    expect(cookie!.lastConsentTimestamp).toEqual(expect.any(String));
  });

  test("accept all activates the pixel at most once", async ({
    page,
    metaRequests,
  }, testInfo) => {
    await gotoHome(page);
    await acceptAll(page);

    const hasPixel = await fbqDefined(page);
    if (hasPixel) {
      await expect
        .poll(() => fbeventsLoads(metaRequests), { timeout: 15_000 })
        .toBe(1);

      // A single script load must survive an SPA navigation.
      await page.locator('a[href="/about"]:visible').first().click();
      await expect(page).toHaveURL(/\/about$/);
      expect(fbeventsLoads(metaRequests)).toBe(1);
    } else {
      // No pixel ID in this build: marketing consent must still not cause
      // any tracking traffic.
      expect(metaRequests).toEqual([]);
    }
  });

  test("reject optional stores necessary only and never contacts Meta", async ({
    page,
    metaRequests,
  }) => {
    await gotoHome(page);
    await rejectOptional(page);

    const cookie = await consentCookie(page);
    expect(cookie!.categories).toEqual(["necessary"]);
    expect(await fbqDefined(page)).toBe(false);

    await page.locator('a[href="/blog"]:visible').first().click();
    await expect(page).toHaveURL(/\/blog$/);
    expect(metaRequests).toEqual([]);
  });

  test("customize can grant marketing without analytics", async ({ page }) => {
    await gotoHome(page);

    await page.locator('.cm button[data-role="show"]').click();
    await expect(preferences(page)).toBeVisible();
    await setCategory(page, "marketing", true);
    await savePreferences(page);

    await expect(banner(page)).toBeHidden();
    const cookie = await consentCookie(page);
    expect(cookie!.categories).toEqual(["necessary", "marketing"]);
  });

  test("the footer control reopens preferences and marketing can be withdrawn", async ({
    page,
    metaRequests,
  }) => {
    await gotoHome(page);
    await acceptAll(page);

    await openPreferences(page);
    await setCategory(page, "marketing", false);
    await savePreferences(page);

    await expect(preferences(page)).toBeHidden();
    const cookie = await consentCookie(page);
    expect(cookie!.categories).not.toContain("marketing");
    // The Meta snippet intentionally leaves a dormant `window.fbq` stub behind
    // after init; withdrawal is enforced by the request gate, not by deleting
    // the function, so the observable contract is "no traffic, no cookies".
    expect(await hasMetaCookies(page)).toBe(false);

    // The withdrawal must survive a reload and a new session, and no new
    // tracking traffic may be produced afterwards.
    const beforeReload = metaRequests.length;
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForConsentReady(page);
    await expect(banner(page)).toBeHidden();

    await page.locator('a[href="/contact"]:visible').first().click();
    await expect(page).toHaveURL(/\/contact$/);
    expect(metaRequests.length).toBe(beforeReload);
  });
});