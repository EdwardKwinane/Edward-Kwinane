import { expect, gotoHome, test } from "./helpers";
import type { Page } from "@playwright/test";

/**
 * Homepage hero — composition, accessibility and "nothing moves" contract.
 *
 * The hero is deliberately static: the suite asserts the layout is intentional
 * at every breakpoint (two columns on desktop, a compact single row below it),
 * that the decorative icon composition stays out of the accessibility tree and
 * the tab order, and that no animation, pointer response or hover movement
 * exists at all — with and without a reduced-motion preference.
 *
 * These tests run against the production build with no CMS, so the copy comes
 * from `siteDefaults`; only structure and behaviour are asserted.
 */

const hero = (page: Page) => page.locator('section[aria-labelledby="hero-heading"]');
const iconField = (page: Page) => hero(page).locator('[data-testid="hero-icon-field"]');
const iconTiles = (page: Page) => hero(page).locator('[data-testid="hero-icon-tile"]');

const BOXES = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
];

async function openHero(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await gotoHome(page);
  // Consent is unrelated to the hero; dismiss it when it is shown.
  await page
    .locator('.cm button[data-role="necessary"]')
    .click({ timeout: 2500 })
    .catch(() => {});
  await page.waitForTimeout(150);
}

/** Tile boxes in document coordinates, rounded to sub-pixel tolerance. */
async function tileBoxes(page: Page) {
  return iconTiles(page).evaluateAll((tiles) =>
    tiles
      .filter((tile) => tile.getBoundingClientRect().width > 0)
      .map((tile) => {
        const rect = tile.getBoundingClientRect();
        return {
          x: Math.round(rect.x * 10) / 10,
          y: Math.round(rect.y * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      })
  );
}

test.describe("homepage hero", () => {
  test("exposes exactly one h1", async ({ page }) => {
    await openHero(page, 1440);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(hero(page).locator("h1")).toBeVisible();
  });

  test("primary and secondary CTAs keep their destinations and names", async ({ page }) => {
    await openHero(page, 1440);
    await expect(hero(page).getByRole("link", { name: "View my portfolio" })).toHaveAttribute(
      "href",
      "/portfolio"
    );
    await expect(hero(page).getByRole("link", { name: "Let's build something" })).toHaveAttribute(
      "href",
      "/contact"
    );
  });

  test("has no horizontal overflow at any supported width", async ({ page }) => {
    for (const { width, height } of BOXES) {
      await openHero(page, width, height);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test("desktop keeps the text and icon composition in two columns without overlap", async ({
    page,
  }) => {
    for (const width of [1280, 1440, 1920]) {
      await openHero(page, width, 900);
      const text = await hero(page).locator("h1").evaluate((el) => {
        const rect = el.parentElement!.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      const field = await iconField(page).boundingBox();
      expect(field, `icon field at ${width}px`).toBeTruthy();
      // Side by side: the icon field starts after the text column ends.
      expect(field!.x, `overlap at ${width}px`).toBeGreaterThanOrEqual(text.right - 1);
      // The composition is visible and materially sized, not a sliver.
      expect(field!.width).toBeGreaterThan(300);
      expect(field!.height).toBeGreaterThan(300);
    }
  });

  test("tablet uses a compact single-row composition", async ({ page }) => {
    for (const { width, height } of [
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
    ]) {
      await openHero(page, width, height);
      const tiles = await tileBoxes(page);
      expect(tiles.length, `tile count at ${width}px`).toBe(8);
      const tops = new Set(tiles.map((tile) => Math.round(tile.y)));
      expect(tops.size, `tiles share one row at ${width}px`).toBe(1);

      const field = await iconField(page).boundingBox();
      expect(field!.height, `icon field height at ${width}px`).toBeLessThanOrEqual(160);

      // The compact row sits below the copy and never overlaps it.
      const textBottom = await hero(page).locator("h1").evaluate((el) => {
        const parent = el.parentElement!.getBoundingClientRect();
        return parent.bottom;
      });
      expect(field!.y, `icon row above copy at ${width}px`).toBeGreaterThanOrEqual(
        textBottom - 1
      );
    }
  });

  test("mobile uses one compact static row without dead space", async ({ page }) => {
    for (const { width, height } of [
      { width: 390, height: 844 },
      { width: 375, height: 812 },
    ]) {
      await openHero(page, width, height);
      const tiles = await tileBoxes(page);
      expect(tiles.length, `tile count at ${width}px`).toBeGreaterThanOrEqual(6);
      expect(tiles.length, `tile count at ${width}px`).toBeLessThanOrEqual(8);
      const tops = new Set(tiles.map((tile) => Math.round(tile.y)));
      expect(tops.size, `tiles share one row at ${width}px`).toBe(1);

      const field = await iconField(page).boundingBox();
      expect(field!.height, `icon field height at ${width}px`).toBeGreaterThanOrEqual(90);
      expect(field!.height, `icon field height at ${width}px`).toBeLessThanOrEqual(160);

      // No accidental void between the capability tags and the icon row.
      const tagBottom = await hero(page)
        .locator(".rounded-pill")
        .last()
        .evaluate((el) => el.getBoundingClientRect().bottom);
      expect(field!.y - tagBottom, `gap after tags at ${width}px`).toBeLessThanOrEqual(60);

      // Both CTAs stay usable.
      for (const href of ["/portfolio", "/contact"]) {
        const cta = await hero(page).locator(`a[href="${href}"]`).boundingBox();
        expect(cta!.width).toBeGreaterThan(0);
        expect(cta!.x + cta!.width).toBeLessThanOrEqual(width + 1);
      }
    }
  });

  test("no icon tile is smaller than 40px", async ({ page }) => {
    for (const { width, height } of BOXES) {
      await openHero(page, width, height);
      const tiles = await tileBoxes(page);
      expect(tiles.length).toBeGreaterThan(0);
      for (const tile of tiles) {
        expect(tile.width, `tile width at ${width}px`).toBeGreaterThanOrEqual(40);
        expect(tile.height, `tile height at ${width}px`).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test("decorative icons are hidden from assistive technology and the tab order", async ({
    page,
  }) => {
    await openHero(page, 1440);

    await expect(iconField(page)).toHaveAttribute("aria-hidden", "true");
    // Every tile lives inside the hidden field and carries no label.
    expect(await tileBoxes(page)).toHaveLength(9);
    await expect(iconTiles(page).locator("svg[aria-hidden='false']")).toHaveCount(0);

    // The only focusable things in the hero are the two CTAs.
    const focusable = hero(page).locator(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    await expect(focusable).toHaveCount(2);
    await expect(iconField(page).locator("[tabindex]")).toHaveCount(0);

    // Keyboard traversal goes CTA → CTA and then leaves the hero; no icon is
    // ever focusable in between.
    const primary = hero(page).getByRole("link", { name: "View my portfolio" });
    const secondary = hero(page).getByRole("link", { name: "Let's build something" });
    await primary.focus();
    await expect(primary).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(secondary).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await hero(page).evaluate((el) => el.contains(document.activeElement))).toBe(false);
  });

  test("is completely static: no animation, no pointer response, no CTA movement", async ({
    page,
  }) => {
    await openHero(page, 1440);
    await page.waitForTimeout(300);

    // Nothing in the hero animates, not even on arrival.
    expect(await hero(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    const animated = await hero(page).evaluate((el) =>
      [...el.querySelectorAll("*")].filter((node) => getComputedStyle(node).animationName !== "none")
    );
    expect(animated).toHaveLength(0);

    // Pointer movement over the composition does not displace a single tile.
    const before = await tileBoxes(page);
    const field = await iconField(page).boundingBox();
    for (const [dx, dy] of [
      [0, 0],
      [40, 30],
      [-50, -20],
      [10, -40],
    ]) {
      await page.mouse.move(field!.x + field!.width / 2 + dx, field!.y + field!.height / 2 + dy, {
        steps: 5,
      });
      await page.waitForTimeout(80);
    }
    const after = await tileBoxes(page);
    expect(after).toEqual(before);

    // Hovering a CTA changes colour only — it never lifts or scales.
    const cta = hero(page).getByRole("link", { name: "View my portfolio" });
    const beforeHover = await cta.boundingBox();
    await cta.hover();
    await page.waitForTimeout(300);
    const afterHover = await cta.boundingBox();
    expect(Math.abs(afterHover!.y - beforeHover!.y)).toBeLessThanOrEqual(0.5);
    expect(afterHover!.width).toBeCloseTo(beforeHover!.width, 1);
    expect(afterHover!.height).toBeCloseTo(beforeHover!.height, 1);
  });

  test("returning to the homepage does not replay an entrance", async ({ page }) => {
    await openHero(page, 1440);
    await hero(page).getByRole("link", { name: "View my portfolio" }).click();
    await expect(page).toHaveURL(/\/portfolio$/);
    await page.goBack();
    await expect(hero(page)).toBeVisible();
    // Read immediately: a replayed entrance would still be running here.
    expect(await hero(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  });

  test("hides the duplicate availability badge once the navbar shows it", async ({ page }) => {
    const badge = hero(page).locator('[data-testid="hero-availability"]');

    await openHero(page, 1440);
    await expect(badge).toBeVisible();

    await page.setViewportSize({ width: 1536, height: 900 });
    await expect(badge).toBeHidden();
    await expect(
      page.locator("header").getByText(/available for select projects/i).first()
    ).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(badge).toBeHidden();
  });
});

test.describe("homepage hero — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders the full composition with nothing animating", async ({ page }) => {
    await openHero(page, 1440);
    expect(await tileBoxes(page)).toHaveLength(9);
    expect(await hero(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    const animated = await hero(page).evaluate((el) =>
      [...el.querySelectorAll("*")].filter((node) => getComputedStyle(node).animationName !== "none")
    );
    expect(animated).toHaveLength(0);
  });
});
