import { fetchContentArray, fetchContentOne, type ContentResult } from "./content";
import { imageUrl } from "./image";
import type {
  SanityProject,
  SanityPost,
  SanityCapability,
  SanityTechnology,
  SanityExperience,
  SanityTestimonial,
  SanitySiteSettings,
} from "./types";
import type { Project, ProjectSection, ProjectCategory } from "@/data/projects";
import type { BlogPost } from "@/data/blog";
import type { Capability, Technology } from "@/data/technologies";
import type { PortableTextBlock } from "@portabletext/types";

/* ------------------------------------------------------------------ */
/* GROQ queries                                                       */
/* ------------------------------------------------------------------ */

const PROJECT_LIST_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  category,
  "categories": coalesce(categories, []),
  status,
  featured,
  "description": coalesce(shortDescription, fullDescription, ""),
  coverImage,
  "technologies": technologies[]->name,
`;

const projectsListQuery = `*[_type == "project"]
  | order(coalesce(featured, false) desc, coalesce(publishedAt, "") desc) {
    ${PROJECT_LIST_FIELDS}
  }`;

const projectBySlugQuery = `*[_type == "project" && slug.current == $slug][0] {
    ${PROJECT_LIST_FIELDS}
    sections[]{heading, body},
    problem,
    requirements,
    solution,
    architecture,
    implementation,
    challenges,
    results,
    lessonsLearned,
    githubUrl,
    liveUrl,
    publishedAt,
    seoTitle,
    seoDescription,
    seoImage,
    "related": related[]->{
      ${PROJECT_LIST_FIELDS}
    }
  }`;

const POST_LIST_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  subtitle,
  excerpt,
  author,
  category,
  featured,
  placeholder,
  estimatedReadingTime,
  "publishedAt": coalesce(publishedAt, _createdAt),
  "tags": coalesce(tags, []),
  coverImage,
  seoImage,
`;

const postsListQuery = `*[_type == "post" && defined(publishedAt)]
  | order(coalesce(featured, false) desc, coalesce(publishedAt, "") desc) {
    ${POST_LIST_FIELDS}
  }`;

const postBySlugQuery = `*[_type == "post" && defined(publishedAt) && slug.current == $slug][0] {
    ${POST_LIST_FIELDS}
    body,
    seoTitle,
    seoDescription,
    updatedAt,
    "related": related[]->{
      ${POST_LIST_FIELDS}
    }
  }`;

const capabilitiesQuery = `*[_type == "capability"]
  | order(coalesce(displayOrder, 0) asc, coalesce(featured, false) desc) {
    _id,
    name,
    "slug": slug.current,
    index,
    eyebrow,
    headline,
    shortDescription,
    description,
    "labels": coalesce(labels, []),
    "previewLabels": coalesce(previewLabels, []),
    "flow": coalesce(flow, []),
    icon,
    category,
    featured,
    ctaLabel,
    ctaDestination
  }`;

const technologiesQuery = `*[_type == "technology"]
  | order(coalesce(displayOrder, 0) asc, name asc) {
    _id,
    name,
    "slug": slug.current,
    category,
    description,
    website,
    displayOrder
  }`;

const experienceQuery = `*[_type == "experience"]
  | order(coalesce(displayOrder, 0) asc, coalesce(startDate, "") desc) {
    _id,
    title,
    organization,
    type,
    startDate,
    endDate,
    currentlyActive,
    description,
    credentialUrl,
    organizationUrl,
    skills,
    displayOrder
  }`;

const testimonialsQuery = `*[_type == "testimonial"]
  | order(coalesce(displayOrder, 0) asc) {
    _id,
    clientName,
    company,
    role,
    quote,
    avatar,
    featured,
    displayOrder
  }`;

const siteSettingsQuery = `*[_type == "siteSettings"][0] {
    _id,
    siteTitle,
    siteDescription,
    ownerName,
    roleLine,
    heroHeadline,
    heroSubheadline,
    "heroTags": coalesce(heroTags, []),
    availabilityText,
    email,
    location,
    linkedinUrl,
    twitterUrl,
    githubUrl,
    resumeUrl,
    footerTagline,
    footerText,
    footerSignoff
  }`;

/* ------------------------------------------------------------------ */
/* Validation helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Parse a date field defensively. CMS content is editor-entered, so a bad
 * value must surface as "no date" — never "Invalid Date" and never a thrown
 * error that takes the whole listing down.
 */
function safeIsoDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const time = Date.parse(value);
  return Number.isNaN(time) ? "" : new Date(time).toISOString();
}

/* ------------------------------------------------------------------ */
/* Project mapping                                                    */
/* ------------------------------------------------------------------ */

function splitParagraphs(body: unknown): string[] {
  if (typeof body !== "string") return [];
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const STATUS_MAP: Record<string, Project["status"]> = {
  shipped: "SHIPPED",
  "in-production": "IN PRODUCTION",
  building: "BUILDING",
  placeholder: "PLACEHOLDER",
};

/**
 * An unknown status must not read as a real claim about the work. It maps to
 * PLACEHOLDER, the site's honest "not verified yet" signal, instead of the
 * previous default of "IN PRODUCTION".
 */
function mapStatus(status: unknown): Project["status"] {
  if (typeof status === "string" && status in STATUS_MAP) return STATUS_MAP[status];
  return "PLACEHOLDER";
}

/**
 * `technologies[]->name` projects to plain strings; older tooling may hand
 * back `{name}` objects. Normalise both — anything else is dropped.
 */
function technologyName(entry: unknown): string {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string") {
    return (entry as { name: string }).name;
  }
  return "";
}

function mapVisual(
  p: Pick<SanityProject, "category" | "categories" | "technologies">
): { label: string; sublabel: string } {
  const cats = p.categories?.length ? p.categories : p.category ? [p.category] : [];
  const label = cats.length ? cats.join(" · ") : p.category ?? "PROJECT";
  const sublabel = (p.technologies?.slice(0, 3).map(technologyName).filter(Boolean) ?? []).join(
    " · "
  );
  return { label, sublabel };
}

type ProjectSummarySource = Pick<
  SanityProject,
  | "_id"
  | "title"
  | "slug"
  | "category"
  | "categories"
  | "status"
  | "featured"
  | "description"
  | "coverImage"
  | "technologies"
>;

function mapProjectSummary(p: ProjectSummarySource): Project | null {
  // A document without a usable identity or title cannot be rendered safely;
  // drop it from the list rather than inventing content.
  if (typeof p._id !== "string" || !p._id) return null;
  if (typeof p.title !== "string" || !p.title.trim()) return null;

  const status = mapStatus(p.status);
  const slug = typeof p.slug === "string" && p.slug ? p.slug : p._id;
  const technologies = Array.isArray(p.technologies)
    ? p.technologies.map(technologyName).filter(Boolean)
    : [];

  return {
    slug,
    title: p.title,
    category: (p.category as ProjectCategory) ?? "AI",
    categories: Array.isArray(p.categories)
      ? (p.categories.filter((c): c is ProjectCategory => typeof c === "string") as ProjectCategory[])
      : [],
    description: typeof p.description === "string" ? p.description : "",
    status,
    technologies,
    placeholder: status === "PLACEHOLDER",
    visual: mapVisual(p),
    sections: [],
    related: [],
    coverImage: imageUrl(p.coverImage),
    coverImageAlt: p.coverImage?.alt,
  };
}

function buildSections(p: SanityProject): ProjectSection[] {
  const fromArray = (p.sections ?? [])
    .filter(
      (s) =>
        typeof s?.heading === "string" &&
        s.heading.trim() &&
        typeof s?.body === "string" &&
        s.body.trim()
    )
    .map((s) => ({
      heading: s.heading as string,
      body: splitParagraphs(s.body),
    }));
  if (fromArray.length) return fromArray;

  const sections: ProjectSection[] = [];
  const add = (heading: string, body?: unknown) => {
    if (typeof body !== "string" || !body.trim()) return;
    const paragraphs = splitParagraphs(body);
    if (paragraphs.length) sections.push({ heading, body: paragraphs });
  };

  add("The Problem", p.problem);
  add("Requirements", p.requirements);
  add("The Solution", p.solution);
  add("System Architecture", p.architecture);

  const technologies = (Array.isArray(p.technologies) ? p.technologies : [])
    .map(technologyName)
    .filter(Boolean);
  if (technologies.length) {
    sections.push({ heading: "Technology Stack", body: technologies });
  }

  add("Implementation", p.implementation);
  add("Challenges", p.challenges);
  add("Results", p.results);
  add("Lessons Learned", p.lessonsLearned);

  return sections;
}

function mapProject(p: SanityProject): Project | null {
  if (typeof p._id !== "string" || !p._id) return null;
  const base = mapProjectSummary(p);
  if (!base) return null;
  return {
    ...base,
    related: (Array.isArray(p.related) ? p.related : [])
      .map(mapProjectSummary)
      .filter((r): r is Project => r !== null)
      .map((r) => r.slug)
      .slice(0, 2),
    sections: buildSections(p),
  };
}

/* ------------------------------------------------------------------ */
/* Blog mapping                                                       */
/* ------------------------------------------------------------------ */

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function blockChildrenText(block: unknown): string {
  if (!block || typeof block !== "object") return "";
  const children = (block as { children?: unknown }).children;
  if (!Array.isArray(children)) return "";
  return children
    .map((child) =>
      child && typeof child === "object" && typeof (child as { text?: unknown }).text === "string"
        ? (child as { text: string }).text
        : ""
    )
    .join(" ");
}

function tableOfContentsFromBody(body?: PortableTextBlock[]) {
  return (body ?? [])
    .filter(
      (block): block is PortableTextBlock & { style?: unknown } =>
        !!block &&
        typeof block === "object" &&
        (block as { _type?: unknown })._type === "block" &&
        (block as { style?: unknown }).style === "h2"
    )
    .map((block) => {
      const text = blockChildrenText(block).trim();
      return { id: slugifyHeading(text), label: text };
    })
    .filter((item) => item.label);
}

function estimateReadingTime(body?: PortableTextBlock[]): string {
  let words = 0;
  for (const block of body ?? []) {
    if (!block || typeof block !== "object" || (block as { _type?: unknown })._type !== "block") {
      continue;
    }
    words += blockChildrenText(block)
      .split(/\s+/)
      .filter(Boolean).length;
  }
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

type PostSummarySource = Pick<
  SanityPost,
  | "_id"
  | "title"
  | "slug"
  | "subtitle"
  | "excerpt"
  | "author"
  | "category"
  | "featured"
  | "placeholder"
  | "estimatedReadingTime"
  | "publishedAt"
  | "tags"
  | "coverImage"
  | "body"
>;

function mapPostSummary(p: PostSummarySource): BlogPost | null {
  if (typeof p._id !== "string" || !p._id) return null;
  if (typeof p.title !== "string" || !p.title.trim()) return null;

  const readingTime = p.estimatedReadingTime
    ? `${p.estimatedReadingTime} min read`
    : p.body
      ? estimateReadingTime(p.body)
      : "— min read";
  return {
    slug: typeof p.slug === "string" && p.slug ? p.slug : p._id,
    title: p.title,
    subtitle: typeof p.subtitle === "string" ? p.subtitle : "",
    category: (p.category as BlogPost["category"]) ?? "AI ENGINEERING",
    excerpt: typeof p.excerpt === "string" ? p.excerpt : "",
    author: typeof p.author === "string" && p.author ? p.author : "Edward Kwinane",
    date: safeIsoDate(p.publishedAt),
    readingTime,
    featured: Boolean(p.featured),
    placeholder: Boolean(p.placeholder),
    tags: Array.isArray(p.tags)
      ? p.tags.filter((t): t is string => typeof t === "string")
      : [],
    related: [],
    coverImage: imageUrl(p.coverImage),
    coverImageAlt: p.coverImage?.alt,
  };
}

function mapBlogPostBody(p: SanityPost): BlogPost | null {
  const base = mapPostSummary(p);
  if (!base) return null;
  return {
    ...base,
    body: Array.isArray(p.body) ? p.body : undefined,
    tableOfContents: tableOfContentsFromBody(p.body),
    readingTime: p.estimatedReadingTime
      ? `${p.estimatedReadingTime} min read`
      : estimateReadingTime(p.body),
    related: (Array.isArray(p.related) ? p.related : [])
      .map(mapPostSummary)
      .filter((r): r is BlogPost => r !== null)
      .map((r) => r.slug)
      .slice(0, 2),
  };
}

/* ------------------------------------------------------------------ */
/* Capability / technology mapping                                    */
/* ------------------------------------------------------------------ */

function mapCapability(p: SanityCapability): Capability | null {
  if (typeof p._id !== "string" || !p._id) return null;
  if (typeof p.name !== "string" || !p.name.trim()) return null;

  const flow = Array.isArray(p.flow)
    ? p.flow
        .filter((f) => f && typeof f === "object")
        .map((f) => ({
          step: typeof f.step === "string" ? f.step : "",
          detail: typeof f.detail === "string" ? f.detail : "",
        }))
    : [];

  return {
    id: typeof p.slug === "string" && p.slug ? p.slug : p._id,
    name: p.name,
    index: typeof p.index === "string" ? p.index : "",
    eyebrow: typeof p.eyebrow === "string" ? p.eyebrow : "",
    headline: typeof p.headline === "string" && p.headline ? p.headline : p.name,
    shortDescription: typeof p.shortDescription === "string" ? p.shortDescription : "",
    description:
      typeof p.description === "string"
        ? p.description
        : typeof p.shortDescription === "string"
          ? p.shortDescription
          : "",
    labels: Array.isArray(p.labels)
      ? p.labels.filter((l): l is string => typeof l === "string")
      : [],
    previewLabels: Array.isArray(p.previewLabels)
      ? p.previewLabels.filter((l): l is string => typeof l === "string")
      : [],
    featured: Boolean(p.featured),
    flow,
  };
}

function mapTechnology(p: SanityTechnology): Technology | null {
  if (typeof p.name !== "string" || !p.name.trim()) return null;
  return {
    label: p.name,
    description: typeof p.description === "string" ? p.description : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Public data access functions                                       */
/* ------------------------------------------------------------------ */

export async function getSanityProjects(): Promise<ContentResult<Project[]>> {
  const result = await fetchContentArray<SanityProject>(projectsListQuery);
  if (result.status !== "success") return result;
  // One malformed document never takes the listing down; valid items survive.
  const items = result.data.map(mapProjectSummary).filter((p): p is Project => p !== null);
  return { status: "success", data: items };
}

export async function getSanityFeaturedProjects(): Promise<ContentResult<Project[]>> {
  const result = await fetchContentArray<SanityProject>(projectsListQuery);
  if (result.status !== "success") return result;
  // The `featured` flag lives on the raw document, so the selection happens
  // before mapping — same behaviour as before this refactor.
  const featured = result.data.filter((p) => Boolean(p.featured));
  const items = (featured.length ? featured : result.data)
    .slice(0, 4)
    .map(mapProjectSummary)
    .filter((p): p is Project => p !== null);
  return { status: "success", data: items };
}

export async function getSanityProjectBySlug(slug: string): Promise<ContentResult<Project>> {
  const result = await fetchContentOne<SanityProject>(projectBySlugQuery, { slug });
  if (result.status !== "success") return result;
  const mapped = result.data ? mapProject(result.data) : null;
  if (!mapped) {
    // The document exists but failed validation: a data problem, not a missing
    // page and not an outage.
    return { status: "malformed", reason: "project document failed validation" };
  }
  return { status: "success", data: mapped };
}

export async function getSanityPosts(): Promise<ContentResult<BlogPost[]>> {
  const result = await fetchContentArray<SanityPost>(postsListQuery);
  if (result.status !== "success") return result;
  const items = result.data.map(mapPostSummary).filter((p): p is BlogPost => p !== null);
  return { status: "success", data: items };
}

export async function getSanityPostBySlug(slug: string): Promise<ContentResult<BlogPost>> {
  const result = await fetchContentOne<SanityPost>(postBySlugQuery, { slug });
  if (result.status !== "success") return result;
  const mapped = result.data ? mapBlogPostBody(result.data) : null;
  if (!mapped) {
    return { status: "malformed", reason: "post document failed validation" };
  }
  return { status: "success", data: mapped };
}

export async function getSanityCapabilities(): Promise<ContentResult<Capability[]>> {
  const result = await fetchContentArray<SanityCapability>(capabilitiesQuery);
  if (result.status !== "success") return result;
  const items = result.data.map(mapCapability).filter((c): c is Capability => c !== null);
  return { status: "success", data: items };
}

export async function getSanityTechnologies(): Promise<ContentResult<Technology[]>> {
  const result = await fetchContentArray<SanityTechnology>(technologiesQuery);
  if (result.status !== "success") return result;
  const items = result.data.map(mapTechnology).filter((t): t is Technology => t !== null);
  return { status: "success", data: items };
}

export async function getSanityExperience(): Promise<ContentResult<SanityExperience[]>> {
  return fetchContentArray<SanityExperience>(experienceQuery);
}

export async function getSanityTestimonials(): Promise<ContentResult<SanityTestimonial[]>> {
  return fetchContentArray<SanityTestimonial>(testimonialsQuery);
}

export async function getSanitySiteSettings(): Promise<ContentResult<SanitySiteSettings | null>> {
  return fetchContentOne<SanitySiteSettings>(siteSettingsQuery);
}
