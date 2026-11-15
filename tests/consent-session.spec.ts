import {
  test,
  expect,
  acceptAll,
  banner,
  consentCookie,
  fbqDefined,
  expectBannerStaysHidden,
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
 * Per-session banner display (PR #13).
 *
 * The banner is shown once at the start of every browser session, even when a
 * saved choice exists. The session flag `ek-cc-banner-dismissed` records that
 * the visitor already answered it, so refreshes are quiet. Crucially, showing
 * the banner again must never rewrite the categories already saved in
 * `cc_cookie` — that would silently re-consent (or un-consent) a visitor.
 *
 * Pixel-specific behaviour depends on whether this build has a Pixel ID. CI
 * builds have none, so `metaPixel.init()` returns before creating the stub and
 * no Meta traffic occurs; these assertions still hold there.
 */

async function endSession(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => sessionStorage.clear());
}

test.describe("banner per session", () => {
  test("one answer keeps the banner quiet for the rest of the session", async ({
    page,
    metaRequests,
  }) => {
    await gotoHome(page);
    await rejectOptional(page);

    expect(await sessionFlag(page)).toBe("1");
    const first = await consentCookie(page);
    expect(first!.categories).toEqual(["necessary"]);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBannerStaysHidden(page);

    expect(await sessionFlag(page)).toBe("1");
    expect((await consentCookie(page))!.categories).toEqual(["necessary"]);
    expect(metaRequests).toEqual([]);
  });

  test("a new session asks again without touching the saved choice", async ({
    page,
    metaRequests,
  }) => {
    await gotoHome(page);
    await rejectOptional(page);
    const saved = await consentCookie(page);

    await endSession(page);
    await page.reload({ waitUntil: "domcontentloaded" });

    // The banner is back for the new session.
    await expect(banner(page)).toBeVisible();
    await waitForConsentReady(page);
    expect(await sessionFlag(page)).toBeNull();

    const afterBanner = await consentCookie(page);
    expect(afterBanner!.categories).toEqual(["necessary"]);
    // Displaying the banner again must not look like a new consent event.
    expect(afterBanner!.consentTimestamp).toBe(saved!.consentTimestamp);

    await rejectOptional(page);
    const afterAnswer = await consentCookie(page);
    expect(afterAnswer!.categories).toEqual(["necessary"]);
    expect(afterAnswer!.consentTimestamp).toBe(saved!.consentTimestamp);
    expect(await sessionFlag(page)).toBe("1");
    expect(metaRequests).toEqual([]);
  });

  test("a visitor with saved consent is re-asked each session, not re-recorded", async ({
    page,
  }) => {
    await gotoHome(page);
    await acceptAll(page);
    const saved = await consentCookie(page);
    expect(saved!.categories).toContain("marketing");

    // Same session: refresh stays quiet.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBannerStaysHidden(page);

    // New session: the banner is back, but the stored consent is unchanged.
    await endSession(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(banner(page)).toBeVisible();

    const afterShow = await consentCookie(page);
    expect(afterShow!.categories).toEqual(saved!.categories);
    expect(afterShow!.consentTimestamp).toBe(saved!.consentTimestamp);
    expect(afterShow!.consentId).toBe(saved!.consentId);
  });

  test("withdrawal survives a reload and a new session", async ({
    page,
    metaRequests,
  }) => {
    await gotoHome(page);
    await acceptAll(page);

    await openPreferences(page);
    await setCategory(page, "marketing", false);
    await savePreferences(page);
    await expect(preferences(page)).toBeHidden();

    expect((await consentCookie(page))!.categories).not.toContain("marketing");

    // Same session after reload: quiet banner.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBannerStaysHidden(page);

    // New session after withdrawal: the banner returns, but the withdrawal
    // stands and no Meta traffic is produced.
    await endSession(page);
    const before = metaRequests.length;
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(banner(page)).toBeVisible();

    expect((await consentCookie(page))!.categories).not.toContain("marketing");
    expect(metaRequests.length).toBe(before);
    // `window.fbq` may exist as a dormant stub only if the pixel was
    // initialised before withdrawal; the enforcement is the absence of traffic.
    if (await fbqDefined(page)) {
      expect(metaRequests).toEqual([]);
    }
  });
});