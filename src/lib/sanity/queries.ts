import type { QueryParams } from "@sanity/client";
import { client, isSanityConfigured } from "./client";
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
  estimatedReadingTime,
  "publishedAt": coalesce(publishedAt, _createdAt),
  "tags": coalesce(tags, []),
  coverImage,
  seoImage,
`;

const postsListQuery = `*[_type == "post"]
  | order(coalesce(featured, false) desc, coalesce(publishedAt, "") desc) {
    ${POST_LIST_FIELDS}
  }`;

const postBySlugQuery = `*[_type == "post" && slug.current == $slug][0] {
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
    heroHeadline,
    heroSubheadline,
    availabilityText,
    email,
    location,
    linkedinUrl,
    twitterUrl,
    githubUrl,
    resumeUrl,
    footerText
  }`;

/* ------------------------------------------------------------------ */
/* Safe fetch helpers                                                 */
/* ------------------------------------------------------------------ */

async function fetchArray<T>(query: string, params?: QueryParams): Promise<T[]> {
  if (!isSanityConfigured) return [];
  try {
    const result = params ? await client.fetch<T[]>(query, params) : await client.fetch<T[]>(query);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn("[sanity] fetch failed:", error);
    return [];
  }
}

async function fetchOne<T>(query: string, params?: QueryParams): Promise<T | null> {
  if (!isSanityConfigured) return null;
  try {
    const result = params ? await client.fetch<T | null>(query, params) : await client.fetch<T | null>(query);
    return result ?? null;
  } catch (error) {
    console.warn("[sanity] fetch failed:", error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Project mapping                                                    */
/* ------------------------------------------------------------------ */

const STATUS_MAP: Record<string, Project["status"]> = {
  shipped: "SHIPPED",
  "in-production": "IN PRODUCTION",
  building: "BUILDING",
  placeholder: "PLACEHOLDER",
};

function mapStatus(status?: string): Project["status"] {
  if (status && status in STATUS_MAP) return STATUS_MAP[status];
  return "IN PRODUCTION";
}

function mapVisual(
  p: Pick<SanityProject, "category" | "categories" | "technologies">
): { label: string; sublabel: string } {
  const cats = p.categories?.length ? p.categories : p.category ? [p.category] : [];
  const label = cats.length ? cats.join(" · ") : p.category ?? "PROJECT";
  const sublabel = (p.technologies?.slice(0, 3).map((t) => t.name).filter(Boolean) ?? []).join(" · ");
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

function mapProjectSummary(p: ProjectSummarySource): Project {
  const status = mapStatus(p.status);
  return {
    slug: p.slug?.current ?? p._id,
    title: p.title,
    category: (p.category as ProjectCategory) ?? "AI",
    categories: (p.categories as ProjectCategory[]) ?? [],
    description: p.description ?? "",
    status,
    technologies: (p.technologies ?? []).map((t) => t.name ?? "").filter(Boolean),
    placeholder: status === "PLACEHOLDER",
    visual: mapVisual(p),
    sections: [],
    related: [],
    coverImage: imageUrl(p.coverImage),
    coverImageAlt: p.coverImage?.alt,
  };
}

function buildSections(p: SanityProject): ProjectSection[] {
  const sections: ProjectSection[] = [];
  const add = (heading: string, body?: string) => {
    if (!body?.trim()) return;
    const paragraphs = body
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (paragraphs.length) sections.push({ heading, body: paragraphs });
  };

  add("The Problem", p.problem);
  add("Requirements", p.requirements);
  add("The Solution", p.solution);
  add("System Architecture", p.architecture);

  const technologies = (p.technologies ?? []).map((t) => t.name ?? "").filter(Boolean);
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
  if (!p._id) return null;
  const base = mapProjectSummary(p);
  return {
    ...base,
    related: (p.related ?? []).map(mapProjectSummary).map((r) => r.slug).slice(0, 2),
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

function tableOfContentsFromBody(body?: PortableTextBlock[]) {
  return (body ?? [])
    .filter((block) => block._type === "block" && block.style === "h2")
    .map((block) => {
      const text = (block.children ?? [])
        .map((child) => ("text" in child ? String(child.text) : ""))
        .join(" ")
        .trim();
      return { id: slugifyHeading(text), label: text };
    })
    .filter((item) => item.label);
}

function estimateReadingTime(body?: PortableTextBlock[]): string {
  let words = 0;
  for (const block of body ?? []) {
    if (block._type === "block") {
      for (const child of block.children ?? []) {
        if ("text" in child) words += String(child.text).split(/\s+/).filter(Boolean).length;
      }
    }
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
  | "estimatedReadingTime"
  | "publishedAt"
  | "tags"
  | "coverImage"
  | "body"
>;

function mapPostSummary(p: PostSummarySource): BlogPost {
  const readingTime = p.estimatedReadingTime
    ? `${p.estimatedReadingTime} min read`
    : p.body
      ? estimateReadingTime(p.body)
      : "— min read";
  return {
    slug: p.slug?.current ?? p._id,
    title: p.title,
    subtitle: p.subtitle ?? "",
    category: (p.category as BlogPost["category"]) ?? "AI ENGINEERING",
    excerpt: p.excerpt ?? "",
    author: p.author ?? "Edward Kwinane",
    date: p.publishedAt ? new Date(p.publishedAt).toISOString() : "",
    readingTime,
    featured: Boolean(p.featured),
    placeholder: false,
    tags: p.tags ?? [],
    related: [],
    coverImage: imageUrl(p.coverImage),
    coverImageAlt: p.coverImage?.alt,
  };
}

function mapBlogPostBody(p: SanityPost): BlogPost {
  const base = mapPostSummary(p);
  return {
    ...base,
    body: p.body,
    tableOfContents: tableOfContentsFromBody(p.body),
    readingTime: p.estimatedReadingTime
      ? `${p.estimatedReadingTime} min read`
      : estimateReadingTime(p.body),
    related: (p.related ?? []).map(mapPostSummary).map((r) => r.slug).slice(0, 2),
  };
}

/* ------------------------------------------------------------------ */
/* Capability / technology mapping                                    */
/* ------------------------------------------------------------------ */

function mapCapability(p: SanityCapability): Capability {
  return {
    id: p.slug?.current ?? p._id,
    name: p.name,
    index: p.index ?? "",
    eyebrow: p.eyebrow ?? "",
    headline: p.headline ?? p.name,
    description: p.description ?? p.shortDescription ?? "",
    labels: p.labels ?? [],
    flow: (p.flow ?? []).map((f) => ({ step: f.step ?? "", detail: f.detail ?? "" })),
  };
}

function mapTechnology(p: SanityTechnology): Technology {
  return {
    label: p.name,
    description: p.description,
  };
}

/* ------------------------------------------------------------------ */
/* Public data access functions                                       */
/* ------------------------------------------------------------------ */

export async function getSanityProjects(): Promise<Project[]> {
  const items = await fetchArray<SanityProject>(projectsListQuery);
  return items.map(mapProjectSummary).filter(Boolean);
}

export async function getSanityFeaturedProjects(): Promise<Project[]> {
  const items = await fetchArray<SanityProject>(projectsListQuery);
  const featured = items.filter((p) => Boolean(p.featured));
  return (featured.length ? featured : items).slice(0, 4).map(mapProjectSummary).filter(Boolean);
}

export async function getSanityProjectBySlug(slug: string): Promise<Project | null> {
  const item = await fetchOne<SanityProject>(projectBySlugQuery, { slug });
  return item ? mapProject(item) : null;
}

export async function getSanityPosts(): Promise<BlogPost[]> {
  const items = await fetchArray<SanityPost>(postsListQuery);
  return items.map(mapPostSummary).filter(Boolean);
}

export async function getSanityPostBySlug(slug: string): Promise<BlogPost | null> {
  const item = await fetchOne<SanityPost>(postBySlugQuery, { slug });
  return item ? mapBlogPostBody(item) : null;
}

export async function getSanityCapabilities(): Promise<Capability[]> {
  const items = await fetchArray<SanityCapability>(capabilitiesQuery);
  return items.map(mapCapability).filter(Boolean);
}

export async function getSanityTechnologies(): Promise<Technology[]> {
  const items = await fetchArray<SanityTechnology>(technologiesQuery);
  return items.map(mapTechnology).filter(Boolean);
}

export async function getSanityExperience(): Promise<SanityExperience[]> {
  return fetchArray<SanityExperience>(experienceQuery);
}

export async function getSanityTestimonials(): Promise<SanityTestimonial[]> {
  return fetchArray<SanityTestimonial>(testimonialsQuery);
}

export async function getSanitySiteSettings(): Promise<SanitySiteSettings | null> {
  return fetchOne<SanitySiteSettings>(siteSettingsQuery);
}