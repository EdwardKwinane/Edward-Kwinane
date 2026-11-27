/**
 * Initial-HTML metadata for every public URL in the sitemap.
 *
 * The SPA is still the source of truth after hydration; this map only supplies
 * accurate, status-safe metadata for crawlers and link unfurlers that read the
 * raw HTML. `scripts/generate-route-html.mjs` injects these values into the
 * built route shells.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const ORIGIN = "https://edward-kwinane.vercel.app";
export const OWNER_NAME = "Edward Kwinane";
export const OG_IMAGE = `${ORIGIN}/og-image.png`;
export const SITEMAP_PATH = resolve(import.meta.dirname, "..", "public/sitemap.xml");

const SITE_DESCRIPTION =
  "Explore Edward Kwinane's approach to AI implementation, connecting business opportunities with AI strategy, engineering, integration and practical solutions.";

const website = (title, description) => ({ title, description, type: "website" });
const project = (title) => ({
  // Runtime detail pages append " — Edward Kwinane" to the CMS title. Keep the
  // initial shell identical so crawlers see the same title before and after
  // hydration.
  title: `${title} — Edward Kwinane`,
  description: `Implementation concept for ${title}. Presented with its actual status as a concept/demonstration; no client work or production deployment is claimed.`,
  type: "website",
});
const article = (title) => ({
  title: `${title} — Edward Kwinane`,
  // The page title carries the author suffix; structured data uses the raw
  // article title, matching BlogDetail.tsx after hydration. Authorship stays
  // in the separate author/Person nodes.
  headline: title,
  description: `Article by Edward Kwinane: ${title}. Notes on AI implementation, architecture and engineering practice.`,
  type: "article",
});

/** Must match public/sitemap.xml exactly; the build script enforces this. */
export const ROUTE_METADATA = {
  "/": website(
    "Edward Kwinane | AI Implementation Specialist",
    SITE_DESCRIPTION
  ),
  "/about": website(
    "About Edward Kwinane | AI Implementation Specialist",
    "Explore Edward Kwinane's approach to AI implementation, systems thinking and technical problem-solving."
  ),
  "/portfolio": website(
    "Projects and AI Explorations | Edward Kwinane",
    "Projects, prototypes and implementation concepts, each presented with its actual status."
  ),
  "/capabilities": website(
    "AI Implementation Capabilities | Edward Kwinane",
    "Areas of focus across AI opportunity, applications, workflow automation, integration, evaluation and optimisation."
  ),
  "/blog": website(
    "AI Implementation Insights | Edward Kwinane",
    "Notes on AI implementation, architecture, integration, reliability and responsible adoption."
  ),
  "/contact": website(
    "Contact Edward Kwinane | AI Implementation",
    "Discuss an AI opportunity or a professional enquiry with Edward Kwinane."
  ),
  "/portfolio/intelligent-rag-platform": project("Intelligent RAG Platform"),
  "/portfolio/ai-voice-agent": project("AI Voice Agent"),
  "/portfolio/ai-full-stack-product": project("AI Full-Stack Product"),
  "/portfolio/ai-chatbot-product": project("AI Chatbot Product"),
  "/portfolio/ai-automation-system": project("AI Automation System"),
  "/blog/how-ai-automation-is-transforming-e-commerce-operations": article(
    "How AI Automation Is Transforming E-Commerce Operations"
  ),
  "/blog/why-architecture-still-matters-in-the-ai-era": article(
    "Why Architecture Still Matters in the AI Era"
  ),
  "/blog/building-reliable-rag-pipelines": article("Building Reliable RAG Pipelines"),
  "/blog/from-idea-to-production": article("From Idea to Production: An AI-Native Build Flow"),
  "/blog/voice-agents-need-orchestration": article("Voice Agents Need Orchestration"),
  "/blog/agents-with-guardrails": article("Agents with Guardrails"),
  "/blog/full-stack-with-ai-layers": article("Full-Stack with AI Layers"),
};

/** Paths currently published in sitemap.xml, in sitemap order. */
export function sitemapPaths() {
  const xml = readFileSync(SITEMAP_PATH, "utf-8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  return locs.map((loc) => {
    const url = new URL(loc);
    if (url.origin !== ORIGIN) {
      throw new Error(`sitemap contains an off-origin URL: ${loc}`);
    }
    return url.pathname;
  });
}

/** JSON-LD matching the managed script written by Seo.tsx at runtime. */
export function structuredDataFor(path) {
  const meta = ROUTE_METADATA[path];
  const person = {
    "@type": "Person",
    "@id": `${ORIGIN}/#person`,
    name: OWNER_NAME,
    jobTitle: "AI Implementation Specialist",
    url: ORIGIN,
    description: SITE_DESCRIPTION,
    sameAs: [
      "https://www.linkedin.com/in/edward-kwinane",
      "https://github.com/edwardkwinane",
    ],
  };
  const nodes = [person];

  if (meta.type === "article") {
    nodes.push({
      "@type": "Article",
      headline: meta.headline,
      url: `${ORIGIN}${path}`,
      mainEntityOfPage: `${ORIGIN}${path}`,
      author: { "@id": `${ORIGIN}/#person` },
    });
  }

  return { "@context": "https://schema.org", "@graph": nodes };
}
