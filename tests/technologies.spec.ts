import { expect, gotoHome, waitForConsentReady, test, type Page } from "./helpers";

/**
 * Technologies & Tools marquee.
 *
 * Two opposing CSS marquee rows. The suite pins the behaviours that are easy
 * to regress: a single accessible copy of each technology, no duplicated
 * WebRTC name, an operable pause/play control (pointer, keyboard, touch),
 * manual/hover/focus/reduced-motion precedence, theme-aware label contrast,
 * a seamless loop, and no layout or runtime breakage across breakpoints.
 */

const SECTION = 'section[aria-labelledby="technologies-heading"]';

const ROW_ONE_LABEL = "Interface, language and runtime technologies";
const ROW_TWO_LABEL = "Content, motion, delivery and real-time technologies";

const ROW_ONE = [
  "React",
  "TypeScript",
  "Vite",
  "Tailwind CSS",
  "React Router",
  "Radix UI",
  "Lucide",
  "Node.js",
];

const ROW_TWO = [
  "Sanity",
  "Framer Motion",
  "GSAP",
  "Upstash",
  "Vercel",
  "GitHub",
  "npm",
  "WebRTC",
];

const VIEWPORTS = [
  { width: 1920, height: 1080, label: "1920" },
  { width: 1440, height: 900, label: "1440" },
  { width: 1280, height: 900, label: "1280" },
  { width: 1024, height: 768, label: "1024" },
  { width: 768, height: 1024, label: "768" },
  { width: 390, height: 844, label: "390" },
  { width: 375, height: 812, label: "375" },
] as const;

async function dismissConsent(page: Page): Promise<void> {
  await waitForConsentReady(page);
  const necessary = page.locator('.cm button[data-role="necessary"]');
  if (await necessary.isVisible().catch(() => false)) {
    await necessary.click();
  }
  await expect(page.locator(".cm")).toBeHidden();
}

function techSection(page: Page) {
  return page.locator(SECTION);
}

function pauseButton(page: Page) {
  return techSection(page).getByRole("button", { name: /technology marquee/i });
}

async function trackPlayStates(page: Page): Promise<string[]> {
  return techSection(page)
    .locator(".integration-marquee__track")
    .evaluateAll((tracks) => tracks.map((track) => getComputedStyle(track).animationPlayState));
}

/** Read the listitems out of a Playwright ARIA snapshot, in order. */
function snapshotItems(snapshot: string): string[] {
  return [...snapshot.matchAll(/^\s*- listitem: (.+)$/gm)].map((match) => match[1].trim());
}

async function openSection(page: Page): Promise<void> {
  await gotoHome(page);
  await dismissConsent(page);
  const section = techSection(page);
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading", { name: "The stack I build with" })).toBeVisible();
}

test.describe("technologies marquee — accessible content", () => {
  test("announces each technology exactly once per row", async ({ page }) => {
    await openSection(page);

    const lists = techSection(page).getByRole("list");
    await expect(lists).toHaveCount(2);

    const rowOne = techSection(page).getByRole("list", { name: ROW_ONE_LABEL });
    const rowTwo = techSection(page).getByRole("list", { name: ROW_TWO_LABEL });

    await expect(rowOne.getByRole("listitem")).toHaveCount(ROW_ONE.length);
    await expect(rowTwo.getByRole("listitem")).toHaveCount(ROW_TWO.length);

    expect(snapshotItems(await rowOne.ariaSnapshot())).toEqual(ROW_ONE);
    expect(snapshotItems(await rowTwo.ariaSnapshot())).toEqual(ROW_TWO);

    // Visual repetition exists in the DOM but is hidden from assistive tech.
    const hiddenLists = techSection(page).locator('ul[aria-hidden="true"]');
    await expect(hiddenLists).toHaveCount(2);
    await expect(techSection(page).locator('li[aria-hidden="true"]').first()).toBeAttached();
  });

  test("WebRTC has a single, non-duplicated accessible name", async ({ page }) => {
    await openSection(page);

    const rowTwo = techSection(page).getByRole("list", { name: ROW_TWO_LABEL });
    const snapshot = await rowTwo.ariaSnapshot();

    expect(snapshot).not.toContain("WebRTC WebRTC");
    expect(snapshot.match(/WebRTC/g)).toHaveLength(1);
    expect(snapshotItems(snapshot)).toContain("WebRTC");
    expect(snapshotItems(snapshot)).toHaveLength(ROW_TWO.length);
  });
});

test.describe("technologies marquee — pause control", () => {
  test("pause/play works with a pointer and meets the hit-area minimum", async ({ page }) => {
    await openSection(page);

    const button = pauseButton(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(button).toHaveAccessibleName(/Pause technology marquee/i);

    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toHaveAccessibleName(/Play technology marquee/i);
    expect(await trackPlayStates(page)).toEqual(["paused", "paused"]);

    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    expect(await trackPlayStates(page)).toEqual(["running", "running"]);
  });

  test("pause/play works from the keyboard", async ({ page }) => {
    await openSection(page);

    const button = pauseButton(page);
    await button.focus();
    await expect(button).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    expect(await trackPlayStates(page)).toEqual(["paused", "paused"]);

    await page.keyboard.press("Space");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    expect(await trackPlayStates(page)).toEqual(["running", "running"]);
  });

  test("manual pause persists after the pointer leaves the section", async ({ page }) => {
    await openSection(page);

    const button = pauseButton(page);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");

    const row = techSection(page).locator(".integration-marquee").first();
    const box = await row.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(150);
    expect(await trackPlayStates(page)).toEqual(["paused", "paused"]);

    await page.mouse.move(5, 5);
    await page.waitForTimeout(150);
    expect(await trackPlayStates(page)).toEqual(["paused", "paused"]);
    await expect(techSection(page).locator('[data-testid="tech-marquee-group"]')).toHaveAttribute(
      "data-paused",
      "true"
    );
  });

  test("hover pauses only the hovered row; focus pauses the group", async ({ page }) => {
    await openSection(page);

    const rowOne = techSection(page).locator(".integration-marquee").first();
    const rowTwo = techSection(page).locator(".integration-marquee").nth(1);

    const rowBox = await rowOne.boundingBox();
    expect(rowBox).not.toBeNull();
    await page.mouse.move(rowBox!.x + rowBox!.width / 2, rowBox!.y + rowBox!.height / 2);
    await page.waitForTimeout(200);
    expect(await trackPlayStates(page)).toEqual(["paused", "running"]);

    await page.mouse.move(5, 5);
    await page.waitForTimeout(200);
    expect(await trackPlayStates(page)).toEqual(["running", "running"]);

    // Keyboard focus lands on the marquee group, which pauses both rows and
    // shows a visible focus ring.
    const button = pauseButton(page);
    await button.focus();
    await page.keyboard.press("Tab");

    const group = techSection(page).getByRole("group", { name: "Technology marquee" });
    await expect(group).toBeFocused();
    expect(await group.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    expect(await trackPlayStates(page)).toEqual(["paused", "paused"]);

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.waitForTimeout(200);
    expect(await trackPlayStates(page)).toEqual(["running", "running"]);

    // Guard the row locators against accidental re-ordering.
    await expect(rowOne).toHaveCount(1);
    await expect(rowTwo).toHaveCount(1);
  });
});

test.describe("technologies marquee — touch", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("touch users can pause and resume", async ({ page }) => {
    await openSection(page);

    const button = pauseButton(page);
    await button.tap();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    expect(await trackPlayStates(page)).toEqual(["paused", "paused"]);

    await button.tap();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    expect(await trackPlayStates(page)).toEqual(["running", "running"]);
  });
});

test.describe("technologies marquee — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders a static, non-duplicated layout", async ({ page }) => {
    await openSection(page);

    const tracks = techSection(page).locator(".integration-marquee__track");
    expect(
      await tracks.evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).animationName)
      )
    ).toEqual(["none", "none"]);

    await expect(
      techSection(page).getByRole("list", { name: ROW_ONE_LABEL }).getByRole("listitem")
    ).toHaveCount(ROW_ONE.length);
    await expect(
      techSection(page).getByRole("list", { name: ROW_TWO_LABEL }).getByRole("listitem")
    ).toHaveCount(ROW_TWO.length);

    // Only the unique pass is rendered in each row.
    const visible = await techSection(page)
      .locator("li")
      .evaluateAll((items) => items.filter((item) => item.getClientRects().length > 0).length);
    expect(visible).toBe(ROW_ONE.length + ROW_TWO.length);

    const button = techSection(page).getByRole("button");
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toContainText("Motion off");
  });
});

test.describe("technologies marquee — layout", () => {
  for (const viewport of VIEWPORTS) {
    test(`no horizontal overflow at ${viewport.label}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openSection(page);

      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
    });
  }

  test("keeps a seamless loop in both rows", async ({ page }) => {
    await openSection(page);

    const rows = await techSection(page)
      .locator(".integration-marquee")
      .evaluateAll((elements) =>
        elements.map((row) => {
          const copies = [...row.querySelectorAll<HTMLElement>(".integration-marquee__copy")];
          const primary = copies[0].querySelectorAll<HTMLElement>("li");
          const duplicate = copies[1].querySelectorAll<HTMLElement>("li");
          const internalGap =
            primary[1].getBoundingClientRect().left - primary[0].getBoundingClientRect().right;
          const seamGap =
            duplicate[0].getBoundingClientRect().left -
            primary[primary.length - 1].getBoundingClientRect().right;
          return {
            animation: getComputedStyle(row.querySelector<HTMLElement>(".integration-marquee__track")!)
              .animationName,
            copyWidth: copies[0].getBoundingClientRect().width,
            duplicateWidth: copies[1].getBoundingClientRect().width,
            internalGap,
            seamGap,
          };
        })
      );

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.animation).toBe("integration-marquee-x");
      expect(Math.abs(row.copyWidth - row.duplicateWidth)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(row.internalGap - row.seamGap)).toBeLessThanOrEqual(0.5);
    }
  });
});

/** Composite an alpha colour over its background and compute WCAG contrast. */
async function labelContrast(page: Page): Promise<number> {
  return page.evaluate(() => {
    const label = document.querySelector<HTMLElement>('[data-testid="tech-label"]')!;
    const section = document.querySelector<HTMLElement>(
      'section[aria-labelledby="technologies-heading"]'
    )!;
    const parse = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const foreground = parse(getComputedStyle(label).color);
    const background = parse(getComputedStyle(section).backgroundColor);
    const alpha = foreground.length === 4 ? foreground[3] : 1;
    const composite = foreground
      .slice(0, 3)
      .map((channel, index) => channel * alpha + background[index] * (1 - alpha));
    const luminance = ([red, green, blue]: number[]) => {
      const [r, g, b] = [red, green, blue].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const light = luminance(composite);
    const dark = luminance(background);
    return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
  });
}

test.describe("technologies marquee — theme contrast", () => {
  test("labels meet 4.5:1 in light and dark themes", async ({ page }) => {
    await openSection(page);

    expect(await labelContrast(page)).toBeGreaterThanOrEqual(4.5);

    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect
      .poll(() => labelContrast(page), { timeout: 5000 })
      .toBeGreaterThanOrEqual(4.5);
  });
});

test.describe("technologies marquee — runtime", () => {
  test("produces no console errors or failed asset requests", async ({ page }) => {
    const problems: string[] = [];
    const origin = new URL(process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:4173").origin;
    const sameOrigin = (url: string) => url.startsWith(origin);

    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("requestfailed", (request) => {
      if (sameOrigin(request.url()) && ["document", "script", "stylesheet", "image", "font"].includes(request.resourceType())) {
        problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`);
      }
    });
    page.on("response", (response) => {
      if (sameOrigin(response.url()) && response.status() >= 400) {
        problems.push(`http ${response.status()}: ${response.url()}`);
      }
    });

    await openSection(page);

    // Let the marquee and lazy work settle before judging.
    await page.waitForTimeout(1000);
    expect(problems).toEqual([]);
  });
});
