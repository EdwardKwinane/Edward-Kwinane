import { expect, gotoHome, rejectOptional, test } from "./helpers";

/**
 * Responsive, theme and accessibility stability for the approved identity.
 *
 * No form is submitted and no CMS is contacted: the assertions only inspect the
 * rendered shell, navigation, hero and footer at each required viewport.
 */

const VIEWPORTS = [
  { width: 1440, height: 900, label: "1440x900" },
  { width: 1024, height: 768, label: "1024x768" },
  { width: 390, height: 844, label: "390x844" },
  { width: 375, height: 812, label: "375x812" },
] as const;

const THEMES = ["light", "dark"] as const;

const HEADLINE = "Turning AI opportunities into practical solutions.";
const ROLE = "AI Implementation Specialist";
const TAGLINE =
  "AI strategy, engineering and integration from opportunity to implementation.";

test.describe("responsive identity stability", () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${viewport.label} in ${theme} keeps the hero, navigation and footer stable`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript((value) => {
          try {
            localStorage.setItem("ek-theme", value);
          } catch {
            /* private mode */
          }
        }, theme);

        await gotoHome(page);
        await rejectOptional(page);

        const isDark = await page.evaluate(() =>
          document.documentElement.classList.contains("dark")
        );
        expect(isDark).toBe(theme === "dark");

        await expect(
          page.getByRole("heading", { level: 1, name: HEADLINE })
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Discuss an AI opportunity" })
        ).toHaveAttribute("href", "/contact");
        await expect(
          page.getByRole("link", { name: "Explore my professional profile" })
        ).toHaveAttribute("href", "/about");

        // The desktop pill shows the role line; the mobile sheet keeps it in
        // the DOM but intentionally hides it until the menu is opened.
        const navRole = page.locator("header").getByText(ROLE, { exact: true });
        if (viewport.width >= 1024) {
          await expect(navRole).toBeVisible();
        } else {
          await expect(navRole).toHaveCount(1);
        }

        const footer = page.locator("footer");
        await expect(footer).toHaveCount(1);
        await expect(footer.getByText(ROLE, { exact: true })).toBeVisible();
        await expect(footer.getByText(TAGLINE)).toBeVisible();
        await expect(footer.locator("nav a")).toHaveCount(6);
        await expect(
          footer.getByRole("button", { name: "Cookie settings" })
        ).toBeVisible();

        const snapshot = await page.evaluate(() => ({
          h1: document.querySelectorAll("h1").length,
          imagesWithoutAlt: [...document.images].filter(
            (img) => !img.hasAttribute("alt")
          ).length,
          emptyLinks: [...document.querySelectorAll("a")].filter(
            (a) => !a.textContent?.trim() && !a.getAttribute("aria-label")
          ).length,
          placeholderLinks: [...document.querySelectorAll('a[href="#"]')].length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        expect(snapshot.h1).toBe(1);
        expect(snapshot.imagesWithoutAlt).toBe(0);
        expect(snapshot.emptyLinks).toBe(0);
        expect(snapshot.placeholderLinks).toBe(0);
        expect(snapshot.scrollWidth).toBeLessThanOrEqual(snapshot.clientWidth + 1);
      });
    }
  }
});
