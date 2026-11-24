import { expect, gotoHome, waitForConsentReady, test, type Page } from "./helpers";

/**
 * Process section — six-card stage grid.
 *
 * The section must render the six stages as informational cards, keep the
 * copy verbatim, give every card a restrained decorative icon, honour
 * reduced motion by keeping cards static, and never introduce horizontal
 * scrolling. Cards are not interactive, so they must not be focusable or
 * imply navigation.
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

/** The SurfaceCard panel inside a stage list item. */
function cardSurface(page: Page, index: number) {
  return cards(page).nth(index).locator("div").first();
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

async function surfaceMetrics(page: Page, index: number) {
  return cardSurface(page, index).evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      transform: computed.transform,
      transitionProperty: computed.transitionProperty,
      transitionDuration: computed.transitionDuration,
      boxShadow: computed.boxShadow,
      borderColor: computed.borderColor,
      cursor: computed.cursor,
    };
  });
}

/** The decorative icon chip is the first span inside the card surface. */
async function chipMetrics(page: Page, index: number) {
  return cardSurface(page, index)
    .locator("span")
    .first()
    .evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });
}

/**
 * Wait for the GSAP entrance reveal to finish. The last card resolves last,
 * so its final opacity confirms every earlier card has completed too.
 */
async function waitForReveal(page: Page) {
  await expect(cards(page).last()).toHaveCSS("opacity", "1");
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

  test("gives every card one decorative icon and no images", async ({ page }) => {
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    // The six stage icons are lucide SVGs, hidden from assistive technology:
    // the visible stage name is the accessible label.
    const icons = section.locator("svg");
    await expect(icons).toHaveCount(STAGES.length);
    for (let index = 0; index < STAGES.length; index += 1) {
      await expect(icons.nth(index)).toHaveAttribute("aria-hidden", "true");
    }

    // The redesign retired the per-card photographs; nothing should load one.
    await expect(section.locator("img")).toHaveCount(0);
  });

  test("informational cards do not react to hover", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();
    await waitForReveal(page);

    const before = await surfaceMetrics(page, 1);
    const beforeChip = await chipMetrics(page, 1);
    expect(before.transform).toBe("none");
    expect(before.boxShadow).toBe("none");
    expect(before.cursor).not.toBe("pointer");

    await cards(page).nth(1).hover();

    const hovered = await surfaceMetrics(page, 1);
    const hoveredChip = await chipMetrics(page, 1);
    expect(hovered.transform).toBe("none");
    expect(hovered.boxShadow).toBe(before.boxShadow);
    expect(hovered.borderColor).toBe(before.borderColor);
    expect(hovered.cursor).toBe(before.cursor);
    expect(hoveredChip.backgroundColor).toBe(beforeChip.backgroundColor);
    expect(hoveredChip.color).toBe(beforeChip.color);

    const sibling = await surfaceMetrics(page, 0);
    expect(sibling.transform).toBe("none");
    expect(sibling.boxShadow).toBe("none");

    // The card is informational: no opacity change on the card or its siblings.
    expect((await cardMetrics(page, 1)).opacity).toBe(1);
    expect((await cardMetrics(page, 0)).opacity).toBe(1);
  });

  test("cards are informational: not focusable and not links", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    await expect(cards(page)).toHaveCount(STAGES.length);
    await expect(section.locator("a")).toHaveCount(0);
    await expect(section.locator("button")).toHaveCount(0);
    await expect(section.locator("[tabindex]")).toHaveCount(0);

    for (let index = 0; index < STAGES.length; index += 1) {
      const tabIndex = await cards(page)
        .nth(index)
        .evaluate((element) => (element as HTMLElement).tabIndex);
      expect(tabIndex).toBe(-1);
    }

    // Clicking a card must not navigate anywhere.
    const urlBefore = page.url();
    await cards(page).nth(2).click();
    expect(page.url()).toBe(urlBefore);
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

  test("card headings follow the theme tokens in light and dark", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((value) => {
        try {
          localStorage.setItem("ek-theme", value);
        } catch {
          /* storage may be unavailable; the default theme still renders */
        }
      }, theme);
      await gotoHome(page);
      await dismissConsent(page);

      const section = processSection(page);
      await section.scrollIntoViewIfNeeded();

      const headings = section.getByRole("heading", { level: 3 });
      await expect(headings).toHaveCount(STAGES.length);

      // text-navy resolves to the theme's navy token.
      const expected = theme === "dark" ? "rgb(245, 247, 255)" : "rgb(13, 13, 91)";
      for (let index = 0; index < STAGES.length; index += 1) {
        await expect(headings.nth(index)).toBeVisible();
        const color = await headings
          .nth(index)
          .evaluate((element) => getComputedStyle(element).color);
        expect(color).toBe(expected);
      }

      // Reset for the next iteration.
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("ek-theme");
        } catch {
          /* ignore */
        }
      });
    }
  });
});

test.describe("process section — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the cards static: no transitions, no hover treatment", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await dismissConsent(page);

    const section = processSection(page);
    await section.scrollIntoViewIfNeeded();

    await expect(section.getByRole("heading", { level: 3 })).toHaveCount(STAGES.length);

    const before = await cardMetrics(page, 1);
    expect(before.transform).toBe("none");
    const beforeSurface = await surfaceMetrics(page, 1);
    const beforeChip = await chipMetrics(page, 1);
    expect(beforeSurface.transitionDuration).toBe("0s");

    await cards(page).nth(1).hover();

    const hovered = await cardMetrics(page, 1);
    const surface = await surfaceMetrics(page, 1);
    const chip = await chipMetrics(page, 1);
    expect(hovered.transform).toBe("none");
    expect(surface.transform).toBe("none");
    expect(surface.transitionDuration).toBe("0s");
    expect(surface.boxShadow).toBe(beforeSurface.boxShadow);
    expect(surface.borderColor).toBe(beforeSurface.borderColor);
    expect(chip.backgroundColor).toBe(beforeChip.backgroundColor);
    expect(chip.color).toBe(beforeChip.color);

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  });
});
