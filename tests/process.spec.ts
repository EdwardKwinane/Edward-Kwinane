import { expect, gotoHome, waitForConsentReady, test, type Page } from "./helpers";

/**
 * Process section — Hover Reveal Cards.
 *
 * The section must render the six stages, keep the copy verbatim, load one
 * distinct photograph per card, honour keyboard focus and reduced motion the
 * same way it does hover, and never introduce horizontal scrolling.
 */

const STAGES = [
  { index: "01", name: "DISCOVER", detail: "Understand the problem, users and constraints before anything else." },
  { index: "02", name: "ARCHITECT", detail: "Design the system boundaries and contracts before writing code." },
  { index: "03", name: "BUILD", detail: "Implement with AI where it creates leverage, from interface to infrastructure." },
  { index: "04", name: "VALIDATE", detail: "Measure against the outcome — retrieval quality, reliability, real usage." },
  { index: "05", name: "DEPLOY", detail: "Ship to production with clean infrastructure and observability." },
  { index: "06", name: "EVOLVE", detail: "Improve based on evidence, not guesswork." },
] as const;

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

function cards(page: Page) {
  return processSection(page).locator("ul > li");
}

async function cardMetrics(page: Page, index: number) {
  return cards(page).nth(index).evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      opacity: Number(computed.opacity),
      transform: computed.transform,
      transitionProperty: computed.transitionProperty,
    };
  });
}

test.describe("process section", () => {
  test("renders the heading, intro and all six stages with verbatim copy", async ({ page }) => {
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await expect(section).toBeVisible();
    await expect(section.getByText("Process", { exact: true })).toBeVisible();
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
      await expect(headings.nth(index)).toHaveText(STAGES[index].name);
    }

    for (const stage of STAGES) {
      await expect(section.getByText(stage.detail)).toBeVisible();
      await expect(section.getByText(`Stage ${stage.index}`, { exact: true })).toBeVisible();
    }
  });

  test("loads one distinct, fully-resolved photograph per card", async ({ page }) => {
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    const images = section.locator("img");
    await expect(images).toHaveCount(STAGES.length);

    const sources = await images.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLImageElement).src)
    );
    expect(new Set(sources).size).toBe(STAGES.length);

    for (let index = 0; index < STAGES.length; index += 1) {
      await expect
        .poll(
          () =>
            images.nth(index).evaluate(
              (element) => {
                const img = element as HTMLImageElement;
                return img.complete && img.naturalWidth > 0;
              }
            ),
          { timeout: 20000 }
        )
        .toBe(true);
    }
  });

  test("hover emphasis promotes the active card and dims its siblings", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    await cards(page).nth(1).hover();
    await page.waitForTimeout(700);

    const hovered = await cardMetrics(page, 1);
    const sibling = await cardMetrics(page, 0);
    expect(hovered.opacity).toBe(1);
    expect(sibling.opacity).toBeLessThan(0.8);
  });

  test("keyboard focus produces the same emphasis as hover", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    const focused = cards(page).locator("article").nth(0);
    await focused.focus();
    await expect(focused).toBeFocused();
    await page.waitForTimeout(700);

    const focusedCard = await cardMetrics(page, 0);
    const sibling = await cardMetrics(page, 1);
    expect(focusedCard.opacity).toBe(1);
    expect(sibling.opacity).toBeLessThan(0.8);

    const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");
  });

  test("mobile keeps a single-column, readable card list", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    const trackCount = await section
      .locator("ul")
      .first()
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(trackCount).toBe(1);

    for (const stage of STAGES) {
      await expect(section.getByRole("heading", { level: 3, name: stage.name })).toBeVisible();
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

  test("cards stay legible in the dark theme", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ek-theme", "dark");
      } catch {
        /* storage may be unavailable; the default theme still renders */
      }
    });
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    const headings = section.getByRole("heading", { level: 3 });
    await expect(headings).toHaveCount(STAGES.length);
    for (let index = 0; index < STAGES.length; index += 1) {
      await expect(headings.nth(index)).toBeVisible();
      const color = await headings.nth(index).evaluate((element) => getComputedStyle(element).color);
      // Card text is intentionally white over the navy gradient in both themes.
      expect(color).toBe("rgb(255, 255, 255)");
    }
  });
});

test.describe("process section — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the cards static: no transitions, no hover transforms", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    await expect(section.getByRole("heading", { level: 3 })).toHaveCount(STAGES.length);

    await cards(page).nth(1).hover();
    await page.waitForTimeout(150);

    const hovered = await cardMetrics(page, 1);
    expect(hovered.transitionProperty).toBe("none");
    expect(hovered.transform).toBe("none");

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  });
});
