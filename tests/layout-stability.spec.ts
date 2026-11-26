import { test, expect, type BrowserContext, type Page } from "@playwright/test";

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

// The observed post-fix CLS is ~0.0007 or lower. 0.01 is an order of magnitude
// below the "good" Core Web Vitals threshold and far below the reproduced
// original footer jump (~0.44–0.51), so it is a meaningful regression gate.
const CLS_LIMIT = 0.01;

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;
const THEMES = ["light", "dark"] as const;

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

interface FooterGeometry {
  top: number;
  height: number;
  footerCount: number;
  mailtoCount: number;
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

async function installTheme(
  context: BrowserContext,
  theme: (typeof THEMES)[number],
): Promise<void> {
  await context.addInitScript((value) => {
    try {
      localStorage.setItem("ek-theme", value);
    } catch {
      /* private mode */
    }
  }, theme);
}

/**
 * The consent banner is unrelated first-paint chrome, and its library moves
 * keyboard focus to itself when it appears. Give every context a saved,
 * already-answered choice so these tests isolate footer behaviour and CLS.
 */
async function suppressConsentBanner(context: BrowserContext): Promise<void> {
  const now = new Date().toISOString();
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("ek-cc-banner-dismissed", "1");
    } catch {
      /* private mode */
    }
  });
  await context.addCookies([
    {
      name: "cc_cookie",
      value: encodeURIComponent(
        JSON.stringify({
          categories: ["necessary"],
          revision: 1,
          data: null,
          consentTimestamp: now,
          consentId: "layout-stability-test",
          services: {},
          languageCode: "en",
          lastConsentTimestamp: now,
        }),
      ),
      url: BASE,
      sameSite: "Lax",
    },
  ]);
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
  await suppressConsentBanner(context);
  await context.addInitScript(() => {
    type ShiftEntry = PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
      sources?: Array<{ node?: Node | null }>;
    };

    const metrics: Metrics = { cls: 0, footerShifts: 0 };
    const record = (entries: readonly ShiftEntry[]): void => {
      for (const entry of entries) {
        if (entry.hadRecentInput) continue;
        metrics.cls += entry.value;
        // Count the whole entry once if any source is the footer or a child,
        // rather than double-counting multiple footer descendants.
        const footerRelated = (entry.sources ?? []).some((source) => {
          const node = source.node;
          return node instanceof Element && node.closest("footer") !== null;
        });
        if (footerRelated) metrics.footerShifts += entry.value;
      }
    };

    const observer = new PerformanceObserver((list) => {
      record(list.getEntries() as ShiftEntry[]);
    });
    observer.observe({ type: "layout-shift", buffered: true });

    // PerformanceObserver callbacks are async. takeRecords() lets assertions
    // synchronously collect anything still queued at the measurement point.
    (window as unknown as { __flushLayoutMetrics?: () => Metrics }).__flushLayoutMetrics = () => {
      record(observer.takeRecords() as ShiftEntry[]);
      return { ...metrics };
    };
  });
}

async function readLayoutMetrics(page: Page): Promise<Metrics> {
  // Deterministic checkpoint: fonts settle, then one browser animation frame
  // lets any queued layout-shift records reach the observer.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  return page.evaluate(
    () =>
      (window as unknown as { __flushLayoutMetrics?: () => Metrics }).__flushLayoutMetrics?.() ?? {
        cls: 1,
        footerShifts: 1,
      },
  );
}

function assertStable(metrics: Metrics): void {
  expect(metrics.footerShifts).toBe(0);
  expect(metrics.cls).toBeLessThan(CLS_LIMIT);
}

async function footerGeometry(page: Page): Promise<FooterGeometry> {
  return page.evaluate(() => {
    const footer = document.querySelector("footer");
    const rect = footer?.getBoundingClientRect();
    return {
      // Document-space top: focusing a link and tabbing away can scroll the
      // viewport, which must not be mistaken for a footer layout shift.
      top: rect ? Math.round(rect.y + window.scrollY) : -1,
      height: rect ? Math.round(rect.height) : -1,
      footerCount: document.querySelectorAll("footer").length,
      mailtoCount: document.querySelectorAll('footer a[href^="mailto:"]').length,
    };
  });
}

const cases = [
  { route: "/", chunk: "Home-" },
  { route: "/about", chunk: "About-" },
  { route: "/blog", chunk: "Blog-" },
] as const;

test.describe("first-paint layout stability", () => {
  for (const { route, chunk } of cases) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`${route} at ${viewport.width}px in ${theme} keeps the footer out of the lazy-route fallback`, async ({
          browser,
        }) => {
          const context = await browser.newContext({ viewport });
          await installTheme(context, theme);
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
          await expect(page.locator("footer")).toHaveCount(0);

          mocks.releaseRouteChunk();
          await expect(page.locator("footer")).toBeVisible();
          await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(1);

          assertStable(await readLayoutMetrics(page));
          await context.close();
        });
      }
    }
  }

  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`late CMS email preserves footer geometry at ${viewport.width}px in ${theme}`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ viewport });
        await installTheme(context, theme);
        const mocks = await installMocks(context, { holdSettings: true });
        await installClsRecorder(context);
        const page = await context.newPage();

        await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
        await mocks.settingsRequested;
        await expect(page.locator("footer")).toBeVisible();

        const fallbackLink = page.locator('footer a[href="/contact"]', { hasText: "Contact me" });
        await expect(fallbackLink).toBeVisible();
        const before = await footerGeometry(page);
        expect(before.footerCount).toBe(1);
        expect(before.mailtoCount).toBe(0);

        mocks.releaseSettings();
        await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(1);
        await expect(fallbackLink).toHaveCount(0);

        const after = await footerGeometry(page);
        expect(after.top).toBe(before.top);
        expect(after.height).toBe(before.height);
        assertStable(await readLayoutMetrics(page));
        await context.close();
      });
    }
  }

  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`focused contact link is not swapped before blur at ${viewport.width}px in ${theme}`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ viewport });
        await installTheme(context, theme);
        const mocks = await installMocks(context, { holdSettings: true });
        await installClsRecorder(context);
        const page = await context.newPage();

        await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
        await mocks.settingsRequested;
        await expect(page.locator("footer")).toBeVisible();

        const fallbackLink = page.locator('footer a[href="/contact"]', { hasText: "Contact me" });
        await fallbackLink.focus();
        const before = await footerGeometry(page);

        mocks.releaseSettings();
        await expect(page.locator("footer [data-contact-status]")).toHaveText(
          "Email contact option is now available; it will replace the contact link after this link loses focus.",
        );

        // Focused link keeps its destination and accessible name until blur.
        await expect(fallbackLink).toBeFocused();
        await expect(fallbackLink).toHaveAttribute("href", "/contact");
        await expect(fallbackLink).toHaveText("Contact me");
        const during = await footerGeometry(page);
        expect(during.top).toBe(before.top);
        expect(during.height).toBe(before.height);

        await page.keyboard.press("Tab");
        await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(1);
        const activeHref = await page.evaluate(
          () => document.activeElement?.getAttribute("href") ?? null,
        );
        expect(activeHref).not.toBe("/contact");

        const after = await footerGeometry(page);
        expect(after.top).toBe(before.top);
        expect(after.height).toBe(before.height);
        assertStable(await readLayoutMetrics(page));
        await context.close();
      });
    }
  }

  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`footer stays mounted and focused during SPA navigation at ${viewport.width}px in ${theme}`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ viewport });
        await installTheme(context, theme);
        const mocks = await installMocks(context, {
          holdRouteChunk: true,
          routeChunk: "About-",
        });
        await installClsRecorder(context);
        const page = await context.newPage();

        await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
        await expect(page.locator("footer")).toBeVisible();

        const aboutLink = page.locator('footer nav[aria-label="Footer"] a[href="/about"]');
        await aboutLink.focus();
        await aboutLink.press("Enter");
        await mocks.routeChunkRequested;

        await expect(page).toHaveURL(`${BASE}/about`);
        await expect(page.locator('[role="status"][aria-label="Loading page"]')).toHaveCount(1);
        await expect(page.locator("footer")).toBeVisible();
        await expect(aboutLink).toBeFocused();
        const during = await footerGeometry(page);
        expect(during.footerCount).toBe(1);

        mocks.releaseRouteChunk();
        await expect(page.locator('[role="status"][aria-label="Loading page"]')).toHaveCount(0);
        await expect(page.locator("footer")).toBeVisible();
        await expect(aboutLink).toBeFocused();

        assertStable(await readLayoutMetrics(page));
        await context.close();
      });
    }
  }
});
