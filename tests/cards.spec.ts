import { test, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Card system suite (PR-C).
 *
 * Guards the shared card language introduced with the Process-section rework:
 * image-led cards render the CMS cover (or the navy monogram fallback), the
 * whole card stays a single keyboard-reachable link, hover/focus affordances
 * come from the shared `SurfaceCard` interactive treatment, text contrast is
 * theme-safe and prefers-reduced-motion disables the hover lift.
 *
 * The build is the same fake `reliability-test` project used by the
 * reliability suite, and every CMS request is intercepted here — no real
 * Sanity backend is contacted.
 */

const BASE = "http://localhost:4174";

const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AvwA//9k=",
  "base64"
);

const CORS = {
  "access-control-allow-origin": BASE,
  "access-control-allow-methods": "POST, OPTIONS, GET",
  "access-control-allow-headers": "*",
  "access-control-max-age": "86400",
};

const coverImage = (id: string, alt: string) => ({
  _type: "image",
  asset: { _ref: `image-${id}-2000x1200-jpg`, _type: "reference" },
  alt,
});

const PROJECTS = [
  {
    _id: "p-voice",
    title: "AI Voice Agent",
    slug: "ai-voice-agent",
    category: "VOICE",
    categories: ["VOICE", "AI"],
    status: "PLACEHOLDER",
    featured: true,
    description: "A real-time conversational voice system built to a template.",
    coverImage: coverImage("aaa111", "Circuit board macro"),
    technologies: ["WebRTC", "STT"],
    shortDescription: "A real-time conversational voice system built to a template.",
  },
  {
    _id: "p-rag",
    title: "Intelligent RAG Platform",
    slug: "intelligent-rag-platform",
    category: "RAG",
    categories: ["RAG", "AI"],
    status: "IN PRODUCTION",
    featured: true,
    description: "Retrieval-augmented generation grounded in private knowledge.",
    coverImage: coverImage("bbb222", "Team reviewing the architecture"),
    technologies: ["Python", "pgvector"],
    shortDescription: "Retrieval-augmented generation grounded in private knowledge.",
  },
  {
    _id: "p-chatbot",
    title: "AI Chatbot Product",
    slug: "ai-chatbot-product",
    category: "CHATBOTS",
    categories: ["CHATBOTS", "AI"],
    status: "SHIPPED",
    featured: false,
    description: "A context-aware conversational product for support and sales.",
    technologies: ["Next.js", "OpenAI"],
    shortDescription: "A context-aware conversational product for support and sales.",
  },
];

const SUMMARY = ({ coverImage: _c, ...rest }: Record<string, unknown>) => rest;

const POSTS = [
  {
    _id: "post-rag",
    title: "Building Reliable RAG Pipelines",
    slug: "building-reliable-rag-pipelines",
    subtitle: "Retrieval quality decides answer quality.",
    category: "RAG",
    excerpt: "Most RAG failures are retrieval failures, not model failures.",
    author: "Edward Kwinane",
    publishedAt: "2026-06-22",
    estimatedReadingTime: 8,
    featured: false,
    placeholder: true,
    tags: ["rag"],
    coverImage: coverImage("ccc333", "Server room corridor"),
  },
];

const CAPABILITIES = [
  {
    _id: "cap-voice",
    name: "AI Voice Agents",
    slug: "voice-agents",
    index: "01",
    eyebrow: "CAPABILITY 01 — VOICE AGENTS",
    headline: "Voice interfaces that feel natural.",
    shortDescription: "Real-time conversational systems that understand context.",
    description: "Real-time conversational systems that understand context.",
    labels: ["LISTENING", "THINKING"],
    previewLabels: ["VOICE SYSTEMS", "REAL-TIME"],
    flow: [{ step: "LISTENING", detail: "Speech-to-text with interruption handling" }],
    featured: true,
    displayOrder: 1,
  },
];

/* Query predicates (GROQ text is stable; match on the slug-filter, not the
   projection — every project/post query includes `slug.current`). */
const isProjectDetail = (q: string) =>
  q.includes('*[_type == "project"') && q.includes("slug.current == $slug");
const isProjectList = (q: string) => q.includes('*[_type == "project"') && !isProjectDetail(q);
const isPostDetail = (q: string) =>
  q.includes('*[_type == "post"') && q.includes("slug.current == $slug");
const isPostList = (q: string) => q.includes('*[_type == "post"') && !isPostDetail(q);

function dispatch(query: string) {
  const q = String(query ?? "");
  if (isProjectList(q)) return { result: PROJECTS };
  if (isProjectDetail(q)) return { result: { ...PROJECTS[0], related: [SUMMARY(PROJECTS[1])] } };
  if (isPostList(q)) return { result: POSTS };
  if (isPostDetail(q)) return { result: { ...POSTS[0], body: [], related: [] } };
  if (q.includes('*[_type == "capability"')) return { result: CAPABILITIES };
  if (q.includes('_type == "siteSettings"')) return { result: {} };
  return { result: [] };
}

async function mockSanity(context: BrowserContext) {
  // The app must only ever reach the preview server under test.
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
      return route.continue();
    }
    return route.abort();
  });
  await context.route("**apicdn.sanity.io/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    let query = "";
    try {
      const req = route.request();
      if (req.method() === "POST") query = (req.postDataJSON() ?? {}).query ?? "";
      else query = new URL(req.url()).searchParams.get("query") ?? "";
    } catch {
      /* leave empty */
    }
    const { result } = dispatch(query);
    return route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", ...CORS },
      body: JSON.stringify({ result }),
    });
  });
  await context.route("https://cdn.sanity.io/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: TINY_JPEG })
  );
}

async function dismissConsent(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const necessary = page.locator('.cm button[data-role="necessary"]');
  if (await necessary.isVisible().catch(() => false)) {
    await necessary.click().catch(() => undefined);
  }
}

const parseRgb = (value: string): [number, number, number] => {
  const m = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) throw new Error(`Unparseable color: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const luminance = ([r, g, b]: [number, number, number]) => {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: string, b: string) => {
  const la = luminance(parseRgb(a));
  const lb = luminance(parseRgb(b));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

test.describe("card system", () => {
  test("portfolio cards render CMS covers, fall back to monograms, and link to their detail pages", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await page.goto("/portfolio", { waitUntil: "domcontentloaded" });

    const voice = page.locator('a[href="/portfolio/ai-voice-agent"]').first();
    await expect(voice).toBeVisible();
    await expect(voice.locator("img").first()).toBeVisible();

    const chatbot = page.locator('a[href="/portfolio/ai-chatbot-product"]').first();
    await expect(chatbot).toBeVisible();
    await expect(chatbot.locator("img")).toHaveCount(0);

    await voice.click();
    await expect(page).toHaveURL(/\/portfolio\/ai-voice-agent$/);
    await context.close();
  });

  test("hover emphasises the card and keyboard focus draws a visible outline (light and dark)", async ({
    browser,
  }) => {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext();
      await context.addInitScript((t) => {
        try {
          localStorage.setItem("ek-theme", t);
        } catch {
          /* storage unavailable */
        }
      }, theme);
      await mockSanity(context);
      const page = await context.newPage();
      await dismissConsent(page);
      await page.goto("/portfolio", { waitUntil: "domcontentloaded" });

      const card = page.locator('a[href="/portfolio/ai-voice-agent"]').first();
      await expect(card).toBeVisible();

      const title = card.locator("h3, h2").first();
      const before = await title.evaluate((el) => getComputedStyle(el).color);
      // Derive the intended hover colour from the active theme rather than a
      // literal, so the assertion follows the light/dark accent variables.
      const hoverColor = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--accent-dark)";
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      expect(before, `card title starts at the theme heading colour in ${theme} mode`).not.toBe(hoverColor);

      await card.hover();
      // The title transitions its colour for 300ms (200ms while ThemeProvider
      // applies `theme-switching`), so a single read immediately after hover
      // can still return the pre-hover value. Poll the settled colour instead.
      await expect
        .poll(() => title.evaluate((el) => getComputedStyle(el).color), {
          message: `hover should restyle the title in ${theme} mode`,
        })
        .toBe(hoverColor);

      // Tab from the top of the document until a portfolio card link holds focus —
      // this exercises the real keyboard path instead of a synthetic .focus().
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      let focused = false;
      for (let i = 0; i < 40 && !focused; i += 1) {
        await page.keyboard.press("Tab");
        focused = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.tagName === "A" && (el as HTMLAnchorElement).getAttribute("href")?.startsWith("/portfolio/") === true;
        });
      }
      expect(focused, `portfolio card should be reachable by keyboard in ${theme} mode`).toBe(true);
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        return { width: style.outlineWidth, style: style.outlineStyle };
      });
      expect(outline.style).not.toBe("none");
      expect(parseFloat(outline.width)).toBeGreaterThan(0);
      await context.close();
    }
  });

  test("card text keeps readable contrast in both themes", async ({ browser }) => {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext();
      await context.addInitScript((t) => {
        try {
          localStorage.setItem("ek-theme", t);
        } catch {
          /* storage unavailable */
        }
      }, theme);
      await mockSanity(context);
      const page = await context.newPage();
      await dismissConsent(page);
      await page.goto("/portfolio", { waitUntil: "domcontentloaded" });

      const card = page.locator('a[href="/portfolio/ai-voice-agent"]').first();
      await expect(card).toBeVisible();
      const { fg, bg } = await card.evaluate((el) => {
        const shell = el as HTMLElement;
        const text = shell.querySelector("h3, h2") as HTMLElement;
        return {
          fg: getComputedStyle(text).color,
          bg: getComputedStyle(shell).backgroundColor,
        };
      });
      expect(
        contrast(fg, bg),
        `card title contrast in ${theme} mode`
      ).toBeGreaterThanOrEqual(4.5);
      await context.close();
    }
  });

  test("prefers-reduced-motion disables the hover lift", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await page.goto("/portfolio", { waitUntil: "domcontentloaded" });
    const card = page.locator('a[href="/portfolio/ai-voice-agent"]').first();
    await expect(card).toBeVisible();
    await card.hover();
    const transform = await card.evaluate((el) => getComputedStyle(el).transform);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    await context.close();
  });

  test("blog featured card links to the article and shows its cover image", async ({ browser }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await page.goto("/blog", { waitUntil: "domcontentloaded" });
    const article = page.locator('a[href="/blog/building-reliable-rag-pipelines"]').first();
    await expect(article).toBeVisible();
    await expect(article.locator("img").first()).toBeVisible();
    await article.click();
    await expect(page).toHaveURL(/\/blog\/building-reliable-rag-pipelines$/);
    await context.close();
  });

  test("home capability cards link to the capabilities page", async ({ browser }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const capability = page.locator('a[href="/capabilities"]').first();
    await expect(capability).toBeVisible();
    await capability.click();
    await expect(page).toHaveURL(/\/capabilities$/);
    await context.close();
  });

  test("about page renders the shared shell and contains no legacy glass styles", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main")).toBeVisible();
    const glassCount = await page.locator('[class*="glass-"]').count();
    expect(glassCount).toBe(0);
    await context.close();
  });

  test("no horizontal overflow at 390px on the card-heavy routes", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    for (const route of ["/", "/portfolio", "/blog", "/about", "/contact", "/capabilities"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
    }
    await context.close();
  });
});
