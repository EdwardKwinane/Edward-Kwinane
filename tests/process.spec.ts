import { expect, gotoHome, waitForConsentReady, test, type Page } from "./helpers";

/**
 * Process section — scroll stacking cards.
 *
 * These tests protect the behaviour the section is responsible for: the six
 * stages always exist, the desktop deck is scroll-driven without hijacking the
 * page, mobile falls back to a normal sequential list, reduced motion removes
 * the deck entirely, and no breakpoint introduces horizontal scrolling.
 */

const STAGES = ["DISCOVER", "ARCHITECT", "BUILD", "VALIDATE", "DEPLOY", "EVOLVE"] as const;

const VIEWPORTS = [
  { width: 375, height: 812, label: "375 mobile" },
  { width: 390, height: 844, label: "390 mobile" },
  { width: 768, height: 1024, label: "768 tablet" },
  { width: 1024, height: 768, label: "1024 laptop" },
  { width: 1440, height: 900, label: "1440 desktop" },
] as const;

/** Dismiss the consent banner with the necessary-only choice. */
async function dismissConsent(page: Page): Promise<void> {
  await waitForConsentReady(page);
  const necessary = page.locator('.cm button[data-role="necessary"]');
  if (await necessary.isVisible().catch(() => false)) {
    await necessary.click();
  }
  await expect(page.locator(".cm")).toBeHidden();
}

function processSection(page: Page) {
  return page.locator('section[aria-labelledby="process-heading"]');
}

test.describe("process section", () => {
  test("renders the heading, intro and all six stages in order", async ({ page }) => {
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await expect(section).toBeVisible();
    await expect(
      section.getByRole("heading", { level: 2, name: "From idea to production" })
    ).toBeVisible();
    await expect(
      section.getByText(
        "A repeatable sequence that moves a concept into a deployed system without losing the thread."
      )
    ).toBeVisible();

    const headings = section.getByRole("heading", { level: 3 });
    await expect(headings).toHaveCount(STAGES.length);
    for (let index = 0; index < STAGES.length; index += 1) {
      await expect(headings.nth(index)).toHaveText(STAGES[index]);
    }
  });

  test("desktop deck scrolls through the stages without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await dismissConsent(page);

    const stack = page.getByTestId("process-stack");
    await expect(stack).toBeVisible();

    const cards = stack.locator("ol > li");
    await expect(cards).toHaveCount(STAGES.length);

    /**
     * Cards must stay fully opaque: a stacked card is revealed by sliding up
     * inside the clipped deck, not by fading in over the card behind it. The
     * list item's translate places it in the deck; the inner wrapper's scale
     * is how far it has receded under later cards.
     */
    const cardMetrics = async (index: number) =>
      cards.nth(index).evaluate((element) => {
        const outer = new DOMMatrixReadOnly(getComputedStyle(element).transform);
        const inner = element.firstElementChild
          ? new DOMMatrixReadOnly(getComputedStyle(element.firstElementChild).transform)
          : new DOMMatrixReadOnly("none");
        return {
          y: outer.m42,
          scale: inner.a,
          opacity: Number(getComputedStyle(element).opacity),
          height: element.getBoundingClientRect().height,
        };
      });

    // At rest, the first card owns the deck and the last card is still parked
    // below it, waiting for its turn.
    const firstAtRest = await cardMetrics(0);
    const lastAtRest = await cardMetrics(STAGES.length - 1);
    expect(firstAtRest.y).toBeCloseTo(0, 0);
    expect(firstAtRest.opacity).toBe(1);
    expect(lastAtRest.y).toBeGreaterThan(lastAtRest.height * 0.9);
    expect(lastAtRest.opacity).toBe(0);

    const { top, height } = await stack.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top + window.scrollY, height: rect.height };
    });

    for (const ratio of [0.5, 0.95]) {
      await page.evaluate((y) => window.scrollTo(0, y), top + height * ratio);
      await page.waitForTimeout(250);

      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
    }

    // The final stage has landed, and earlier cards have receded behind it.
    const lastAtEnd = await cardMetrics(STAGES.length - 1);
    const firstAtEnd = await cardMetrics(0);
    expect(lastAtEnd.y).toBeLessThan(2);
    expect(firstAtEnd.scale).toBeLessThan(0.95);
  });

  test("mobile uses the sequential list and keeps every card readable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHome(page);
    await dismissConsent(page);

    await expect(page.getByTestId("process-static")).toBeVisible();
    await expect(page.getByTestId("process-stack")).toBeHidden();

    const section = processSection(page);
    await expect(section.getByRole("heading", { level: 3 })).toHaveCount(STAGES.length);

    for (const stage of STAGES) {
      await expect(section.getByRole("heading", { level: 3, name: stage })).toBeVisible();
    }
  });

  for (const viewport of VIEWPORTS) {
    test(`no horizontal overflow at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoHome(page);
      await dismissConsent(page);

      const section = processSection(page);
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);

      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
    });
  }
});

test.describe("process section — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders a static grid and no scroll deck", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await dismissConsent(page);

    await expect(page.getByTestId("process-stack")).toHaveCount(0);
    await expect(page.getByTestId("process-static")).toBeVisible();
    await expect(processSection(page).getByRole("heading", { level: 3 })).toHaveCount(
      STAGES.length
    );

    const transform = await page
      .getByTestId("process-static")
      .locator("article")
      .first()
      .evaluate((element) => getComputedStyle(element).transform);
    expect(transform).toBe("none");

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  });
});
