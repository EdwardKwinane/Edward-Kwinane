import { test, expect, type Page } from "./helpers";

/**
 * Sanity reliability suite (PR-B).
 *
 * The app is built with a *fake* Sanity project ID (`reliability-test`, see
 * playwright.sanity.config.ts), so every CMS request goes to
 * apicdn.sanity.io and is intercepted here. No real CMS is ever contacted.
 *
 * Covered: success, legitimately-empty, missing document (NotFound),
 * recoverable outage (ErrorState + retry), timeout, malformed payload,
 * noindex during loading/error, URL stability during outages, and homepage
 * sections failing independently.
 */

/* ------------------------------------------------------------------ */
/* Mock infrastructure                                                 */
/* ------------------------------------------------------------------ */

type Outcome =
  | { kind: "json"; result: unknown; delayMs?: number }
  | { kind: "http"; status: number }
  | { kind: "abort" }
  | { kind: "hang" };

interface ParsedBody {
  query?: string;
  params?: Record<string, unknown>;
}

const CORS = {
  "access-control-allow-origin": "http://localhost:4174",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
  "access-control-max-age": "86400",
};

class SanityMock {
  readonly requests: ParsedBody[] = [];
  private rules: Array<{ match: (b: ParsedBody) => boolean; outcome: Outcome }> = [];
  private fallback: (b: ParsedBody) => Outcome;

  constructor(fallback: (b: ParsedBody) => Outcome) {
    this.fallback = fallback;
  }

  add(match: (b: ParsedBody) => boolean, outcome: Outcome): void {
    this.rules.push({ match, outcome });
  }

  count(match: (b: ParsedBody) => boolean): number {
    return this.requests.filter((r) => match(r)).length;
  }

  install(page: Page): void {
    page.route("**apicdn.sanity.io/**", async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS });
        return;
      }
      let body: ParsedBody = { query: "" };
      try {
        if (request.method() === "POST") {
          body = (request.postDataJSON() ?? {}) as ParsedBody;
        } else {
          // @sanity/client sends short queries as GET with the GROQ text in
          // the URL (`query`) and variables as `$<name>` (JSON-encoded).
          const url = new URL(request.url());
          const params: Record<string, unknown> = {};
          for (const [key, value] of url.searchParams.entries()) {
            if (!key.startsWith("$")) continue;
            try {
              params[key.slice(1)] = JSON.parse(value);
            } catch {
              params[key.slice(1)] = value;
            }
          }
          body = { query: url.searchParams.get("query") ?? "", params };
        }
      } catch {
        /* not parseable — leave the empty query */
      }
      this.requests.push(body);
      const rule = this.rules.find((r) => r.match(body));
      const outcome = rule ? rule.outcome : this.fallback(body);

      if (outcome.kind === "hang") {
        await new Promise<void>(() => {}); // client aborts first
        return;
      }
      if (outcome.kind === "abort") {
        await route.abort("failed");
        return;
      }
      if (outcome.kind === "http") {
        await route.fulfill({
          status: outcome.status,
          headers: { "content-type": "application/json", ...CORS },
          body: JSON.stringify({ message: "simulated failure" }),
        });
        return;
      }
      if (outcome.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, outcome.delayMs));
      }
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json", ...CORS },
        body: JSON.stringify({ result: outcome.result }),
      });
    });
  }
}

/* Query predicates (GROQ text is stable; match on it, not on order). */
const isProjectsList = (b: ParsedBody) =>
  !!b.query?.includes('*[_type == "project"') && !b.query?.includes("slug.current == $slug");
const isProjectBySlug = (b: ParsedBody) =>
  !!b.query?.includes('*[_type == "project"') && !!b.query?.includes("slug.current == $slug");
const isPostsList = (b: ParsedBody) =>
  !!b.query?.includes('*[_type == "post"') && !b.query?.includes("slug.current == $slug");
const isPostBySlug = (b: ParsedBody) =>
  !!b.query?.includes('*[_type == "post"') && !!b.query?.includes("slug.current == $slug");
const isCapabilities = (b: ParsedBody) => !!b.query?.includes('*[_type == "capability"');
const isSiteSettings = (b: ParsedBody) => !!b.query?.includes('_type == "siteSettings"');

/* ------------------------------------------------------------------ */
/* Fixtures (raw Sanity document shapes, exactly as GROQ projects them) */
/* ------------------------------------------------------------------ */

const SITE_SETTINGS = {
  _id: "siteSettings",
  siteTitle: "Edward Kwinane — AI Engineer & Digital Architect",
  siteDescription:
    "Edward Kwinane builds AI-native products from concept to production — AI voice agents, RAG systems, AI chatbots, AI agents and rapid full-stack product development.",
  ownerName: "Edward Kwinane",
  roleLine: "AI Engineer · Digital Architect",
  heroHeadline: "I build AI-native products from concept to production.",
  heroSubheadline: "Subheadline for the reliability test build.",
  heroTags: ["Voice Agents", "RAG Systems"],
  availabilityText: "Available for select projects",
  footerTagline: "Footer tagline",
  footerText: "Footer text",
  footerSignoff: "Concept → Architecture → Build → Ship",
  email: "",
  location: "",
  linkedinUrl: "https://www.linkedin.com/in/edwardkwinane",
  githubUrl: "https://github.com/edwardkwinane",
  twitterUrl: "",
};

const POST = {
  _id: "post-a",
  title: "Why Reliability Still Matters",
  slug: "why-reliability-still-matters",
  subtitle: "Outages are normal; silence is not.",
  excerpt: "A practical look at honest loading, error and empty states.",
  author: "Edward Kwinane",
  category: "SYSTEM DESIGN",
  featured: true,
  placeholder: false,
  estimatedReadingTime: 6,
  publishedAt: "2026-07-14T09:00:00.000Z",
  tags: ["reliability"],
  coverImage: null,
  seoImage: null,
  body: [
    {
      _type: "block",
      style: "normal",
      children: [{ _type: "span", text: "Hello from the reliability test CMS." }],
    },
  ],
  related: [],
  updatedAt: null,
};

const PROJECT = {
  _id: "project-a",
  title: "Reliability Test Project",
  slug: "reliability-test-project",
  category: "AI",
  categories: ["AI", "RAG"],
  status: "SHIPPED",
  featured: true,
  description: "A project served by the reliability mock.",
  coverImage: null,
  // The real projection `technologies[]->name` yields plain strings.
  technologies: ["TypeScript", "React"],
  sections: [{ heading: "The Problem", body: "It broke, so we fixed it." }],
  problem: "It broke, so we fixed it.",
  requirements: "",
  solution: "Fixed it.",
  architecture: "",
  implementation: "",
  challenges: "",
  results: "",
  lessonsLearned: "",
  githubUrl: "",
  liveUrl: "",
  publishedAt: "2026-07-01T00:00:00.000Z",
  related: [],
  seoTitle: null,
  seoDescription: null,
  seoImage: null,
};

const CAPABILITY = {
  _id: "cap-a",
  name: "Voice Agents",
  slug: "voice-agents",
  index: "01",
  eyebrow: "CAPABILITY 01 — VOICE AGENTS",
  headline: "Voice interfaces that feel natural.",
  shortDescription: "Short description.",
  description: "Longer description.",
  labels: ["VOICE"],
  previewLabels: ["VOICE"],
  flow: [{ step: "LISTENING", detail: "Speech-to-text" }],
  icon: null,
  category: "VOICE",
  featured: true,
  displayOrder: 1,
  ctaLabel: null,
  ctaDestination: null,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Default mock: every query succeeds with honest fixture data. */
function successMock(): SanityMock {
  const mock = new SanityMock((b) => {
    if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
    if (isProjectBySlug(b)) return { kind: "json", result: PROJECT };
    if (isPostBySlug(b)) return { kind: "json", result: POST };
    if (isProjectsList(b)) return { kind: "json", result: [PROJECT] };
    if (isPostsList(b)) return { kind: "json", result: [POST] };
    if (isCapabilities(b)) return { kind: "json", result: [CAPABILITY] };
    return { kind: "json", result: [] };
  });
  return mock;
}

async function dismissConsent(page: Page): Promise<void> {
  const necessary = page.locator('.cm button[data-role="necessary"]');
  if (await necessary.isVisible().catch(() => false)) {
    await necessary.click();
    await expect(page.locator(".cm")).toBeHidden();
  }
}

/** All robots meta contents (empty array when none exist). */
async function robotsContents(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('meta[name="robots"]')].map(
      (m) => m.getAttribute("content") ?? ""
    )
  );
}

const isIndexable = (contents: string[]) =>
  contents.length === 0 || contents.every((c) => !c.includes("noindex"));

test.describe("Sanity reliability", () => {
  test.use({ baseURL: "http://localhost:4174" });

  /* ---------------- listings: success ---------------- */

  test("blog listing renders content on success and stays indexable", async ({ page }) => {
    const mock = successMock();
    mock.install(page);
    await page.goto("/blog", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("heading", { name: "Why Reliability Still Matters", level: 2 })).toBeVisible();
    await expect(page.getByText("Featured article")).toBeVisible();
    const robots = await robotsContents(page);
    expect(isIndexable(robots)).toBe(true);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(mock.count(isPostsList)).toBe(1); // no duplicate parallel requests
  });

  test("portfolio listing renders content and honest counts on success", async ({ page }) => {
    const mock = successMock();
    mock.install(page);
    await page.goto("/portfolio", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("heading", { name: "Reliability Test Project" })).toBeVisible();
    await expect(page.getByText("1 project")).toBeVisible();
    const robots = await robotsContents(page);
    expect(isIndexable(robots)).toBe(true);
  });

  test("capabilities listing renders content on success", async ({ page }) => {
    const mock = successMock();
    mock.install(page);
    await page.goto("/capabilities", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("heading", { name: "Voice interfaces that feel natural." })).toBeVisible();
    const robots = await robotsContents(page);
    expect(isIndexable(robots)).toBe(true);
  });

  /* ---------------- listings: legitimately empty ---------------- */

  test("empty blog listing shows EmptyState, no error, stays indexable, no fake featured card", async ({
    page,
  }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      return { kind: "json", result: [] };
    });
    mock.install(page);
    await page.goto("/blog", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByText("No articles yet")).toBeVisible();
    await expect(page.getByText("Featured article")).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    const robots = await robotsContents(page);
    expect(isIndexable(robots)).toBe(true);
  });

  test("empty portfolio listing is honest (0 projects, not an error)", async ({ page }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      return { kind: "json", result: [] };
    });
    mock.install(page);
    await page.goto("/portfolio", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("heading", { name: "No projects yet" })).toBeVisible();
    await expect(page.getByText("0 projects")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  /* ---------------- listings: outage + recovery ---------------- */

  test("listing outage shows ErrorState, keeps URL, noindex, and retry recovers", async ({ page }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      return { kind: "http", status: 500 };
    });
    mock.install(page);
    await page.goto("/portfolio", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "This content couldn't be loaded" })).toBeVisible();
    expect(page.url()).toBe("http://localhost:4174/portfolio");
    const robots = await robotsContents(page);
    expect(robots.some((c) => c.includes("noindex"))).toBe(true);
    // An outage must never masquerade as "0 projects".
    await expect(page.getByText("0 projects")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "No projects yet" })).toHaveCount(0);

    // Flip the CMS to healthy and retry from the page itself.
    mock.add(isProjectsList, { kind: "json", result: [PROJECT] });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Reliability Test Project" })).toBeVisible();
    await expect(page.getByText("1 project")).toBeVisible();
    expect(page.url()).toBe("http://localhost:4174/portfolio");
    await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(0);
  });

  test("network abort is recoverable through retry", async ({ page }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      return { kind: "abort" };
    });
    mock.install(page);
    await page.goto("/blog", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("alert")).toBeVisible();
    expect(mock.count(isPostsList)).toBe(2); // initial + one controlled retry

    mock.add(isPostsList, { kind: "json", result: [POST] });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Why Reliability Still Matters", level: 2 })).toBeVisible();
  });

  test("malformed payload is an error, not an empty list, and is not retried", async ({ page }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      return { kind: "json", result: "definitely-not-an-array" };
    });
    mock.install(page);
    await page.goto("/capabilities", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nothing here yet" })).toHaveCount(0);
    await page.waitForTimeout(1500); // any wrongful retry would have landed by now
    expect(mock.count(isCapabilities)).toBe(1); // malformed is never retried
  });

  /* ---------------- detail pages ---------------- */

  test("article detail renders real content on success", async ({ page }) => {
    const mock = successMock();
    mock.install(page);
    await page.goto("/blog/why-reliability-still-matters", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("heading", { name: "Why Reliability Still Matters", level: 1 })).toBeVisible();
    await expect(page.getByText("Hello from the reliability test CMS.")).toBeVisible();
    expect(page.url()).toBe(
      "http://localhost:4174/blog/why-reliability-still-matters"
    );
    const robots = await robotsContents(page);
    expect(isIndexable(robots)).toBe(true);
    expect(mock.count(isPostBySlug)).toBe(1);
  });

  test("missing article renders NotFound + noindex, exactly one request, no retry", async ({
    page,
  }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      return { kind: "json", result: null }; // GROQ [0] with no match
    });
    mock.install(page);
    await page.goto("/blog/does-not-exist", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
    await expect(page.getByText("404")).toBeVisible();
    const robots = await robotsContents(page);
    expect(robots.some((c) => c.includes("noindex"))).toBe(true);
    expect(mock.count(isPostBySlug)).toBe(1); // not-found is never retried
  });

  test("article outage shows ErrorState (never NotFound), keeps URL, retry recovers", async ({
    page,
  }) => {
    let postOutcome: Outcome = { kind: "http", status: 500 };
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      if (isPostBySlug(b)) return postOutcome;
      return { kind: "json", result: [POST] };
    });
    mock.install(page);
    await page.goto("/blog/why-reliability-still-matters", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toHaveCount(0);
    expect(page.url()).toBe(
      "http://localhost:4174/blog/why-reliability-still-matters"
    );
    await expect(page).toHaveTitle(/Temporarily unavailable/);
    expect(mock.count(isPostBySlug)).toBe(2); // exactly one controlled retry

    postOutcome = { kind: "json", result: POST };
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Why Reliability Still Matters", level: 1 })).toBeVisible();
    await expect(page.getByText("Hello from the reliability test CMS.")).toBeVisible();
    expect(page.url()).toBe(
      "http://localhost:4174/blog/why-reliability-still-matters"
    );
    await expect(page).toHaveTitle(/Why Reliability Still Matters/);
    await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(0);
  });

  test("timeout aborts the transport, retries once, then shows ErrorState", async ({ page }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      return { kind: "hang" }; // never answer; the client must abort
    });
    mock.install(page);
    await page.goto("/blog/why-reliability-still-matters", { waitUntil: "load" });
    await dismissConsent(page);

    // While the request is in flight: loading state, announced, noindex.
    await expect(page.getByText("Loading article…")).toBeVisible();
    expect((await robotsContents(page)).some((c) => c.includes("noindex"))).toBe(true);

    // VITE_SANITY_TIMEOUT_MS=2000, one retry, 800ms backoff → error by ~5s.
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
    expect(mock.count(isPostBySlug)).toBe(2);
    expect(page.url()).toBe(
      "http://localhost:4174/blog/why-reliability-still-matters"
    );
  });

  test("malformed article document is an error, not NotFound", async ({ page }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      if (isPostBySlug(b)) return { kind: "json", result: { title: "No identity" } };
      return { kind: "json", result: [POST] };
    });
    mock.install(page);
    await page.goto("/blog/why-reliability-still-matters", { waitUntil: "load" });
    await dismissConsent(page);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toHaveCount(0);
    expect(mock.count(isPostBySlug)).toBe(1);
  });

  /* ---------------- homepage independence + honesty ---------------- */

  test("homepage sections fail independently and recover per section", async ({ page }) => {
    const mock = new SanityMock((b) => {
      if (isSiteSettings(b)) return { kind: "json", result: SITE_SETTINGS };
      if (isProjectsList(b)) return { kind: "http", status: 500 };
      if (isPostsList(b)) return { kind: "json", result: [POST] };
      if (isCapabilities(b)) return { kind: "json", result: [CAPABILITY] };
      return { kind: "json", result: [] };
    });
    mock.install(page);
    await page.goto("/", { waitUntil: "load" });
    await dismissConsent(page);

    // Hero + other sections render; the failing section reports its own error.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("A practical look at honest loading, error and empty states.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Voice Agents", level: 3 })).toBeVisible();
    const alerts = page.locator('main [role="alert"]');
    await expect(alerts).toHaveCount(1);

    // The fake "System status: Operational" indicator is gone. The hero
    // architecture diagram still contains a static "SYSTEM STATUS" legend
    // label (uppercase DOM text), so match case-sensitively.
    await expect(page.getByText("System status", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Operational")).toHaveCount(0);

    // Retry only the failed section.
    mock.add(isProjectsList, { kind: "json", result: [PROJECT] });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Reliability Test Project" })).toBeVisible();
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);
  });
});
