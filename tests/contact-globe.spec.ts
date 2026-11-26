import { test, expect } from "@playwright/test";

/**
 * Focused coverage for the Contact page's refined two-column layout.
 *
 * The real form's submission contract (loading, success, error, honeypot,
 * /api/contact payload) lives in `contact-form.spec.ts` — this suite only
 * asserts the refined presentation: the removed information block is fully
 * gone, the static globe renders, and the form card is the primary element.
 */

async function openContact(page: import("@playwright/test").Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main#main")).toBeVisible();
  // Dismiss the consent banner if it is up; ignore if not.
  await page
    .locator('.cm button[data-role="necessary"]')
    .click({ timeout: 3000 })
    .catch(() => {});
  await page.waitForTimeout(200);
}

test.describe("contact page — refined globe layout", () => {
  const removedCopy = [
    "Get in touch",
    "How this usually starts",
    "Project types",
    "Response time",
    "Prefer email?",
    "no public email address yet",
    "typically reviewed within a couple of business days",
    "The form is the fastest route",
  ];

  test("renders the heading and form card, with the unwanted section fully absent", async ({ page }) => {
    await openContact(page);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h2").filter({ hasText: "Tell me about the system" })).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("button[type=submit]")).toContainText("Send message");

    // None of the removed information-block copy may remain on the page.
    const bodyText = await page.locator("body").innerText();
    for (const snippet of removedCopy) {
      expect(bodyText).not.toContain(snippet);
    }
  });

  test("globe renders as static inline SVG without transitions or animation", async ({ page }) => {
    await openContact(page);
    const figure = page.locator("figure", { has: page.locator("svg") });
    await expect(figure).toBeVisible();
    await expect(figure.locator("svg path").first()).toBeAttached();
    await expect(figure.locator("svg")).toHaveAttribute("aria-hidden", "true");
    const style = await figure.locator("svg").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { animationName: cs.animationName, transition: cs.transitionDuration };
    });
    expect(style.animationName).toBe("none");
    expect(style.transition).toBe("0s");
  });

  test("two columns sit side by side on desktop without overlap", async ({ page }) => {
    await openContact(page, 1440);
    const globe = await page.locator("figure", { has: page.locator("svg") }).boundingBox();
    const form = await page.locator("h2", { hasText: "Tell me about the system" }).boundingBox();
    expect(globe && form).toBeTruthy();
    expect(globe!.x + globe!.width).toBeLessThanOrEqual(form!.x + 1);
  });

  test("mobile: globe before the form, no horizontal overflow", async ({ page }) => {
    await openContact(page, 390);
    const globeBox = await page.locator("figure svg").boundingBox();
    const formBox = await page.locator("h2", { hasText: "Tell me about the system" }).boundingBox();
    expect(globeBox && formBox).toBeTruthy();
    expect(globeBox!.y).toBeLessThan(formBox!.y);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ).toBe(0);
  });
});
