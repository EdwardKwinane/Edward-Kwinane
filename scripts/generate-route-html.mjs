/**
 * Emits one static HTML shell per public sitemap URL.
 *
 * Vercel gives the filesystem precedence over rewrites, so these files supply
 * accurate title/description/canonical/social/JSON-LD metadata in the initial
 * HTML. The SPA still mounts from the same bundle; Seo.tsx then updates the
 * same tags for the hydrated route.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  OG_IMAGE,
  ORIGIN,
  OWNER_NAME,
  ROUTE_METADATA,
  sitemapPaths,
  structuredDataFor,
} from "./route-metadata.mjs";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const entry = resolve(dist, "index.html");

if (!existsSync(entry)) {
  console.error("generate-route-html: dist/index.html not found — run `vite build` first.");
  process.exit(1);
}

const base = readFileSync(entry, "utf-8");
if (!base.includes("</head>")) {
  console.error("generate-route-html: dist/index.html has no </head>; refusing to guess.");
  process.exit(1);
}

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function attributesOf(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

/** Updates an existing meta tag in place, or inserts one before </head>. */
function setMeta(html, attr, key, content) {
  const value = escapeHtml(content);
  let found = false;

  const next = html.replace(/<meta\b[^>]*>/g, (tag) => {
    if (attributesOf(tag)[attr] !== key) return tag;
    found = true;
    if (/\bcontent\s*=\s*"[^"]*"/.test(tag)) {
      return tag.replace(/\bcontent\s*=\s*"[^"]*"/, `content="${value}"`);
    }
    return tag.replace(/\s*\/?>$/, ` ${attr}="${key}" content="${value}" />`);
  });

  if (found) return next;
  return next.replace("</head>", `    <meta ${attr}="${key}" content="${value}" />\n  </head>`);
}

/** Updates the canonical link in place, or inserts one before </head>. */
function setCanonical(html, href) {
  const value = escapeHtml(href);
  let found = false;

  const next = html.replace(/<link\b[^>]*>/g, (tag) => {
    if (attributesOf(tag).rel !== "canonical") return tag;
    found = true;
    if (/\bhref\s*=\s*"[^"]*"/.test(tag)) {
      return tag.replace(/\bhref\s*=\s*"[^"]*"/, `href="${value}"`);
    }
    return tag.replace(/\s*\/?>$/, ` rel="canonical" href="${value}" />`);
  });

  if (found) return next;
  return next.replace("</head>", `    <link rel="canonical" href="${value}" />\n  </head>`);
}

function setTitle(html, title) {
  const value = escapeHtml(title);
  if (/<title>[\s\S]*?<\/title>/.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${value}</title>`);
  }
  return html.replace("</head>", `    <title>${value}</title>\n  </head>`);
}

/** Reuses the same managed script ID as Seo.tsx so navigation cannot duplicate it. */
function setStructuredData(html, data) {
  const json = JSON.stringify(data);
  const script = `<script type="application/ld+json" id="structured-data">\n      ${json}\n    </script>`;
  const managed = /<script\b[^>]*\bid="structured-data"[^>]*>[\s\S]*?<\/script>/;

  if (managed.test(html)) return html.replace(managed, script);
  return html.replace("</head>", `    ${script}\n  </head>`);
}

function htmlFor(path) {
  const meta = ROUTE_METADATA[path];
  const url = `${ORIGIN}${path}`;
  const image = OG_IMAGE;

  let html = setTitle(base, meta.title);
  html = setMeta(html, "name", "description", meta.description);
  html = setCanonical(html, url);
  html = setMeta(html, "property", "og:type", meta.type);
  html = setMeta(html, "property", "og:site_name", OWNER_NAME);
  html = setMeta(html, "property", "og:title", meta.title);
  html = setMeta(html, "property", "og:description", meta.description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "property", "og:image:width", "1200");
  html = setMeta(html, "property", "og:image:height", "630");
  html = setMeta(html, "property", "og:image:alt", meta.title);
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(html, "name", "twitter:title", meta.title);
  html = setMeta(html, "name", "twitter:description", meta.description);
  html = setMeta(html, "name", "twitter:image", image);
  html = setMeta(html, "name", "twitter:image:alt", meta.title);
  html = setStructuredData(html, structuredDataFor(path));
  return html;
}

const paths = sitemapPaths();
const metadataPaths = Object.keys(ROUTE_METADATA);
const missing = paths.filter((path) => !metadataPaths.includes(path));
const extra = metadataPaths.filter((path) => !paths.includes(path));

if (missing.length || extra.length) {
  console.error("generate-route-html: metadata map and sitemap disagree.");
  missing.forEach((path) => console.error(`  missing metadata: ${path}`));
  extra.forEach((path) => console.error(`  stale metadata:   ${path}`));
  process.exit(1);
}

const written = [];
for (const path of paths) {
  if (path === "/") continue; // dist/index.html is already the homepage shell.
  const target = resolve(dist, `.${path}`, "index.html");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, htmlFor(path));
  written.push(path);
}

console.log(
  `  wrote dist route shells: ${written.length} nested + 1 root = ${paths.length} sitemap URLs`
);
