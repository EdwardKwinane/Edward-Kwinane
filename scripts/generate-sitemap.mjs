/**
 * Regenerate public/sitemap.xml from the Sanity dataset.
 *
 * The file used to be hand-maintained and had already drifted once (a blog
 * post was missing), so it is now derived from the same source of truth as the
 * site. Static routes come from src/App.tsx; the rest come from published
 * documents, filtered exactly the way the runtime queries filter them.
 *
 * Usage:
 *   node scripts/generate-sitemap.mjs           # write public/sitemap.xml
 *   node scripts/generate-sitemap.mjs --check   # exit 1 if it would change
 *
 * --check is the useful one in CI: it turns drift into a failing signal
 * instead of a silent omission. It only reads, so it needs no write token.
 *
 * Configuration comes from `process.env` first, then a local `.env`
 * (see scripts/load-env.mjs). When neither provides a Sanity project ID,
 * `--check` still runs, but as an offline structural check of the committed
 * file — that keeps CI credential-free while still failing on a malformed or
 * duplicated sitemap. Without an ID, regenerating is refused, because writing
 * a sitemap with no project + post URLs would silently drop content.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadSanityConfig, repoRoot } from "./load-env.mjs";

const SITEMAP = resolve(repoRoot, "public/sitemap.xml");
const ORIGIN = "https://edward-kwinane.vercel.app";

const { projectId, dataset, apiVersion } = loadSanityConfig();

/** Static routes, with the same changefreq/priority the hand-written file used. */
const staticRoutes = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/portfolio", changefreq: "monthly", priority: "0.9" },
  { path: "/capabilities", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.8" },
];

const CHANGEFREQ = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
]);

/* Mirrors the runtime filters: posts need `publishedAt` (an earlier post with
   none leaked publicly while Studio showed it as a draft), and both lists are
   ordered by their published date descending. */
const QUERY = `{
  "posts": *[_type == "post" && defined(publishedAt)] | order(publishedAt desc) { "slug": slug.current },
  "projects": *[_type == "project"] | order(coalesce(publishedAt, _updatedAt) desc) { "slug": slug.current }
}`;

async function fetchPaths() {
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?perspective=published&query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity responded ${res.status} ${res.statusText}`);
  const { result } = await res.json();
  return {
    posts: (result.posts ?? []).map((p) => p.slug).filter(Boolean),
    projects: (result.projects ?? []).map((p) => p.slug).filter(Boolean),
  };
}

const xml = ({ posts, projects }) => {
  const urls = [
    ...staticRoutes.map((r) => ({ loc: `${ORIGIN}${r.path}`, changefreq: r.changefreq, priority: r.priority })),
    ...projects.map((s) => ({ loc: `${ORIGIN}/portfolio/${s}`, changefreq: "monthly", priority: "0.7" })),
    ...posts.map((s) => ({ loc: `${ORIGIN}/blog/${s}`, changefreq: "monthly", priority: "0.7" })),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- GENERATED FILE - do not edit by hand.
     Regenerate with: npm run sitemap
     Verified in CI with: npm run verify:sitemap -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
};

const check = process.argv.includes("--check");
const current = readFileSync(SITEMAP, "utf-8");

/**
 * Credential-free validation of the committed sitemap. Used by CI, where no
 * Sanity project ID is available. It cannot detect content drift, but it does
 * catch the failures that break discovery outright: a malformed document,
 * duplicated or non-absolute URLs, and missing static routes.
 */
function checkOffline() {
  const problems = [];
  const locs = [...current.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const counts = {
    url: (current.match(/<url>/g) ?? []).length,
    loc: locs.length,
    changefreq: (current.match(/<changefreq>/g) ?? []).length,
    priority: (current.match(/<priority>/g) ?? []).length,
  };

  if (!current.includes("<urlset")) problems.push("missing <urlset> root element");
  for (const [key, value] of Object.entries(counts)) {
    if (value !== counts.url) {
      problems.push(`expected ${counts.url} <${key}> elements, found ${value}`);
    }
  }
  if (counts.url === 0) problems.push("no <url> entries");

  const seen = new Set();
  for (const loc of locs) {
    if (!loc.startsWith(`${ORIGIN}/`)) {
      problems.push(`non-absolute or off-origin loc: ${loc}`);
    }
    if (seen.has(loc)) problems.push(`duplicate loc: ${loc}`);
    seen.add(loc);
  }

  for (const route of staticRoutes) {
    if (!seen.has(`${ORIGIN}${route.path}`)) {
      problems.push(`missing static route: ${ORIGIN}${route.path}`);
    }
  }

  for (const [, freq, priority] of current.matchAll(
    /<changefreq>([^<]+)<\/changefreq><priority>([^<]+)<\/priority>/g
  )) {
    if (!CHANGEFREQ.has(freq)) problems.push(`invalid changefreq: ${freq}`);
    const numeric = Number(priority);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
      problems.push(`invalid priority: ${priority}`);
    }
  }

  console.log(`sitemap: ${counts.url} urls — offline structural check (no Sanity project ID)`);
  if (problems.length === 0) {
    console.log("  ok    sitemap.xml is well formed, absolute and free of duplicates");
    console.log("        dataset comparison skipped: set VITE_SANITY_PROJECT_ID for the full check");
    return;
  }
  console.log("  FAIL  sitemap.xml failed the structural check");
  problems.forEach((problem) => console.log(`          ${problem}`));
  process.exit(1);
}

if (!projectId) {
  if (!check) {
    console.error(
      "VITE_SANITY_PROJECT_ID is not set — cannot regenerate the sitemap.\n" +
        "Export it in the shell or add it to .env (see .env.example)."
    );
    process.exit(1);
  }
  checkOffline();
} else {
  const slugs = await fetchPaths();
  const next = xml(slugs);

  console.log(
    `sitemap: ${staticRoutes.length} static + ${slugs.projects.length} project + ${slugs.posts.length} post = ${
      staticRoutes.length + slugs.projects.length + slugs.posts.length
    } urls`
  );

  if (check) {
    if (current.trim() === next.trim()) {
      console.log("  ok    sitemap.xml is in sync with the dataset");
    } else {
      const have = [...current.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const want = [...next.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const missing = want.filter((u) => !have.includes(u));
      const extra = have.filter((u) => !want.includes(u));
      console.log("  FAIL  sitemap.xml has drifted from the dataset");
      missing.forEach((u) => console.log(`          missing: ${u}`));
      extra.forEach((u) => console.log(`          stale:   ${u}`));
      console.log("        run: npm run sitemap");
      process.exit(1);
    }
  } else {
    writeFileSync(SITEMAP, next);
    console.log("  wrote public/sitemap.xml");
  }
}
