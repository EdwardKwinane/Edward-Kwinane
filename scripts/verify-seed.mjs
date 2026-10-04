import * as esbuild from "esbuild";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { buildDocuments } from "./seed-documents.mjs";

const root = resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env"), "utf-8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const { documents } = await buildDocuments({
  projectId: env.VITE_SANITY_PROJECT_ID,
  dataset: env.VITE_SANITY_DATASET,
  apiVersion: env.VITE_SANITY_API_VERSION,
});

const byId = new Map(documents.map((d) => [d._id, d]));
const ofType = (t) => documents.filter((d) => d._type === t);
const deref = (r) => byId.get(r?._ref);

const projectSummary = (p) => ({
  _id: p._id,
  title: p.title,
  slug: p.slug?.current,
  category: p.category,
  categories: p.categories ?? [],
  status: p.status,
  featured: p.featured,
  description: p.shortDescription || p.fullDescription || "",
  coverImage: p.coverImage,
  technologies: (p.technologies ?? []).map(deref).filter(Boolean).map((t) => ({ name: t.name })),
});

const postSummary = (p) => ({
  _id: p._id,
  title: p.title,
  slug: p.slug?.current,
  subtitle: p.subtitle,
  excerpt: p.excerpt,
  author: p.author,
  category: p.category,
  featured: p.featured,
  placeholder: p.placeholder,
  estimatedReadingTime: p.estimatedReadingTime,
  publishedAt: p.publishedAt,
  tags: p.tags ?? [],
  coverImage: p.coverImage,
  seoImage: p.seoImage,
  body: p.body,
});

const capabilityDoc = (c) => ({
  _id: c._id,
  name: c.name,
  slug: c.slug?.current,
  index: c.index,
  eyebrow: c.eyebrow,
  headline: c.headline,
  shortDescription: c.shortDescription,
  description: c.description,
  labels: c.labels ?? [],
  previewLabels: c.previewLabels ?? [],
  flow: c.flow ?? [],
  icon: c.icon,
  category: c.category,
  featured: c.featured,
  ctaLabel: c.ctaLabel,
  ctaDestination: c.ctaDestination,
});

globalThis.__serve = (query, params) => {
  if (query.includes('_type == "project" && slug.current == $slug')) {
    const doc = ofType("project").find((p) => p.slug?.current === params?.slug);
    if (!doc) return null;
    return {
      ...projectSummary(doc),
      sections: (doc.sections ?? []).map((s) => ({ heading: s.heading, body: s.body })),
      problem: doc.problem,
      requirements: doc.requirements,
      solution: doc.solution,
      architecture: doc.architecture,
      implementation: doc.implementation,
      challenges: doc.challenges,
      results: doc.results,
      lessonsLearned: doc.lessonsLearned,
      githubUrl: doc.githubUrl,
      liveUrl: doc.liveUrl,
      publishedAt: doc.publishedAt,
      seoTitle: doc.seoTitle,
      seoDescription: doc.seoDescription,
      seoImage: doc.seoImage,
      related: (doc.related ?? []).map(deref).filter(Boolean).map(projectSummary),
    };
  }
  if (query.includes('*[_type == "project"]')) return ofType("project").map(projectSummary);
  if (query.includes('slug.current == $slug')) {
    const type = query.includes('_type == "project"') ? "project" : "post";
    const doc = ofType(type).find((p) => p.slug?.current === params?.slug);
    if (!doc) return null;
    return {
      ...postSummary(doc),
      seoTitle: doc.seoTitle,
      seoDescription: doc.seoDescription,
      updatedAt: doc.updatedAt,
      related: (doc.related ?? []).map(deref).filter(Boolean).map(postSummary),
    };
  }
  if (query.includes('*[_type == "post"')) {
    const requirePublished = query.includes("defined(publishedAt)");
    return ofType("post")
      .filter((p) => (requirePublished ? Boolean(p.publishedAt) : true))
      .map(postSummary);
  }
  if (query.includes('_type == "capability"')) {
    return ofType("capability")
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map(capabilityDoc);
  }
  throw new Error(`stub client cannot serve: ${query.slice(0, 90)}`);
};

const stub = resolve(root, "scripts/.stub-client.mjs");
const outdir = resolve(root, "node_modules/.cache/sanity-verify");

await esbuild.build({
  stdin: {
    contents: `
      export { getSanityProjectBySlug, getSanityPostBySlug } from "@/lib/sanity/queries";
      export { projects } from "@/data/projects";
      export { blogPosts } from "@/data/blog";
      export { capabilities, capabilitiesPreview, fetchCapabilityPreview, fetchCapabilities } from "@/data/capabilities";
    `,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  packages: "external",
  format: "esm",
  platform: "node",
  outfile: resolve(outdir, "verify.mjs"),
  logLevel: "warning",
  alias: { "@": resolve(root, "src") },
  plugins: [
    {
      name: "stub-client",
      setup(build) {
        build.onResolve({ filter: /^@sanity\/client$/ }, () => ({
          path: stub,
          namespace: "stub",
        }));
        build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: `
            export function createClient(config) {
              return {
                config: () => config,
                fetch: (query, params) => globalThis.__serve(query, params),
              };
            }
          `,
          loader: "js",
        }));
      },
    },
  ],
  define: {
    "import.meta.env.VITE_SANITY_PROJECT_ID": JSON.stringify(env.VITE_SANITY_PROJECT_ID),
    "import.meta.env.VITE_SANITY_DATASET": JSON.stringify(env.VITE_SANITY_DATASET),
    "import.meta.env.VITE_SANITY_API_VERSION": JSON.stringify(env.VITE_SANITY_API_VERSION),
  },
});

const m = await import(resolve(outdir, "verify.mjs"));

let failures = 0;
const diffFields = (actual, expected) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return null;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return [`length ${actual.length} vs ${expected.length}`];
    const out = [];
    for (let i = 0; i < actual.length; i++) {
      const d = diffFields(actual[i], expected[i]);
      if (d) out.push(`[${i}] ${d}`);
    }
    return out.length ? out : null;
  }
  if (actual && expected && typeof actual === "object" && typeof expected === "object") {
    const keys = [...new Set([...Object.keys(actual), ...Object.keys(expected)])];
    const out = keys
      .map((k) => {
        const d = diffFields(actual[k], expected[k]);
        return d ? `${k}: ${Array.isArray(d) ? d.join("; ") : d}` : null;
      })
      .filter(Boolean);
    return out.length ? out : null;
  }
  return `cms=${JSON.stringify(actual)} local=${JSON.stringify(expected)}`;
};
const check = (label, actual, expected) => {
  const d = diffFields(actual, expected);
  if (!d) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}`);
    for (const line of Array.isArray(d) ? d : [d]) console.log(`        ${line}`);
  }
};

console.log("Project detail — sections round-trip:");
for (const local of m.projects) {
  const cms = await m.getSanityProjectBySlug(local.slug);
  check(local.slug, cms?.sections, local.sections);
}

console.log("\nProject detail — summary fields:");
for (const local of m.projects) {
  const cms = await m.getSanityProjectBySlug(local.slug);
  check(
    local.slug,
    {
      title: cms?.title,
      status: cms?.status,
      placeholder: cms?.placeholder,
      description: cms?.description,
      technologies: cms?.technologies,
      related: cms?.related,
      slug: cms?.slug,
    },
    {
      slug: local.slug,
      title: local.title,
      status: local.status,
      placeholder: local.placeholder,
      description: local.description,
      technologies: local.technologies,
      related: local.related,
    }
  );
}

console.log("\nPost detail — summary fields:");
for (const local of m.blogPosts) {
  const cms = await m.getSanityPostBySlug(local.slug);
  check(
    local.slug,
    {
      title: cms?.title,
      subtitle: cms?.subtitle,
      excerpt: cms?.excerpt,
      category: cms?.category,
      author: cms?.author,
      placeholder: cms?.placeholder,
      featured: cms?.featured,
      tags: cms?.tags,
      related: cms?.related,
    },
    {
      title: local.title,
      subtitle: local.subtitle,
      excerpt: local.excerpt,
      category: local.category,
      author: local.author,
      placeholder: local.placeholder,
      featured: local.featured,
      tags: local.tags,
      related: local.related,
    }
  );
}

console.log("\nPost detail — body block counts:");
for (const local of m.blogPosts) {
  const cms = await m.getSanityPostBySlug(local.slug);
  const localBlocks = (local.content ?? []).reduce(
    (n, b) => n + (b.type === "ul" || b.type === "ol" ? (b.items?.length ?? 0) : 1),
    0
  );
  check(`${local.slug} (${localBlocks} blocks)`, cms?.body?.length, localBlocks);
}

console.log("\nHome page capability cards (id is an internal key, not rendered):");
const previewCms = await m.fetchCapabilityPreview();
const { id: _ignored, ...previewRest } = m.capabilitiesPreview[0];
check(
  "fetchCapabilityPreview",
  previewCms.map(({ id, ...rest }) => rest),
  m.capabilitiesPreview.map(({ id, ...rest }) => rest)
);

console.log("\nCapabilities page:");
const capsCms = await m.fetchCapabilities();
check(
  "fetchCapabilities",
  capsCms.map((c) => ({
    id: c.id,
    index: c.index,
    eyebrow: c.eyebrow,
    headline: c.headline,
    description: c.description,
    labels: c.labels,
    flow: c.flow,
  })),
  m.capabilities.map((c) => ({
    id: c.id,
    index: c.index,
    eyebrow: c.eyebrow,
    headline: c.headline,
    description: c.description,
    labels: c.labels,
    flow: c.flow,
  }))
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
