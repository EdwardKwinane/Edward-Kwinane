import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "./helpers";

/**
 * Raw initial-HTML contract for all 18 sitemap URLs.
 *
 * The files are read directly from `dist/`, not requested from `vite preview`:
 * Vite's preview server always applies its SPA history fallback, whereas Vercel
 * gives the filesystem precedence over rewrites. These assertions prove the
 * generated files themselves are correct; the Vercel serving order is verified
 * separately against the official `vercel.json` documentation.
 */

interface Shell {
  path: string;
  title: string;
  description: string;
  type: "website" | "article";
  headline?: string;
}

const project = (name: string): Shell => ({
  path: `/portfolio/${name.toLowerCase().replaceAll(" ", "-")}`,
  title: `${name} — Edward Kwinane`,
  description: `Implementation concept for ${name}. Presented with its actual status as a concept/demonstration; no client work or production deployment is claimed.`,
  type: "website",
});

const article = (slug: string, name: string): Shell => ({
  path: `/blog/${slug}`,
  title: `${name} — Edward Kwinane`,
  headline: name,
  description: `Article by Edward Kwinane: ${name}. Notes on AI implementation, architecture and engineering practice.`,
  type: "article",
});

const SITE_DESCRIPTION =
  "Explore Edward Kwinane's approach to AI implementation, connecting business opportunities with AI strategy, engineering, integration and practical solutions.";

const SHELLS: Shell[] = [
  {
    path: "/",
    title: "Edward Kwinane | AI Implementation Specialist",
    description: SITE_DESCRIPTION,
    type: "website",
  },
  {
    path: "/about",
    title: "About Edward Kwinane | AI Implementation Specialist",
    description:
      "Explore Edward Kwinane's approach to AI implementation, systems thinking and technical problem-solving.",
    type: "website",
  },
  {
    path: "/portfolio",
    title: "Projects and AI Explorations | Edward Kwinane",
    description:
      "Projects, prototypes and implementation concepts, each presented with its actual status.",
    type: "website",
  },
  {
    path: "/capabilities",
    title: "AI Implementation Capabilities | Edward Kwinane",
    description:
      "Areas of focus across AI opportunity, applications, workflow automation, integration, evaluation and optimisation.",
    type: "website",
  },
  {
    path: "/blog",
    title: "AI Implementation Insights | Edward Kwinane",
    description:
      "Notes on AI implementation, architecture, integration, reliability and responsible adoption.",
    type: "website",
  },
  {
    path: "/contact",
    title: "Contact Edward Kwinane | AI Implementation",
    description:
      "Discuss an AI opportunity or a professional enquiry with Edward Kwinane.",
    type: "website",
  },
  project("Intelligent RAG Platform"),
  project("AI Voice Agent"),
  project("AI Full-Stack Product"),
  project("AI Chatbot Product"),
  project("AI Automation System"),
  article(
    "how-ai-automation-is-transforming-e-commerce-operations",
    "How AI Automation Is Transforming E-Commerce Operations"
  ),
  article("why-architecture-still-matters-in-the-ai-era", "Why Architecture Still Matters in the AI Era"),
  article("building-reliable-rag-pipelines", "Building Reliable RAG Pipelines"),
  article("from-idea-to-production", "From Idea to Production: An AI-Native Build Flow"),
  article("voice-agents-need-orchestration", "Voice Agents Need Orchestration"),
  article("agents-with-guardrails", "Agents with Guardrails"),
  article("full-stack-with-ai-layers", "Full-Stack with AI Layers"),
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const decode = (value: string) =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

function metaContent(html: string, attr: "name" | "property", key: string): string | null {
  // A quoted attribute is followed by whitespace or `>`, never by a word
  // boundary, so use an explicit delimiter instead of `\b`.
  const pattern = new RegExp(
    `<meta\\b[^>]*\\s${attr}="${escapeRegExp(key)}"(?=\\s|>)[^>]*\\scontent="([^"]*)"(?=\\s|>)`,
    "i"
  );
  const match = html.match(pattern);
  return match ? decode(match[1]) : null;
}

function count(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

function rawHead(html: string) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  const canonical =
    html.match(/<link\b[^>]*\srel="canonical"(?=\s|>)[^>]*\shref="([^"]*)"(?=\s|>)/i)?.[1] ?? null;
  const structured = html.match(
    /<script\b[^>]*\sid="structured-data"(?=\s|>)[^>]*>([\s\S]*?)<\/script>/i
  )?.[1];

  return {
    title: title ? decode(title) : null,
    canonical: canonical ? decode(canonical) : null,
    structured: structured ?? null,
    canonicalCount: count(html, /<link\b[^>]*\srel="canonical"(?:\s|>)[^>]*>/gi),
    descriptionCount: count(html, /<meta\b[^>]*\sname="description"(?:\s|>)[^>]*>/gi),
    structuredCount: count(html, /\sid="structured-data"(?:\s|>)/gi),
    noindexCount: count(html, /<meta\b[^>]*\sname="robots"(?:\s|>)[^>]*\scontent="[^"]*noindex/gi),
    hasBundle: /<script\b[^>]*\bsrc="\/assets\/[^"]+\.js"/i.test(html),
  };
}

const ORIGIN = "https://edward-kwinane.vercel.app";
const DIST = resolve(process.cwd(), "dist");

function shellFile(path: string): string {
  const relative = path === "/" ? "index.html" : `${path.replace(/^\//, "")}/index.html`;
  return resolve(DIST, relative);
}

test.describe("generated initial HTML shells", () => {
  expect(SHELLS).toHaveLength(18);

  for (const shell of SHELLS) {
    test(`${shell.path} writes route-specific metadata into its own HTML file`, () => {
      const html = readFileSync(shellFile(shell.path), "utf-8");
      const head = rawHead(html);
      const origin = ORIGIN;

      expect(head.title).toBe(shell.title);
      expect(head.canonical).toBe(`${origin}${shell.path}`);
      expect(head.canonicalCount).toBe(1);
      expect(head.descriptionCount).toBe(1);
      expect(head.structuredCount).toBe(1);
      expect(head.noindexCount).toBe(0);
      expect(head.hasBundle).toBe(true);

      expect(metaContent(html, "name", "description")).toBe(shell.description);
      expect(metaContent(html, "property", "og:title")).toBe(shell.title);
      expect(metaContent(html, "property", "og:description")).toBe(shell.description);
      expect(metaContent(html, "property", "og:type")).toBe(shell.type);
      expect(metaContent(html, "property", "og:url")).toBe(`${origin}${shell.path}`);
      expect(metaContent(html, "name", "twitter:title")).toBe(shell.title);
      expect(metaContent(html, "name", "twitter:description")).toBe(shell.description);

      expect(head.structured).not.toBeNull();
      const graph = JSON.parse(head.structured!) as {
        "@context": string;
        "@graph": Array<Record<string, unknown>>;
      };
      expect(graph["@context"]).toBe("https://schema.org");
      const person = graph["@graph"].find((node) => node["@type"] === "Person");
      expect(person).toBeDefined();
      expect(person?.jobTitle).toBe("AI Implementation Specialist");
      expect(person?.name).toBe("Edward Kwinane");

      if (shell.type === "article") {
        const articleNode = graph["@graph"].find((node) => node["@type"] === "Article");
        expect(articleNode).toBeDefined();
        expect(articleNode?.headline).toBe(shell.headline);
        expect(articleNode?.headline).not.toContain("— Edward Kwinane");
        // Authorship remains a separate reference to the Person node above.
        expect(articleNode?.author).toEqual({ "@id": `${origin}/#person` });
      }

      // Stale Phase 0 copy must not survive in any raw shell.
      expect(html).not.toContain("AI Engineer & Digital Architect");
      expect(html).not.toContain("AI Engineer &amp; Digital Architect");
      expect(html).not.toContain("I build AI-native products from concept to production");
    });
  }
});
