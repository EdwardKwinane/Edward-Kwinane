import { expect, gotoHome, rejectOptional, test } from "./helpers";

/**
 * Approved Phase 1 identity contract.
 *
 * These assertions run against the production bundle with no CMS configured,
 * so they pin the code-owned defaults. `sanity-reliability.spec.ts` separately
 * proves that a stale CMS document cannot overwrite them.
 */

const APPROVED = {
  eyebrow: "AI IMPLEMENTATION SPECIALIST",
  headline: "Turning AI opportunities into practical solutions.",
  paragraph:
    "I explore how artificial intelligence can solve real problems, improve workflows and support better ways of working. My approach brings together strategic thinking and technical execution — from identifying opportunities and designing solutions to building, integrating and validating them.",
  role: "AI Implementation Specialist",
  tagline:
    "AI strategy, engineering and integration from opportunity to implementation.",
  tags: ["Voice Agents", "RAG Systems", "AI Chatbots", "AI Agents", "Full-Stack"],
};

const ROUTES = ["/", "/about", "/capabilities", "/portfolio", "/blog", "/contact"];

test.describe("approved Phase 1 identity", () => {
  test("homepage hero uses the approved copy, tags and audience CTAs", async ({
    page,
  }) => {
    await gotoHome(page);
    await rejectOptional(page);

    // Hero copy is rendered from site settings, not hard-coded in the page, so
    // this also verifies the code-owned defaults are wired through the provider.
    await expect(page.getByText(APPROVED.eyebrow, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: APPROVED.headline })
    ).toBeVisible();
    await expect(page.getByText(APPROVED.paragraph)).toBeVisible();

    // Decision 4: leave the existing hero tags unchanged.
    const hero = page.locator("section").filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(hero).toHaveCount(1);
    await expect(hero.getByText(APPROVED.tags[0], { exact: true })).toBeVisible();
    const renderedTags = await hero
      .locator("span")
      .filter({ hasText: /^(Voice Agents|RAG Systems|AI Chatbots|AI Agents|Full-Stack)$/ })
      .allTextContents();
    expect(renderedTags).toEqual(APPROVED.tags);

    const businessCta = page.getByRole("link", {
      name: "Discuss an AI opportunity",
    });
    await expect(businessCta).toBeVisible();
    await expect(businessCta).toHaveAttribute("href", "/contact");

    const employerCta = page.getByRole("link", {
      name: "Explore my professional profile",
    });
    await expect(employerCta).toBeVisible();
    await expect(employerCta).toHaveAttribute("href", "/about");
  });

  for (const route of ROUTES) {
    test(`${route} keeps the global role and footer descriptor`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      await expect(page.locator("main#main")).toBeVisible();
      await rejectOptional(page);

      // Desktop navigation shows the role line below the owner name.
      await expect(
        page.locator("header").getByText(APPROVED.role, { exact: true })
      ).toBeVisible();

      const footer = page.locator("footer");
      await expect(footer).toHaveCount(1);
      await expect(footer.getByText(APPROVED.role, { exact: true })).toBeVisible();
      await expect(footer.getByText(APPROVED.tagline)).toBeVisible();
    });
  }

  test("no stale product-builder identity copy survives on the homepage", async ({
    page,
  }) => {
    await gotoHome(page);
    await rejectOptional(page);

    await expect(
      page.getByText("AI Engineer & Digital Architect", { exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByText("I build AI-native products from concept to production.", {
        exact: true,
      })
    ).toHaveCount(0);
    await expect(
      page.getByText("View my portfolio", { exact: true })
    ).toHaveCount(0);
    await expect(page.getByText("Let's build something", { exact: true })).toHaveCount(0);
  });
});
