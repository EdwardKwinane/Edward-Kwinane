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
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const SITEMAP = resolve(root, "public/sitemap.xml");

const env = Object.fromEntries(
  readFileSync(resolve(root, ".env"), "utf-8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const { VITE_SANITY_PROJECT_ID: projectId, VITE_SANITY_DATASET: dataset } = env;
if (!projectId) {
  console.error("VITE_SANITY_PROJECT_ID is missing from .env — cannot build the sitemap.");
  process.exit(1);
}

const ORIGIN = "https://edward-kwinane.vercel.app";
const apiVersion = env.VITE_SANITY_API_VERSION || "2024-06-04";

/** Static routes, with the same changefreq/priority the hand-written file used. */
const staticRoutes = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/portfolio", changefreq: "monthly", priority: "0.9" },
  { path: "/capabilities", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.8" },
];

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

const slugs = await fetchPaths();
const next = xml(slugs);
const current = readFileSync(SITEMAP, "utf-8");
const check = process.argv.includes("--check");

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
