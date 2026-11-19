import { test, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Blog index suite.
 *
 * Guards the redesigned `/blog` listing: editorial header, category tabs
 * derived from published posts, free-text search, both filters combined, the
 * no-results state, card navigation, cover/fallback rendering and mobile
 * layout. Every CMS request is intercepted here — the suite never contacts a
 * real Sanity dataset, and the fixture copy mirrors the seeded articles in
 * `src/data/blog.ts` (all still marked `placeholder`).
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

const POSTS = [
  {
    _id: "post-arch",
    title: "Why Architecture Still Matters in the AI Era",
    slug: "why-architecture-still-matters-in-the-ai-era",
    subtitle: "AI makes building faster. It does not make thinking unnecessary.",
    category: "SYSTEM DESIGN",
    excerpt:
      "AI removes implementation friction, which raises the value of decisions made before the first line of code.",
    author: "Edward Kwinane",
    featured: true,
    placeholder: true,
    estimatedReadingTime: 6,
    publishedAt: "2026-07-14T09:00:00.000Z",
    tags: ["system design", "architecture"],
    coverImage: coverImage("arch01", "Blueprint sketch on a desk"),
  },
  {
    _id: "post-rag",
    title: "Building Reliable RAG Pipelines",
    slug: "building-reliable-rag-pipelines",
    subtitle: "Retrieval quality decides answer quality.",
    category: "RAG",
    excerpt:
      "Most RAG failures are retrieval failures, not model failures. Notes on chunking, embeddings and evaluation.",
    author: "Edward Kwinane",
    featured: false,
    placeholder: true,
    estimatedReadingTime: 8,
    publishedAt: "2026-06-22T09:00:00.000Z",
    tags: ["rag", "retrieval", "embeddings"],
    // Deliberately malformed asset ref: a bad CMS image must degrade to the
    // no-cover fallback instead of failing the listing (see safeImageUrl).
    coverImage: {
      _type: "image",
      asset: { _ref: "image-not-a-real-ref", _type: "reference" },
      alt: "Unusable cover",
    },
  },
  {
    _id: "post-flow",
    title: "From Idea to Production: An AI-Native Build Flow",
    slug: "from-idea-to-production",
    subtitle: "A repeatable sequence for turning an ambiguous idea into a deployed system.",
    category: "AI ENGINEERING",
    excerpt:
      "Ideas are cheap; production systems are expensive. A practical workflow for moving an AI product from concept to deployed reality.",
    author: "Edward Kwinane",
    featured: false,
    placeholder: true,
    estimatedReadingTime: 7,
    publishedAt: "2026-05-30T09:00:00.000Z",
    tags: ["workflow", "production"],
    coverImage: null,
  },
  {
    _id: "post-voice",
    title: "Voice Agents Need Orchestration",
    slug: "voice-agents-need-orchestration",
    subtitle: "Latency is a feature.",
    category: "VOICE AI",
    excerpt:
      "Real-time voice is unforgiving: every stage adds latency and every drop in quality is felt immediately.",
    author: "Edward Kwinane",
    featured: false,
    placeholder: true,
    estimatedReadingTime: 5,
    publishedAt: "2026-04-18T09:00:00.000Z",
    tags: ["voice", "latency"],
    coverImage: null,
  },
  {
    _id: "post-agents",
    title: "Agents with Guardrails",
    slug: "agents-with-guardrails",
    subtitle: "Autonomy without boundaries is just a bug with a plan.",
    category: "AGENTS",
    excerpt:
      "Agent loops only ship when their boundaries are explicit. On tool catalogues and human-in-the-loop checks.",
    author: "Edward Kwinane",
    featured: false,
    placeholder: true,
    estimatedReadingTime: 6,
    publishedAt: "2026-03-09T09:00:00.000Z",
    tags: ["agents", "guardrails"],
    coverImage: null,
  },
  {
    _id: "post-fullstack",
    title: "Full-Stack with AI Layers",
    slug: "full-stack-with-ai-layers",
    subtitle: "Where AI belongs in a product, and where it should not go.",
    category: "FULL-STACK",
    excerpt:
      "AI inside a product works best when it behaves like a service boundary inside a conventional stack.",
    author: "Edward Kwinane",
    featured: false,
    placeholder: true,
    estimatedReadingTime: 5,
    publishedAt: "2026-02-14T09:00:00.000Z",
    tags: ["full-stack", "architecture"],
    coverImage: null,
  },
];

const isPostList = (q: string) =>
  q.includes('*[_type == "post"') && !q.includes("slug.current == $slug");

function dispatch(query: string) {
  const q = String(query ?? "");
  if (isPostList(q)) return { result: POSTS };
  if (q.includes('_type == "post"')) return { result: { ...POSTS[0], body: [], related: [] } };
  if (q.includes('_type == "siteSettings"')) return { result: {} };
  return { result: [] };
}

async function mockSanity(context: BrowserContext) {
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
  await context.route("**apicdn.sanity.io/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    let query = "";
    try {
      const request = route.request();
      if (request.method() === "POST") query = (request.postDataJSON() ?? {}).query ?? "";
      else query = new URL(request.url()).searchParams.get("query") ?? "";
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

async function openBlog(page: Page) {
  await page.goto("/blog", { waitUntil: "domcontentloaded" });
  const section = page.locator('section[aria-label="Blog articles"]');
  await expect(section).toBeVisible();
  // The listing is rendered once the mocked CMS response lands.
  await expect(page.getByRole("tab", { name: "All" })).toBeVisible();
  return section;
}

function cards(page: Page) {
  return page.locator('section[aria-label="Blog articles"] a[href^="/blog/"]');
}

test.describe("blog index", () => {
  test("renders the editorial header, CMS posts and a tab per published category", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await openBlog(page);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Building, thinking and learning in public."
    );
    await expect(page.locator("p.eyebrow").first()).toHaveText("Blog");

    // One card per published post, titles marked up as headings.
    await expect(cards(page)).toHaveCount(POSTS.length);
    await expect(
      page.getByRole("heading", { level: 2, name: "Building Reliable RAG Pipelines" })
    ).toBeVisible();

    // Tablist starts with "All" and derives the rest from the CMS posts.
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(7);
    await expect(tabs.first()).toHaveText("All");
    await expect(page.getByRole("tab", { name: "RAG", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "VOICE AI", exact: true })).toBeVisible();
    await expect(page.getByText("6 articles")).toBeVisible();

    await context.close();
  });

  test("category tabs filter the grid and report the visible count", async ({ browser }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await openBlog(page);

    await page.getByRole("tab", { name: "VOICE AI", exact: true }).click();

    await expect(cards(page)).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 2, name: "Voice Agents Need Orchestration" })
    ).toBeVisible();
    await expect(page.getByText("Showing 1 of 6 articles")).toBeVisible();
    await expect(page.getByRole("tab", { name: "VOICE AI", exact: true })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await page.getByRole("tab", { name: "All" }).click();
    await expect(cards(page)).toHaveCount(POSTS.length);
    await context.close();
  });

  test("search matches titles and authors, and combines with the category filter", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await openBlog(page);

    const search = page.getByLabel("Search articles");
    await search.fill("guardrails");
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: "Agents with Guardrails" })).toBeVisible();

    await search.fill("edward");
    await expect(cards(page)).toHaveCount(POSTS.length);

    // Both filters apply at once: FULL-STACK has no RAG article.
    await page.getByRole("tab", { name: "FULL-STACK", exact: true }).click();
    await search.fill("rag");
    await expect(cards(page)).toHaveCount(0);
    await expect(page.getByText("No articles match your search")).toBeVisible();
    await expect(page.getByText("Showing 0 of 6 articles")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(cards(page)).toHaveCount(POSTS.length);
    await expect(search).toHaveValue("");
    await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");

    await context.close();
  });

  test("category tabs support arrow-key navigation", async ({ browser }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await openBlog(page);

    const all = page.getByRole("tab", { name: "All" });
    await all.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "AI ENGINEERING" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "AI ENGINEERING" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "SYSTEM DESIGN" })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(page.getByRole("tab", { name: "All" })).toBeFocused();

    await context.close();
  });

  test("cards navigate to the article and covers fall back without layout gaps", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    const section = await openBlog(page);

    const withCover = section.locator('a[href="/blog/why-architecture-still-matters-in-the-ai-era"]');
    const withoutCover = section.locator('a[href="/blog/building-reliable-rag-pipelines"]');
    await expect(withCover.locator("img")).toHaveCount(1);
    await expect(withoutCover.locator("img")).toHaveCount(0);

    // Both cover bands occupy the same 16:9 box, so rows stay aligned.
    const heights = await Promise.all(
      [withCover, withoutCover].map((card) =>
        card.locator(":scope > div").first().evaluate((element) => element.getBoundingClientRect().height)
      )
    );
    expect(Math.abs(heights[0] - heights[1])).toBeLessThanOrEqual(1);

    await withoutCover.click();
    await expect(page).toHaveURL(/\/blog\/building-reliable-rag-pipelines$/);
    await context.close();
  });

  test("mobile keeps a single column, scrollable tabs and no horizontal page overflow", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await mockSanity(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await openBlog(page);

    const gridColumns = await page
      .locator('section[aria-label="Blog articles"] ul[role="list"]')
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(gridColumns).toBe(1);

    const tablist = page.getByRole("tablist");
    const scrollable = await tablist.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      overflowX: getComputedStyle(element).overflowX,
    }));
    expect(scrollable.scrollWidth).toBeGreaterThan(scrollable.clientWidth);
    expect(scrollable.overflowX).toBe("auto");

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);

    await context.close();
  });
});
