import {
  getSanityProjects,
  getSanityFeaturedProjects,
  getSanityProjectBySlug,
} from "@/lib/sanity/queries";

export type ProjectCategory = "AI" | "VOICE" | "RAG" | "CHATBOTS" | "AGENTS" | "FULL-STACK";

export interface ProjectSection {
  heading: string;
  body: string[];
}

export interface Project {
  slug: string;
  title: string;
  category: ProjectCategory;
  categories: ProjectCategory[];
  description: string;
  status: "SHIPPED" | "IN PRODUCTION" | "BUILDING" | "PLACEHOLDER";
  technologies: string[];
  placeholder: boolean;
  visual: {
    label: string;
    sublabel: string;
  };
  sections: ProjectSection[];
  related: string[];
  coverImage?: string;
  coverImageAlt?: string;
}

export const projectCategories: ProjectCategory[] = [
  "AI",
  "VOICE",
  "RAG",
  "CHATBOTS",
  "AGENTS",
  "FULL-STACK",
];

export const projects: Project[] = [
  {
    slug: "ai-voice-agent",
    title: "AI Voice Agent",
    category: "VOICE",
    categories: ["VOICE", "AI", "AGENTS"],
    description:
      "A real-time conversational voice system that understands context, executes tools and automates workflows — a template built to be replaced with a real client system.",
    status: "PLACEHOLDER",
    technologies: ["WebRTC", "STT", "LLM", "TTS", "Tools", "Node.js"],
    placeholder: true,
    visual: {
      label: "VOICE AGENT",
      sublabel: "Listen · Think · Execute · Respond",
    },
    sections: [
      {
        heading: "The Problem",
        body: [
          "PLACEHOLDER — Replace this section with the real problem the project solved. Describe the original challenge, the users affected and why existing solutions fell short.",
        ],
      },
      {
        heading: "The Approach",
        body: [
          "PLACEHOLDER — Replace this section with the actual design and build approach used to create the system, including key technical decisions and the reasoning behind them.",
        ],
      },
      {
        heading: "System Architecture",
        body: [
          "Voice input → Speech-to-text → LLM orchestration → Tool execution → Text-to-speech → Response. The orchestration layer routes intents, holds conversation context and decides when tools are required.",
        ],
      },
      {
        heading: "AI Workflow",
        body: [
          "PLACEHOLDER — Describe the AI workflow: model selection, prompting strategy, retrieval (if any), tool use, memory and fallback behavior.",
        ],
      },
      {
        heading: "Technology",
        body: ["PLACEHOLDER — List the concrete technologies, frameworks and services used in the final system."],
      },
      {
        heading: "Results",
        body: [
          "PLACEHOLDER — Add qualitative outcomes or real metrics here. No numbers are claimed until real data is provided.",
        ],
      },
      {
        heading: "Lessons",
        body: ["PLACEHOLDER — What was learned during the build that would change the next iteration?"],
      },
      {
        heading: "Next Steps",
        body: ["PLACEHOLDER — What would be built next for this system?"],
      },
    ],
    related: ["intelligent-rag-platform", "ai-chatbot-product"],
  },
  {
    slug: "intelligent-rag-platform",
    title: "Intelligent RAG Platform",
    category: "RAG",
    categories: ["RAG", "AI"],
    description:
      "A knowledge system that connects LLMs with private and structured information through retrieval-augmented generation — a template built to be replaced with a real implementation.",
    status: "PLACEHOLDER",
    technologies: ["Vector DB", "Embeddings", "LLM", "Chunking", "Retrieval", "API"],
    placeholder: true,
    visual: {
      label: "RAG PLATFORM",
      sublabel: "Documents → Embeddings → Retrieval → Answer",
    },
    sections: [
      {
        heading: "The Problem",
        body: [
          "PLACEHOLDER — Replace this section with the real problem: what knowledge needed to be unlocked, for whom and why it was previously unreachable.",
        ],
      },
      {
        heading: "The Approach",
        body: [
          "PLACEHOLDER — Describe the ingestion strategy, document processing, chunking rules and retrieval design.",
        ],
      },
      {
        heading: "System Architecture",
        body: [
          "Documents → Chunking → Embeddings → Vector database → Retrieval → LLM → Answer. Metadata filtering and hybrid search keep answers grounded in the right sources.",
        ],
      },
      {
        heading: "AI Workflow",
        body: [
          "PLACEHOLDER — Explain model choice, embedding model, retrieval strategy, citation behavior and evaluation approach.",
        ],
      },
      {
        heading: "Technology",
        body: ["PLACEHOLDER — List the vector store, embedding model, LLM, orchestration and API layer used."],
      },
      {
        heading: "Results",
        body: [
          "PLACEHOLDER — Add qualitative outcomes or real metrics here. No numbers are claimed until real data is provided.",
        ],
      },
      {
        heading: "Lessons",
        body: ["PLACEHOLDER — What worked, what did not and what changed the retrieval quality?"],
      },
      {
        heading: "Next Steps",
        body: ["PLACEHOLDER — What would improve this system next?"],
      },
    ],
    related: ["ai-voice-agent", "ai-full-stack-product"],
  },
  {
    slug: "ai-chatbot-product",
    title: "AI Chatbot Product",
    category: "CHATBOTS",
    categories: ["CHATBOTS", "AI"],
    description:
      "A context-aware conversational product built around a modern AI architecture — a template built to be replaced with a real product example.",
    status: "PLACEHOLDER",
    technologies: ["LLM", "Memory", "Context", "Tools", "React", "API"],
    placeholder: true,
    visual: {
      label: "CHATBOT PRODUCT",
      sublabel: "User → Context → Memory → LLM → Response",
    },
    sections: [
      {
        heading: "The Problem",
        body: [
          "PLACEHOLDER — Replace this section with the real problem: what conversational experience was needed and why.",
        ],
      },
      {
        heading: "The Approach",
        body: ["PLACEHOLDER — Describe the conversation design, context strategy and memory handling."],
      },
      {
        heading: "System Architecture",
        body: [
          "User → Chat interface → Context assembly → Memory → LLM → Tools → Response. The interface and intelligence layers stay decoupled so the product can evolve independently.",
        ],
      },
      {
        heading: "AI Workflow",
        body: ["PLACEHOLDER — Explain prompt strategy, context window management, tool routing and safety behavior."],
      },
      {
        heading: "Technology",
        body: ["PLACEHOLDER — List the frontend, backend, model and memory infrastructure used."],
      },
      {
        heading: "Results",
        body: [
          "PLACEHOLDER — Add qualitative outcomes or real metrics here. No numbers are claimed until real data is provided.",
        ],
      },
      {
        heading: "Lessons",
        body: ["PLACEHOLDER — What was learned about building conversational products?"],
      },
      {
        heading: "Next Steps",
        body: ["PLACEHOLDER — What would make this product better next?"],
      },
    ],
    related: ["intelligent-rag-platform", "ai-automation-system"],
  },
  {
    slug: "ai-full-stack-product",
    title: "AI Full-Stack Product",
    category: "FULL-STACK",
    categories: ["FULL-STACK", "AI"],
    description:
      "A production-ready application built from interface to infrastructure with AI services integrated — a template built to be replaced with a real product.",
    status: "PLACEHOLDER",
    technologies: ["React", "TypeScript", "API", "Database", "AI Services", "Deployment"],
    placeholder: true,
    visual: {
      label: "FULL-STACK PRODUCT",
      sublabel: "Frontend → API → AI → Database → Deploy",
    },
    sections: [
      {
        heading: "The Problem",
        body: ["PLACEHOLDER — Replace this section with the real product problem and target users."],
      },
      {
        heading: "The Approach",
        body: ["PLACEHOLDER — Describe the product build from interface to infrastructure."],
      },
      {
        heading: "System Architecture",
        body: [
          "Frontend → API layer → Backend → Database → AI services → Deployment. Each layer is a clear boundary so the product can ship incrementally.",
        ],
      },
      {
        heading: "AI Workflow",
        body: ["PLACEHOLDER — Explain where AI is used inside the product and how it creates leverage."],
      },
      {
        heading: "Technology",
        body: ["PLACEHOLDER — List the stack used across the full product."],
      },
      {
        heading: "Results",
        body: [
          "PLACEHOLDER — Add qualitative outcomes or real metrics here. No numbers are claimed until real data is provided.",
        ],
      },
      {
        heading: "Lessons",
        body: ["PLACEHOLDER — What was learned building a full product rather than a demo?"],
      },
      {
        heading: "Next Steps",
        body: ["PLACEHOLDER — What ships next?"],
      },
    ],
    related: ["ai-voice-agent", "ai-chatbot-product"],
  },
  {
    slug: "ai-automation-system",
    title: "AI Automation System",
    category: "AGENTS",
    categories: ["AGENTS", "AI", "FULL-STACK"],
    description:
      "An agent-driven automation system that plans, executes tools and observes results — a template built to be replaced with a real automation project.",
    status: "PLACEHOLDER",
    technologies: ["Agents", "LLM", "Tools", "Workflows", "APIs", "Observability"],
    placeholder: true,
    visual: {
      label: "AUTOMATION SYSTEM",
      sublabel: "Goal → Plan → Tools → Execute → Observe",
    },
    sections: [
      {
        heading: "The Problem",
        body: ["PLACEHOLDER — Replace this section with the real workflow that needed automation."],
      },
      {
        heading: "The Approach",
        body: ["PLACEHOLDER — Describe how the automation was designed and where humans remain in the loop."],
      },
      {
        heading: "System Architecture",
        body: [
          "Goal → Planning → Tools → Execution → Observation → Next action. An orchestration loop gives the agent clear boundaries and safe tool access.",
        ],
      },
      {
        heading: "AI Workflow",
        body: ["PLACEHOLDER — Explain the agent loop, tool catalogue, guardrails and failure handling."],
      },
      {
        heading: "Technology",
        body: ["PLACEHOLDER — List the agent framework, model, tools and monitoring used."],
      },
      {
        heading: "Results",
        body: [
          "PLACEHOLDER — Add qualitative outcomes or real metrics here. No numbers are claimed until real data is provided.",
        ],
      },
      {
        heading: "Lessons",
        body: ["PLACEHOLDER — What was learned about building reliable agent systems?"],
      },
      {
        heading: "Next Steps",
        body: ["PLACEHOLDER — What automation would be built next?"],
      },
    ],
    related: ["ai-voice-agent", "ai-full-stack-product"],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Sanity CMS data access                                               */
/*                                                                     */
/* The local `projects` array above is the seed source for              */
/* `npm run seed`, not a runtime fallback. The CMS is the only source   */
/* of truth, so a failed fetch surfaces as an empty list instead of     */
/* silently serving stale content.                                      */
/* ------------------------------------------------------------------ */

/** All projects from the CMS. */
export async function fetchProjects(): Promise<Project[]> {
  return getSanityProjects();
}

/** Featured projects for the home page. Uses `featured`, else the first four. */
export async function fetchFeaturedProjects(): Promise<Project[]> {
  return getSanityFeaturedProjects();
}

/** Single project by slug. */
export async function fetchProject(slug: string): Promise<Project | undefined> {
  const item = await getSanityProjectBySlug(slug);
  return item ?? undefined;
}