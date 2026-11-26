import { test, expect, type BrowserContext } from "@playwright/test";

/**
 * First-paint layout-stability regression suite.
 *
 * Runs under playwright.sanity.config.ts, whose build has a fake Sanity project
 * ID. Every request is intercepted here, so no real CMS or external host is
 * contacted. The mocks deliberately reproduce the production ordering that
 * caused the shared footer CLS: site settings arrive while the lazy route
 * chunk is still in flight.
 */

const BASE = "http://localhost:4174";
const CORS = {
  "access-control-allow-origin": BASE,
  "access-control-allow-methods": "POST, OPTIONS, GET",
  "access-control-allow-headers": "*",
  "access-control-max-age": "86400",
};

const SITE_SETTINGS = {
  _id: "siteSettings",
  ownerName: "Edward Kwinane",
  roleLine: "AI Engineer · Digital Architect",
  footerTagline:
    "I build AI-native products from concept to production — voice agents, RAG systems, AI chatbots and full-stack applications.",
  footerText: "Designed & engineered with an AI-native workflow.",
  footerSignoff: "Concept → Architecture → Build → Ship",
  email: "edwardkwinane1@gmail.com",
  linkedinUrl: "https://www.linkedin.com/in/edward-kwinane",
  githubUrl: "https://github.com/edwardkwinane",
};

// Seven posts match the blog's seven-card skeleton, so this suite isolates
// layout shifts caused by first-paint chrome rather than by a cache miss.
const POSTS = Array.from({ length: 7 }, (_, index) => ({
  _id: `post-layout-${index}`,
  title: `Layout stability note ${index + 1}`,
  slug: `layout-stability-note-${index + 1}`,
  subtitle: "",
  category: "ENGINEERING",
  excerpt: "A stable placeholder used only by the layout stability suite.",
  author: "Edward Kwinane",
  featured: false,
  placeholder: true,
  estimatedReadingTime: 5,
  publishedAt: `2026-0${index + 1}-01T09:00:00.000Z`,
  tags: [],
  coverImage: null,
  seoImage: null,
}));

interface Metrics {
  cls: number;
  footerShifts: number;
}

interface MockOptions {
  holdSettings?: boolean;
  holdRouteChunk?: boolean;
  routeChunk?: string;
}

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

interface MockHandles {
  settingsRequested: Promise<void>;
  routeChunkRequested: Promise<void>;
  releaseSettings: () => void;
  releaseRouteChunk: () => void;
}

async function installMocks(
  context: BrowserContext,
  options: MockOptions,
): Promise<MockHandles> {
  // Gates are resolved immediately unless the test explicitly holds them, so
  // timing never depends on a worker's load.
  const settingsGate = deferred();
  const routeChunkGate = deferred();
  if (!options.holdSettings) settingsGate.resolve();
  if (!options.holdRouteChunk) routeChunkGate.resolve();

  const settingsRequested = deferred();
  const routeChunkRequested = deferred();

  // Nothing outside the preview server may be reached by this suite.
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url) ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return route.continue();
    }
    return route.abort();
  });

  if (options.routeChunk) {
    const chunk = options.routeChunk;
    await context.route("**/assets/*.js", async (route) => {
      const file = new URL(route.request().url()).pathname.split("/").pop() ?? "";
      if (file.startsWith(chunk)) {
        routeChunkRequested.resolve();
        await routeChunkGate.promise;
      }
      return route.continue();
    });
  }

  await context.route("**apicdn.sanity.io/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    let query = "";
    try {
      const request = route.request();
      query =
        request.method() === "POST"
          ? ((request.postDataJSON() ?? {}) as { query?: string }).query ?? ""
          : new URL(request.url()).searchParams.get("query") ?? "";
    } catch {
      /* leave the query empty; the fallback result is correct for it */
    }
    const q = String(query);
    const isSettings = q.includes('_type == "siteSettings"');
    if (isSettings) {
      settingsRequested.resolve();
      await settingsGate.promise;
    }
    const isPostList = q.includes('*[_type == "post"') && !q.includes("slug.current == $slug");
    const result = isSettings ? SITE_SETTINGS : isPostList ? POSTS : [];
    return route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", ...CORS },
      body: JSON.stringify({ result }),
    });
  });

  return {
    settingsRequested: settingsRequested.promise,
    routeChunkRequested: routeChunkRequested.promise,
    releaseSettings: settingsGate.resolve,
    releaseRouteChunk: routeChunkGate.resolve,
  };
}

async function installClsRecorder(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const metrics: Metrics = { cls: 0, footerShifts: 0 };
    (window as unknown as { __layoutMetrics: Metrics }).__layoutMetrics = metrics;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        metrics.cls += entry.value;
        for (const source of entry.sources ?? []) {
          if (source.node?.tagName === "FOOTER") metrics.footerShifts += entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

const cases = [
  { route: "/", chunk: "Home-", viewport: { width: 1440, height: 900 } },
  { route: "/about", chunk: "About-", viewport: { width: 1440, height: 900 } },
  { route: "/blog", chunk: "Blog-", viewport: { width: 1440, height: 900 } },
  { route: "/", chunk: "Home-", viewport: { width: 390, height: 844 } },
  { route: "/about", chunk: "About-", viewport: { width: 390, height: 844 } },
  { route: "/blog", chunk: "Blog-", viewport: { width: 390, height: 844 } },
] as const;

test.describe("first-paint layout stability", () => {
  for (const { route, chunk, viewport } of cases) {
    test(`${route} at ${viewport.width}px keeps the footer out of the lazy-route fallback`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport });
      const mocks = await installMocks(context, {
        holdSettings: true,
        holdRouteChunk: true,
        routeChunk: chunk,
      });
      await installClsRecorder(context);
      const page = await context.newPage();

      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await Promise.all([mocks.settingsRequested, mocks.routeChunkRequested]);
      await expect(page.locator("main#main")).toBeVisible();
      // Production ordering: CMS settings land while the lazy route chunk is
      // still in flight. The footer must not be painted against the fallback.
      await expect(page.locator("footer")).toHaveCount(0);
      mocks.releaseSettings();
      await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(0);

      mocks.releaseRouteChunk();
      await expect(page.locator("footer")).toBeVisible();
      await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(1);

      const metrics = await page.evaluate(
        () => (window as unknown as { __layoutMetrics?: Metrics }).__layoutMetrics
      );
      expect(metrics?.footerShifts ?? 1).toBe(0);
      await context.close();
    });
  }

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`late CMS email does not change footer height at ${viewport.width}px`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport });
      const mocks = await installMocks(context, { holdSettings: true });
      await installClsRecorder(context);
      const page = await context.newPage();

      await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
      await mocks.settingsRequested;
      await expect(page.locator("footer")).toBeVisible();
      const before = await page.evaluate(() => {
        const rect = document.querySelector("footer")!.getBoundingClientRect();
        return {
          height: Math.round(rect.height),
          mailtoCount: document.querySelectorAll('footer a[href^="mailto:"]').length,
          contactText: [...document.querySelectorAll("footer a")]
            .map((a) => a.textContent?.trim() ?? "")
            .find((text) => text === "Contact me"),
        };
      });
      expect(before.mailtoCount).toBe(0);
      expect(before.contactText).toBe("Contact me");

      mocks.releaseSettings();
      await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(1);
      const after = await page.evaluate(() => {
        const rect = document.querySelector("footer")!.getBoundingClientRect();
        return {
          height: Math.round(rect.height),
          footerShifts:
            (window as unknown as { __layoutMetrics?: Metrics }).__layoutMetrics?.footerShifts ??
            1,
        };
      });
      expect(after.height).toBe(before.height);
      expect(after.footerShifts).toBe(0);
      await context.close();
    });
  }
});
