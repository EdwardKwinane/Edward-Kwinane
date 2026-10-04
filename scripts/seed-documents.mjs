import * as esbuild from "esbuild";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const titleCase = (value) =>
  String(value)
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const slugField = (current) => ({ _type: "slug", current });
const ref = (id) => ({ _type: "reference", _ref: id });
const span = (text) => [{ _type: "span", text, marks: [] }];
const block = (style, text) => ({
  _type: "block",
  style,
  markDefs: [],
  children: span(text),
});

const listBlock = (listItem, text) => ({
  _type: "block",
  style: "normal",
  listItem,
  level: 1,
  markDefs: [],
  children: span(text),
});

const PREVIEW_TO_CAPABILITY = {
  voice: "voice-agents",
  rag: "rag",
  chatbots: "ai-chatbots",
  fullstack: "full-stack",
};

const STATUS_BY_PLACEHOLDER = { true: "placeholder", false: "in-production" };

const CONTENT_TO_BLOCK = {
  p: (b) => block("normal", b.text ?? ""),
  h2: (b) => block("h2", b.text ?? ""),
  h3: (b) => block("h3", b.text ?? ""),
  quote: (b) => block("blockquote", b.text ?? ""),
  callout: (b) => ({ _type: "callout", title: b.title ?? "", text: b.text ?? "" }),
  ul: (b) => (b.items ?? []).map((item) => listBlock("bullet", item)),
  ol: (b) => (b.items ?? []).map((item) => listBlock("number", item)),
};

/**
 * Loads the site's local content modules and converts them into Sanity
 * documents. Split out from the CLI so the mapping can be exercised without
 * write access to a dataset.
 */
/**
 * Studio refuses to edit a list whose items have no _key, so every array of
 * objects a schema declares as a list needs one. Arrays of primitives (labels,
 * tags) do not.
 */
const KEYED_ARRAY_FIELDS = {
  project: ["sections", "technologies", "related"],
  post: ["body", "related"],
  capability: ["flow"],
};

function stableKey(seed) {
  let hash = 2166136261;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Adds a deterministic _key to any missing list item. Returns true if changed. */
export function ensureArrayKeys(doc) {
  const fields = KEYED_ARRAY_FIELDS[doc?._type] ?? [];
  let changed = false;

  for (const field of fields) {
    const items = doc[field];
    if (!Array.isArray(items)) continue;
    doc[field] = items.map((item, index) => {
      if (!item || typeof item !== "object" || item._key) return item;
      changed = true;
      return { ...item, _key: `${field}-${index}-${stableKey(JSON.stringify(item))}` };
    });
  }

  return changed;
}

export async function buildDocuments({ projectId, dataset, apiVersion }) {
  const warnings = [];

  const outdir = resolve(root, "node_modules/.cache/sanity-seed");
  await esbuild.build({
    entryPoints: [
      "src/data/projects.ts",
      "src/data/blog.ts",
      "src/data/capabilities.ts",
      "src/data/site.tsx",
    ].map((p) => resolve(root, p)),
    bundle: true,
    packages: "external",
    format: "esm",
    platform: "node",
    outdir,
    logLevel: "warning",
    alias: { "@": resolve(root, "src") },
    define: {
      "import.meta.env.VITE_SANITY_PROJECT_ID": JSON.stringify(projectId),
      "import.meta.env.VITE_SANITY_DATASET": JSON.stringify(dataset),
      "import.meta.env.VITE_SANITY_API_VERSION": JSON.stringify(apiVersion),
    },
  });

  const { projects } = await import(resolve(outdir, "projects.js"));
  const { blogPosts } = await import(resolve(outdir, "blog.js"));
  const { capabilities, capabilitiesPreview } = await import(
    resolve(outdir, "capabilities.js")
  );
  const { siteDefaults } = await import(resolve(outdir, "site.js"));

  const technologyNames = [...new Set(projects.flatMap((p) => p.technologies))];
  const techIdByName = new Map(
    technologyNames.map((name) => [name, `technology-${slugify(name)}`])
  );

  const technologyDocs = technologyNames.map((name, i) => ({
    _id: techIdByName.get(name),
    _type: "technology",
    name,
    slug: slugField(slugify(name)),
    displayOrder: i,
  }));

  const previewByCapabilityId = new Map(
    capabilitiesPreview
      .filter((item) => PREVIEW_TO_CAPABILITY[item.id])
      .map((item) => [PREVIEW_TO_CAPABILITY[item.id], item])
  );

  const capabilityDocs = capabilities.map((cap, i) => {
    const preview = previewByCapabilityId.get(cap.id);
    const name = cap.name ?? preview?.title ?? titleCase(cap.id);
    return {
      _id: `capability-${cap.id}`,
      _type: "capability",
      name,
      slug: slugField(cap.id),
      index: cap.index ?? String(i + 1).padStart(2, "0"),
      eyebrow: cap.eyebrow ?? "",
      headline: cap.headline ?? name,
      shortDescription: preview?.description,
      description: cap.description ?? "",
      labels: cap.labels ?? [],
      previewLabels: preview?.labels,
      flow: (cap.flow ?? []).map((f) => ({
        _type: "object",
        step: f.step ?? "",
        detail: f.detail ?? "",
      })),
      featured: Boolean(preview),
      displayOrder: i,
    };
  });

  const projectDocs = projects.map((p) => {
    const dropped = (p.sections ?? []).filter((s) => !s.heading?.trim() || !s.body?.length);
    if (dropped.length) {
      warnings.push(`project "${p.slug}": ${dropped.length} empty section(s) skipped`);
    }
    return {
      _id: `project-${p.slug}`,
      _type: "project",
      title: p.title,
      slug: slugField(p.slug),
      shortDescription: p.description ?? "",
      category: p.category,
      categories: p.categories?.length ? p.categories : [p.category],
      status: STATUS_BY_PLACEHOLDER[String(Boolean(p.placeholder))],
      featured: false,
      technologies: (p.technologies ?? [])
        .map((name) => ref(techIdByName.get(name)))
        .filter(Boolean),
      related: (p.related ?? []).map((slug) => ref(`project-${slug}`)),
      sections: (p.sections ?? [])
        .filter((section) => section.heading?.trim() && section.body?.length)
        .map((section) => ({
          _type: "object",
          heading: section.heading,
          body: section.body.join("\n\n"),
        })),
    };
  });

  const postDocs = blogPosts.map((post) => {
    const body = [];
    const unsupported = new Set();
    for (const item of post.content ?? []) {
      const convert = CONTENT_TO_BLOCK[item.type];
      if (!convert) {
        unsupported.add(item.type);
        continue;
      }
      const converted = convert(item);
      if (Array.isArray(converted)) body.push(...converted);
      else body.push(converted);
    }
    if (unsupported.size) {
      warnings.push(
        `post "${post.slug}": block type(s) ${[...unsupported].join(", ")} are not in the post schema and were dropped`
      );
    }

    const minutes = Number.parseInt(post.readingTime ?? "", 10);

    return {
      _id: `post-${post.slug}`,
      _type: "post",
      title: post.title,
      slug: slugField(post.slug),
      subtitle: post.subtitle ?? "",
      excerpt: post.excerpt ?? "",
      author: post.author ?? "Edward Kwinane",
      category: post.category,
      tags: post.tags ?? [],
      featured: Boolean(post.featured),
      placeholder: Boolean(post.placeholder),
      estimatedReadingTime: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
      publishedAt: post.date ? new Date(post.date).toISOString() : undefined,
      body,
      related: (post.related ?? []).map((slug) => ref(`post-${slug}`)),
    };
  });

  const siteSettingsDoc = { _id: "siteSettings", _type: "siteSettings", ...siteDefaults };

  const documents = [
    ...technologyDocs,
    ...capabilityDocs,
    ...projectDocs,
    ...postDocs,
    siteSettingsDoc,
  ];

  for (const doc of documents) {
    for (const [key, value] of Object.entries(doc)) {
      if (value === undefined) delete doc[key];
    }
    ensureArrayKeys(doc);
  }

  const knownIds = new Set(documents.map((doc) => doc._id));
  for (const doc of documents) {
    for (const value of Object.values(doc)) {
      for (const item of Array.isArray(value) ? value : []) {
        const target = item?._type === "reference" ? item._ref : undefined;
        if (target && !knownIds.has(target)) {
          warnings.push(
            `${doc._id}: reference to "${target}" does not match any seeded document id`
          );
        }
      }
    }
  }

  if (new Set(documents.map((doc) => doc._id)).size !== documents.length) {
    warnings.push("Duplicate document ids in the generated set.");
  }

  for (const doc of documents) {
    if (doc._id.includes(".")) {
      warnings.push(
        `${doc._id}: id contains a dot, which Sanity hides from anonymous reads.`
      );
    }
  }

  return { documents, warnings };
}
