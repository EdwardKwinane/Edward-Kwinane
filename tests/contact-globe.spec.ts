import { test, expect } from "@playwright/test";

/**
 * Focused coverage for the Contact page's two-column layout and static
 * globe. The real form's submission contract (loading, success, error,
 * honeypot, /api/contact payload) lives in `contact-form.spec.ts` — this
 * suite only asserts the new presentation did not break it.
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

test.describe("contact page — globe layout", () => {
  test("renders one h1, the context column and the form card", async ({ page }) => {
    await openContact(page);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h2").filter({ hasText: "How this usually starts" })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: "Tell me about the system" })).toBeVisible();
  });

  test("globe renders as static inline SVG without transitions or animation", async ({ page }) => {
    await openContact(page);
    const figure = page.locator("figure", { has: page.locator("svg") });
    await expect(figure).toBeVisible();
    await expect(figure.locator("svg path").first()).toBeAttached();
    await expect(figure.locator("svg")).toHaveAttribute("aria-hidden", "true");
    const style = await figure.locator("svg").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { animationName: cs.animationName, animationDuration: cs.animationDuration, transition: cs.transitionDuration };
    });
    expect(style.animationName).toBe("none");
    expect(style.transition).toBe("0s");
  });

  test("two columns sit side by side on desktop without overlap", async ({ page }) => {
    await openContact(page, 1440);
    const left = await page.locator("h2", { hasText: "How this usually starts" }).boundingBox();
    const right = await page.locator("h2", { hasText: "Tell me about the system" }).boundingBox();
    expect(left && right).toBeTruthy();
    expect(left!.x).toBeLessThan(right!.x);
    // Globe figure must end left of the form column (no overlap, form stays clickable).
    const globe = await page.locator("figure", { has: page.locator("svg") }).boundingBox();
    expect(globe!.x + globe!.width).toBeLessThanOrEqual(right!.x + 1);
  });

  test("mobile: contact details render before the form, no horizontal overflow", async ({ page }) => {
    await openContact(page, 390);
    const positions = await page.locator("h2").evaluateAll((nodes) =>
      nodes.map((n) => ({ text: n.textContent ?? "", y: n.getBoundingClientRect().y }))
    );
    const context = positions.find((p) => p.text.includes("How this usually starts"));
    const form = positions.find((p) => p.text.includes("Tell me about the system"));
    expect(context && form).toBeTruthy();
    expect(context!.y).toBeLessThan(form!.y);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ).toBe(0);
  });

  test("shows verified site contact information, not demo placeholders", async ({ page }) => {
    await openContact(page);
    const text = (await page.locator("main#main").innerText()).toLowerCase();
    expect(text).toContain("no public email address yet");
    expect(text).not.toContain("yoursaas.ai");
    expect(text).not.toContain("scrollx");
    expect(text).not.toContain("+1 (800) 321");
  });

  test("keeps the real form fields and their ids", async ({ page }) => {
    await openContact(page);
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#project-type")).toBeVisible();
    await expect(page.locator("#message")).toBeVisible();
    // The form must still be wired for a real POST via fetch to /api/contact;
    // the request path is asserted end-to-end in contact-form.spec.ts.
    await expect(page.locator('button[type="submit"]')).toContainText("Send message");
  });
});
