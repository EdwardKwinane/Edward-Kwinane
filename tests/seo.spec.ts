import { test, expect } from "./helpers";

/**
 * Metadata assertions.
 *
 * `Seo.tsx` writes these client-side; `index.html` carries a static fallback for
 * crawlers that do not run JavaScript. These tests pin the runtime values, which
 * is what share previews and search engines read after hydration.
 */

const ROUTES = ["/", "/about", "/portfolio", "/capabilities", "/blog", "/contact"];

const EXPECTED: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Edward Kwinane | AI Implementation Specialist",
    description:
      "Explore Edward Kwinane's approach to AI implementation, connecting business opportunities with AI strategy, engineering, integration and practical solutions.",
  },
  "/about": {
    title: "About Edward Kwinane | AI Implementation Specialist",
    description:
      "Explore Edward Kwinane's approach to AI implementation, systems thinking and technical problem-solving.",
  },
  "/portfolio": {
    title: "Projects and AI Explorations | Edward Kwinane",
    description:
      "Projects, prototypes and implementation concepts, each presented with its actual status.",
  },
  "/capabilities": {
    title: "AI Implementation Capabilities | Edward Kwinane",
    description:
      "Areas of focus across AI opportunity, applications, workflow automation, integration, evaluation and optimisation.",
  },
  "/blog": {
    title: "AI Implementation Insights | Edward Kwinane",
    description:
      "Notes on AI implementation, architecture, integration, reliability and responsible adoption.",
  },
  "/contact": {
    title: "Contact Edward Kwinane | AI Implementation",
    description:
      "Discuss an AI opportunity or a professional enquiry with Edward Kwinane.",
  },
};

test.describe("social and search metadata", () => {
  for (const route of ROUTES) {
    test(`${route} exposes complete, absolute metadata`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      await expect(page.locator("main#main")).toBeVisible();
      // `Seo` writes the tags in an effect on mount; under parallel load that
      // effect can land after the shell is visible. Wait (auto-retrying) for
      // the canonical to exist so we snapshot a fully-written <head>.
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      // index.html now ships a canonical for every route, so the canonical's
      // presence alone no longer proves the Seo effect has run. Wait for the
      // route-specific title before snapshotting the hydrated <head>.
      await expect(page).toHaveTitle(EXPECTED[route].title);

      const meta = await page.evaluate(() => {
        const read = (selector: string) =>
          document.querySelector(selector)?.getAttribute("content") ?? null;
        return {
          title: document.title,
          description: read('meta[name="description"]'),
          canonical:
            document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
          ogTitle: read('meta[property="og:title"]'),
          ogDescription: read('meta[property="og:description"]'),
          ogType: read('meta[property="og:type"]'),
          ogUrl: read('meta[property="og:url"]'),
          ogImage: read('meta[property="og:image"]'),
          ogImageWidth: read('meta[property="og:image:width"]'),
          ogImageHeight: read('meta[property="og:image:height"]'),
          ogImageAlt: read('meta[property="og:image:alt"]'),
          twitterCard: read('meta[name="twitter:card"]'),
          twitterTitle: read('meta[name="twitter:title"]'),
          twitterDescription: read('meta[name="twitter:description"]'),
          twitterImage: read('meta[name="twitter:image"]'),
          twitterImageAlt: read('meta[name="twitter:image:alt"]'),
          canonicalCount: document.querySelectorAll('link[rel="canonical"]').length,
          structured: document.getElementById("structured-data")?.textContent ?? null,
        };
      });

      const origin = new URL(page.url()).origin;

      const expected = EXPECTED[route];
      expect(meta.title).toBe(expected.title);
      expect(meta.description).toBe(expected.description);
      expect(meta.canonicalCount).toBe(1);
      expect(meta.canonical).toBe(`${origin}${route}`);

      expect(meta.ogTitle).toBe(expected.title);
      expect(meta.ogDescription).toBe(expected.description);
      expect(meta.ogType).toBe("website");
      expect(meta.ogUrl).toBe(meta.canonical);

      // Share previews need an absolute URL; a relative path resolves against
      // the scraper's own origin and produces a broken card.
      expect(meta.ogImage).toBe(`${origin}/og-image.png`);
      expect(meta.ogImageWidth).toBe("1200");
      expect(meta.ogImageHeight).toBe("630");
      expect(meta.ogImageAlt).toBe(expected.title);
      expect(meta.twitterCard).toBe("summary_large_image");
      expect(meta.twitterTitle).toBe(expected.title);
      expect(meta.twitterDescription).toBe(expected.description);
      expect(meta.twitterImage).toBe(meta.ogImage);
      expect(meta.twitterImageAlt).toBe(expected.title);

      // Structured data must stay parseable and keep the owner's Person node.
      expect(meta.structured).not.toBeNull();
      const graph = JSON.parse(meta.structured!) as {
        "@context": string;
        "@graph": { "@type": string; name?: string }[];
      };
      expect(graph["@context"]).toBe("https://schema.org");
      expect(graph["@graph"].some((node) => node["@type"] === "Person")).toBe(true);
    });
  }

  test("navigating between routes updates the metadata instead of appending", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.locator('a[href="/about"]:visible').first().click();
    await expect(page).toHaveURL(/\/about$/);

    const after = await page.evaluate(() => ({
      canonical: document.querySelectorAll('link[rel="canonical"]').length,
      ogImage: document.querySelectorAll('meta[property="og:image"]').length,
      canonicalHref:
        document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      structured: document.querySelectorAll("#structured-data").length,
    }));

    expect(after.canonical).toBe(1);
    expect(after.ogImage).toBe(1);
    expect(after.structured).toBe(1);
    expect(after.canonicalHref).toBe(`${new URL(page.url()).origin}/about`);
  });
});
