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

function dispatch(query: string, posts: typeof POSTS = POSTS) {
  const q = String(query ?? "");
  if (isPostList(q)) return { result: posts };
  if (q.includes('_type == "post"')) return { result: { ...posts[0], body: [], related: [] } };
  if (q.includes('_type == "siteSettings"')) return { result: {} };
  return { result: [] };
}

/**
 * Three published posts copied from the live Sanity dataset (`sanity-posts.json`
 * captured during the read-only audit). They are the only posts whose indexed
 * fields contain the audit-reported search terms, so the regression test below
 * exercises real CMS copy instead of inventing search-specific content.
 */
const AUDIT_POSTS = [
  {
    _id: "post-arch-live",
    title: "Why Architecture Still Matters in the AI Era",
    slug: "why-architecture-still-matters-in-the-ai-era",
    subtitle:
      "AI makes building faster. It does not make thinking unnecessary. The systems that survive are the ones designed before they were coded.",
    category: "SYSTEM DESIGN",
    excerpt:
      "AI removes implementation friction, which raises the value of decisions made before the first line of code. A practical look at why system design is the real bottleneck.",
    author: "Edward Kwinane",
    featured: true,
    placeholder: true,
    estimatedReadingTime: 6,
    publishedAt: "2026-07-14T09:00:00.000Z",
    tags: ["system design", "architecture", "AI-native"],
    coverImage: null,
  },
  {
    _id: "post-agents-live",
    title: "Agents with Guardrails",
    slug: "agents-with-guardrails",
    subtitle:
      "Autonomy without boundaries is just a bug with a plan. Designing tool access and failure handling for agent systems.",
    category: "AGENTS",
    excerpt:
      "Agent loops only ship when their boundaries are explicit. On tool catalogues, human-in-the-loop checks and the failure paths that make agents safe.",
    author: "Edward Kwinane",
    featured: false,
    placeholder: true,
    estimatedReadingTime: 6,
    publishedAt: "2026-03-09T09:00:00.000Z",
    tags: ["agents", "tools", "guardrails", "safety"],
    coverImage: null,
  },
  {
    _id: "post-commerce-live",
    title: "How AI Automation Is Transforming E-Commerce Operations",
    slug: "how-ai-automation-is-transforming-e-commerce-operations",
    subtitle: "AI Automation",
    category: "AI ENGINEERING",
    excerpt:
      "E-commerce businesses are using AI automation to move beyond simple chatbots. From inventory management and customer support to order processing and personalized marketing, intelligent workflows are changing how online stores operate and scale.",
    author: "Edward Kwinane",
    featured: false,
    placeholder: true,
    estimatedReadingTime: 7,
    publishedAt: "2026-01-20T09:00:00.000Z",
    tags: [
      "AI Automation",
      "E-Commerce",
      "Artificial Intelligence",
      "Business Automation",
      "AI Agents",
      "Digital Transformation",
    ],
    coverImage: null,
  },
];

type PostFixture = typeof POSTS;
type PostFixtureSource = PostFixture | (() => PostFixture);

const resolveFixture = (source: PostFixtureSource): PostFixture =>
  typeof source === "function" ? source() : source;

async function mockSanity(
  context: BrowserContext,
  posts: PostFixtureSource = POSTS,
  listDelayMs = 0
) {
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
    const { result } = dispatch(query, resolveFixture(posts));
    if (listDelayMs && isPostList(String(query))) {
      await new Promise((resolve) => setTimeout(resolve, listDelayMs));
    }
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

async function mockSanityListFailure(context: BrowserContext) {
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
    if (isPostList(String(query))) {
      return route.fulfill({ status: 500, headers: CORS, body: "{}" });
    }
    const { result } = dispatch(query);
    return route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", ...CORS },
      body: JSON.stringify({ result }),
    });
  });
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

function skeleton(page: Page) {
  return page.locator("[data-blog-skeleton]");
}

function skeletonCards(page: Page) {
  return page.locator("[data-skeleton-card]");
}

/**
 * Count-specific fixture. Unique slugs avoid React-key collisions on repeated
 * mounts. Copy is taken from the real audited CMS article with the longest
 * title and excerpt so every card fills the two-line title / three-line excerpt
 * envelope that the structural skeleton reserves at all five viewports — the
 * same geometry real published posts produce.
 */
function makePosts(count: number): PostFixture {
  const categories = [
    "AI ENGINEERING",
    "VOICE AI",
    "RAG",
    "LLMs",
    "AGENTS",
    "FULL-STACK",
    "SYSTEM DESIGN",
  ];
  const realCopy = AUDIT_POSTS[2];
  return Array.from({ length: count }, (_, index) => ({
    ...POSTS[index % POSTS.length],
    _id: `post-count-${count}-${index}`,
    slug: `post-count-${count}-${index}`,
    title: realCopy.title,
    subtitle: realCopy.subtitle,
    excerpt: realCopy.excerpt,
    category: categories[index % categories.length] as PostFixture[number]["category"],
    featured: index === 0,
    coverImage: null,
  }));
}

type Geometry = {
  footerTop: number;
  sectionHeight: number;
  skeletonHeight: number | null;
  gridHeight: number | null;
  toolbarHeight: number | null;
  countHeight: number | null;
  cardHeight: number | null;
};

async function measureGeometry(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const section = document.querySelector('section[aria-label="Blog articles"]');
    const container = section?.firstElementChild as HTMLElement | null;
    const footer = document.querySelector("footer");
    const skeletonRoot = section?.querySelector("[data-blog-skeleton]") as HTMLElement | null;
    const grid = section?.querySelector('ul[role="list"]') as HTMLElement | null;
    const firstItem = section?.querySelector(
      '[data-skeleton-card], a[href^="/blog/"]'
    ) as HTMLElement | null;
    const toolbar = (section?.querySelector("[data-skeleton-tablist]") ??
      section?.querySelector('[role="tablist"]')) as HTMLElement | null;
    const countLine = Array.from(section?.querySelectorAll("p") ?? []).find((node) =>
      /^(Loading articles…|\d+ articles|Showing \d+ of \d+ articles)$/.test(
        (node.textContent ?? "").trim()
      )
    ) as HTMLElement | null;
    return {
      footerTop: footer
        ? Math.round(footer.getBoundingClientRect().top + window.scrollY)
        : Number.NaN,
      sectionHeight: container ? Math.round(container.getBoundingClientRect().height) : Number.NaN,
      skeletonHeight: skeletonRoot ? Math.round(skeletonRoot.getBoundingClientRect().height) : null,
      gridHeight: grid ? Math.round(grid.getBoundingClientRect().height) : null,
      toolbarHeight: toolbar ? Math.round(toolbar.getBoundingClientRect().height) : null,
      countHeight: countLine ? Math.round(countLine.getBoundingClientRect().height) : null,
      cardHeight: firstItem ? Math.round(firstItem.getBoundingClientRect().height) : null,
    };
  });
}

async function waitForReady(page: Page, count: number) {
  if (count === 0) {
    await expect(skeleton(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "No articles yet" })).toBeVisible();
  } else {
    await expect(skeleton(page)).toHaveCount(0);
    await expect(cards(page)).toHaveCount(count);
  }
  await page.waitForTimeout(100);
}

async function navigateAwayAndBack(page: Page) {
  await page.locator('footer a[href="/"]').first().click();
  await expect(page).toHaveURL(/\/$/);
  await page.locator('footer a[href="/blog"]').first().click();
  await expect(page).toHaveURL(/\/blog$/);
}

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
] as const;

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

  test("search matches the audit-reported terms and keeps existing behavior", async ({ browser }) => {
    const context = await browser.newContext();
    // Real CMS copy captured during the audit, not search-specific inventions.
    await mockSanity(context, AUDIT_POSTS);
    const page = await context.newPage();
    await dismissConsent(page);
    await openBlog(page);

    const search = page.getByLabel("Search articles");
    const commerceTitle = "How AI Automation Is Transforming E-Commerce Operations";

    // "unnecessary" lives in the subtitle, not the truncated card excerpt.
    await search.fill("UNNECESSARY");
    await expect(cards(page)).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 2, name: "Why Architecture Still Matters in the AI Era" })
    ).toBeVisible();

    // "safety" lives only in the tags array.
    await search.fill("safety");
    await expect(cards(page)).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 2, name: "Agents with Guardrails" })
    ).toBeVisible();

    // "digital transformation" lives only in a tag, with mixed case in the CMS.
    await search.fill("Digital Transformation");
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: commerceTitle })).toBeVisible();

    // Robust whitespace: repeated internal spaces still match the same tag.
    await search.fill("  digital   transformation  ");
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: commerceTitle })).toBeVisible();

    // Sensible punctuation: a dash in the CMS tag matches a space in the query.
    await search.fill("E Commerce");
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: commerceTitle })).toBeVisible();

    // The complete excerpt is indexed, not the line-clamped display string.
    await search.fill("personalized marketing");
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: commerceTitle })).toBeVisible();

    // Combined filters, empty state and result count still behave as before.
    await page.getByRole("tab", { name: "SYSTEM DESIGN", exact: true }).click();
    await search.fill("Digital Transformation");
    await expect(cards(page)).toHaveCount(0);
    await expect(page.getByText("No articles match your search")).toBeVisible();
    await expect(page.getByText("Showing 0 of 3 articles")).toBeVisible();

    await page.getByRole("tab", { name: "All" }).click();
    await search.fill("unnecessary");
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByText("Showing 1 of 3 articles")).toBeVisible();

    await context.close();
  });

  test("blog cards keep hover motion only when motion is allowed", async ({ browser }) => {
    for (const reducedMotion of ["reduce", "no-preference"] as const) {
      const context = await browser.newContext({ reducedMotion });
      await mockSanity(context);
      const page = await context.newPage();
      await dismissConsent(page);
      await openBlog(page);

      // The theme hook briefly applies an !important transition override on
      // mount; wait for it to clear so we measure the card's own styles.
      await page.waitForFunction(
        () => !document.documentElement.classList.contains("theme-switching")
      );
      const card = cards(page).first();
      await card.hover();
      const styles = await card.evaluate((el) => {
        const computed = getComputedStyle(el);
        return {
          transform: computed.transform,
          transitionProperty: computed.transitionProperty,
        };
      });

      if (reducedMotion === "reduce") {
        // No lift, and no animated property (Tailwind's transition-none sets
        // transition-property: none rather than zeroing the duration).
        expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(styles.transform);
        expect(styles.transitionProperty).toBe("none");
      } else {
        // The hover lift is transitioned, so wait for the computed transform
        // to settle instead of sampling the first animation frame.
        await expect
          .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
          .not.toBe("none");
        await expect
          .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
          .not.toBe("matrix(1, 0, 0, 1, 0, 0)");
        expect(styles.transitionProperty).toContain("transform");
      }
      await context.close();
    }
  });

  test("cold skeleton uses the seven-card fallback and logs geometry for all counts", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const rows: Array<Record<string, number | string>> = [];
    const failures: string[] = [];

    for (const viewport of VIEWPORTS) {
      for (const count of [6, 7, 8, 0]) {
        const context = await browser.newContext({ viewport });
        await mockSanity(context, () => makePosts(count), 1000);
        const page = await context.newPage();
        await dismissConsent(page);
        await page.goto("/blog", { waitUntil: "domcontentloaded" });

        const status = page.locator('[role="status"][aria-busy="true"]');
        await expect(status).toContainText("Loading articles");
        await expect(skeletonCards(page)).toHaveCount(7);

        const loading = await measureGeometry(page);
        await waitForReady(page, count);
        const ready = await measureGeometry(page);

        const row = {
          mode: "cold",
          viewport: `${viewport.width}x${viewport.height}`,
          resultCount: count,
          skeletonCards: 7,
          loadFooterTop: loading.footerTop,
          contentFooterTop: ready.footerTop,
          footerMovement: ready.footerTop - loading.footerTop,
          skeletonHeight: loading.skeletonHeight ?? loading.sectionHeight,
          finalContentHeight: ready.sectionHeight,
          heightDifference: ready.sectionHeight - loading.sectionHeight,
          loadGridHeight: loading.gridHeight ?? "n/a",
          readyGridHeight: ready.gridHeight ?? "n/a",
          loadCardHeight: loading.cardHeight ?? "n/a",
          readyCardHeight: ready.cardHeight ?? "n/a",
          loadToolbarHeight: loading.toolbarHeight ?? "n/a",
          readyToolbarHeight: ready.toolbarHeight ?? "n/a",
          loadCountHeight: loading.countHeight ?? "n/a",
          readyCountHeight: ready.countHeight ?? "n/a",
        };
        rows.push(row);
        console.log(`blog-cold-geometry ${JSON.stringify(row)}`);

        // Only a seven-post cold result matches the fallback. Other counts are
        // logged, not hidden: the footer difference is the expected cache miss.
        if (count === 7) {
          if (Math.abs(row.footerMovement) > 2 || Math.abs(row.heightDifference) > 2) {
            failures.push(`${row.viewport} count=${count}: ${JSON.stringify(row)}`);
          }
        }

        await context.close();
      }
    }

    console.log(JSON.stringify({ kind: "blog-cold-geometry", rows }, null, 2));
    expect(failures).toEqual([]);
  });

  test("warm skeleton uses the cached count and preserves geometry for matching counts", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const rows: Array<Record<string, number | string>> = [];
    const failures: string[] = [];

    for (const viewport of VIEWPORTS) {
      for (const count of [6, 7, 8, 0]) {
        const context = await browser.newContext({ viewport });
        await mockSanity(context, () => makePosts(count), 1000);
        const page = await context.newPage();
        await dismissConsent(page);
        await page.goto("/blog", { waitUntil: "domcontentloaded" });
        await waitForReady(page, count);

        // SPA navigation preserves the module-scoped count; page.goto would not.
        await navigateAwayAndBack(page);

        const status = page.locator('[role="status"][aria-busy="true"]');
        await expect(status).toContainText("Loading articles");
        await expect(skeletonCards(page)).toHaveCount(count);

        const loading = await measureGeometry(page);
        await waitForReady(page, count);
        const ready = await measureGeometry(page);

        const row = {
          mode: "warm",
          viewport: `${viewport.width}x${viewport.height}`,
          resultCount: count,
          skeletonCards: count,
          loadFooterTop: loading.footerTop,
          contentFooterTop: ready.footerTop,
          footerMovement: ready.footerTop - loading.footerTop,
          skeletonHeight: loading.skeletonHeight ?? loading.sectionHeight,
          finalContentHeight: ready.sectionHeight,
          heightDifference: ready.sectionHeight - loading.sectionHeight,
          loadGridHeight: loading.gridHeight ?? "n/a",
          readyGridHeight: ready.gridHeight ?? "n/a",
          loadCardHeight: loading.cardHeight ?? "n/a",
          readyCardHeight: ready.cardHeight ?? "n/a",
          loadToolbarHeight: loading.toolbarHeight ?? "n/a",
          readyToolbarHeight: ready.toolbarHeight ?? "n/a",
          loadCountHeight: loading.countHeight ?? "n/a",
          readyCountHeight: ready.countHeight ?? "n/a",
        };
        rows.push(row);
        console.log(`blog-warm-geometry ${JSON.stringify(row)}`);

        // A warm visit always has a matching cached count, including zero.
        if (Math.abs(row.footerMovement) > 2 || Math.abs(row.heightDifference) > 2) {
          failures.push(`${row.viewport} count=${count}: ${JSON.stringify(row)}`);
        }

        await context.close();
      }
    }

    console.log(JSON.stringify({ kind: "blog-warm-geometry", rows }, null, 2));
    expect(failures).toEqual([]);
  });

  test("module-level cache is isolated between browser contexts", async ({ browser }) => {
    const first = await browser.newContext();
    await mockSanity(first, () => makePosts(8));
    const firstPage = await first.newPage();
    await dismissConsent(firstPage);
    await openBlog(firstPage);
    await waitForReady(firstPage, 8);
    await first.close();

    const second = await browser.newContext();
    await mockSanity(second, () => makePosts(8), 1000);
    const secondPage = await second.newPage();
    await secondPage.goto("/blog", { waitUntil: "domcontentloaded" });
    await expect(skeletonCards(secondPage)).toHaveCount(7);
    await second.close();

    console.log("blog-cache-isolation: warm=8, fresh-context-cold=7");
  });

  test("skeleton is accessible, theme-aware and motion-safe", async ({ browser }) => {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript((value) => {
        try {
          localStorage.setItem("ek-theme", value);
        } catch {
          /* private mode */
        }
      }, theme);
      await mockSanity(context, POSTS, 1000);
      const page = await context.newPage();
      await dismissConsent(page);
      await page.goto("/blog", { waitUntil: "domcontentloaded" });
      await expect(skeleton(page)).toBeVisible();
      await expect(page.locator('[role="status"][aria-busy="true"]')).toContainText(
        "Loading articles"
      );
      await expect(page.locator("[data-skeleton-pill]")).toHaveCount(7);
      await expect(skeletonCards(page)).toHaveCount(7);

      const focusable = await skeleton(page).evaluate((root) =>
        root.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
          .length
      );
      expect(focusable).toBe(0);

      await page.waitForFunction(
        () => !document.documentElement.classList.contains("theme-switching")
      );
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      );
      expect(isDark).toBe(theme === "dark");
      const cardBackground = await skeletonCards(page)
        .first()
        .locator(":scope > div")
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(cardBackground).not.toBe("rgba(0, 0, 0, 0)");

      await context.close();
    }

    for (const reducedMotion of ["reduce", "no-preference"] as const) {
      const context = await browser.newContext({ reducedMotion });
      await mockSanity(context, POSTS, 1000);
      const page = await context.newPage();
      await dismissConsent(page);
      await page.goto("/blog", { waitUntil: "domcontentloaded" });
      await expect(skeletonCards(page)).toHaveCount(7);
      await page.waitForFunction(
        () => !document.documentElement.classList.contains("theme-switching")
      );
      const animationName = await skeletonCards(page)
        .first()
        .locator(":scope > div")
        .evaluate((element) => getComputedStyle(element).animationName);
      if (reducedMotion === "reduce") expect(animationName).toBe("none");
      else expect(animationName).toBe("pulse");
      await context.close();
    }
  });

  test("error state remains distinct from the empty state", async ({ browser }) => {
    const context = await browser.newContext();
    await mockSanityListFailure(context);
    const page = await context.newPage();
    await dismissConsent(page);
    await page.goto("/blog", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "This content couldn't be loaded" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByText("No articles yet")).toHaveCount(0);
    await expect(skeleton(page)).toHaveCount(0);

    await context.close();
  });

  test("mobile tab strips stay reachable by keyboard, wheel, drag, touch, in both themes", async ({
    browser,
  }) => {
    for (const width of [375, 390]) {
      for (const theme of ["light", "dark"] as const) {
        const context = await browser.newContext({
          viewport: { width, height: 844 },
          hasTouch: true,
        });
        await context.addInitScript((value) => {
          try {
            localStorage.setItem("ek-theme", value);
          } catch {
            /* private mode */
          }
        }, theme);
        await mockSanity(context);
        const page = await context.newPage();
        await dismissConsent(page);
        await openBlog(page);

        const isDark = await page.evaluate(() =>
          document.documentElement.classList.contains("dark")
        );
        expect(isDark).toBe(theme === "dark");

        const tablist = page.getByRole("tablist");
        await expect(page.getByRole("tab")).toHaveCount(7);
        const metrics = await tablist.evaluate((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflowX: getComputedStyle(el).overflowX,
        }));
        expect(metrics.overflowX).toBe("auto");
        expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
        const maxScroll = metrics.scrollWidth - metrics.clientWidth;

        // Keyboard: End focuses and selects the last tab, scrolls it into view,
        // and leaves the focus-ring style visible.
        await page.getByRole("tab", { name: "All" }).focus();
        await page.keyboard.press("End");
        const last = page.getByRole("tab", { name: "SYSTEM DESIGN" });
        await expect(last).toBeFocused();
        await expect(last).toHaveAttribute("aria-selected", "true");
        const keyboardState = await last.evaluate((el) => {
          const tab = el.getBoundingClientRect();
          const strip = el.parentElement!.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            visibleInStrip: tab.left >= strip.left - 1 && tab.right <= strip.right + 1,
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            scrollLeft: el.parentElement!.scrollLeft,
          };
        });
        expect(keyboardState.visibleInStrip).toBe(true);
        expect(keyboardState.outlineStyle).toBe("solid");
        expect(keyboardState.outlineWidth).toBe("2px");
        expect(keyboardState.scrollLeft).toBeGreaterThanOrEqual(maxScroll - 2);

        // Programmatic scrollLeft is used ONLY to reset the strip before each
        // real gesture below; reaching the last tab is verified from the gesture.
        const box = await tablist.boundingBox();
        expect(box).not.toBeNull();
        const y = Math.round(box!.y + box!.height / 2);

        // Pointer wheel: an actual wheel gesture over the strip scrolls it.
        await tablist.evaluate((el) => {
          el.scrollLeft = 0;
        });
        await page.mouse.move(box!.x + box!.width - 20, y);
        await page.mouse.wheel(maxScroll + 200, 0);
        await page.waitForTimeout(250);
        const wheelScroll = await tablist.evaluate((el) => el.scrollLeft);
        expect(wheelScroll).toBeGreaterThanOrEqual(maxScroll - 2);
        await expect(last).toBeInViewport();
        await expect(last).toHaveAttribute("aria-selected", "true");

        // Pointer drag: real mouse down/move/up gestures scroll the strip.
        await tablist.evaluate((el) => {
          el.scrollLeft = 0;
        });
        for (let pass = 0; pass < 2; pass += 1) {
          const startX = Math.round(box!.x + box!.width - 20);
          await page.mouse.move(startX, y);
          await page.mouse.down();
          for (let step = 1; step <= 8; step += 1) {
            await page.mouse.move(
              Math.round(startX - (box!.width - 40) * (step / 8)),
              y
            );
          }
          await page.mouse.up();
        }
        await page.waitForTimeout(200);
        const dragScroll = await tablist.evaluate((el) => el.scrollLeft);
        expect(dragScroll).toBeGreaterThanOrEqual(maxScroll - 2);
        await expect(last).toBeInViewport();
        await expect(last).toHaveAttribute("aria-selected", "true");

        // Touch: an actual touch swipe scrolls the same strip.
        await tablist.evaluate((el) => {
          el.scrollLeft = 0;
        });
        const cdp = await context.newCDPSession(page);
        const startX = Math.round(box!.x + box!.width - 15);
        const endX = Math.round(box!.x + 15);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: startX, y }],
        });
        for (let step = 1; step <= 8; step += 1) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: Math.round(startX + (endX - startX) * (step / 8)), y }],
          });
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(250);
        const touchScroll = await tablist.evaluate((el) => el.scrollLeft);
        expect(touchScroll).toBeGreaterThanOrEqual(maxScroll - 2);
        await expect(last).toBeInViewport();
        await expect(last).toHaveAttribute("aria-selected", "true");

        const widths = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);

        await context.close();
      }
    }
  });
});
