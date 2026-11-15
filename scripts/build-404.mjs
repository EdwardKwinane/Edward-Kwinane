/**
 * Emits `dist/404.html` for Vercel to serve on unmatched routes.
 *
 * The site is a Vite SPA whose `vercel.json` rewrites only the known routes to
 * `index.html`. Everything else falls through to Vercel's 404 handling, which
 * serves the `404.html` file in the output directory with an actual 404 status
 * (see the Vercel "Custom 404 Page" guide, "Static Site Generator" section).
 *
 * The file is a copy of the built `index.html` — same bundle, same SPA shell —
 * with `<meta name="robots" content="noindex">` injected, so search engines and
 * crawlers are told not to index unknown routes even before the client-side
 * NotFound route mounts (which also sets the tag, see src/pages/NotFound.tsx).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const entry = resolve(dist, "index.html");
const target = resolve(dist, "404.html");

if (!existsSync(entry)) {
  console.error("build-404: dist/index.html not found — run `vite build` first.");
  process.exit(1);
}

const source = readFileSync(entry, "utf-8");
if (!source.includes("</head>")) {
  console.error("build-404: dist/index.html has no </head>; refusing to guess.");
  process.exit(1);
}

const NOINDEX = '<meta name="robots" content="noindex" />';
const out = source.replace("</head>", `    ${NOINDEX}\n  </head>`);
writeFileSync(target, out);
console.log("  wrote dist/404.html (noindex)");
