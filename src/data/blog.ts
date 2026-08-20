export type BlogCategory =
  | "AI ENGINEERING"
  | "VOICE AI"
  | "RAG"
  | "LLMs"
  | "AGENTS"
  | "FULL-STACK"
  | "SYSTEM DESIGN";

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  category: BlogCategory;
  excerpt: string;
  author: string;
  date: string;
  readingTime: string;
  featured: boolean;
  placeholder: boolean;
  tags: string[];
  tableOfContents: { id: string; label: string }[];
  content: {
    type: "p" | "h2" | "h3" | "ul" | "ol" | "code" | "callout" | "quote" | "diagram";
    id?: string;
    text?: string;
    items?: string[];
    code?: string;
    title?: string;
  }[];
  related: string[];
}

export const blogCategories: BlogCategory[] = [
  "AI ENGINEERING",
  "VOICE AI",
  "RAG",
  "LLMs",
  "AGENTS",
  "FULL-STACK",
  "SYSTEM DESIGN",
];

export const blogFilterCategories = [
  "ALL",
  "AI ENGINEERING",
  "VOICE AI",
  "RAG",
  "AGENTS",
  "FULL-STACK",
] as const;

export const blogPosts: BlogPost[] = [
  {
    slug: "why-architecture-still-matters-in-the-ai-era",
    title: "Why Architecture Still Matters in the AI Era",
    subtitle:
      "AI makes building faster. It does not make thinking unnecessary. The systems that survive are the ones designed before they were coded.",
    category: "SYSTEM DESIGN",
    excerpt:
      "AI removes implementation friction, which raises the value of decisions made before the first line of code. A practical look at why system design is the real bottleneck.",
    author: "Edward Kwinane",
    date: "2026-07-14",
    readingTime: "6 min read",
    featured: true,
    placeholder: true,
    tags: ["system design", "architecture", "AI-native"],
    tableOfContents: [
      { id: "the-shift", label: "The shift" },
      { id: "what-ai-changed", label: "What AI actually changed" },
      { id: "design-before-code", label: "Design before code" },
      { id: "principles", label: "Principles that hold" },
    ],
    content: [
      {
        type: "callout",
        title: "PLACEHOLDER ARTICLE",
        text: "This is a placeholder article written to demonstrate the reading experience. Replace it with a real technical post.",
      },
      { type: "p", text: "The last few years have made it dramatically cheaper to write code. What has not become cheaper is knowing what to build and how the pieces should fit together. This post argues that system design — not model choice — is the durable skill." },
      { type: "h2", id: "the-shift", text: "The shift" },
      { type: "p", text: "When generating a working component takes minutes instead of days, the limiting factor moves upstream. The question is no longer 'can we build it' but 'should it be shaped like this at all'." },
      { type: "h2", id: "what-ai-changed", text: "What AI actually changed" },
      { type: "p", text: "AI changed the cost curve of implementation. It did not change the cost of wrong boundaries, unmanageable state or missing reliability. Those costs compound the same way they always have." },
      { type: "ul", items: ["Implementation speed improved", "Design decisions did not get cheaper", "Integration complexity remains the hard part"] },
      { type: "h2", id: "design-before-code", text: "Design before code" },
      { type: "p", text: "The most efficient workflows I have found start with a bounded design: what the system must do, what it must not do, and the contracts between its parts. Code becomes an implementation detail of a clear intent." },
      { type: "h2", id: "principles", text: "Principles that hold" },
      { type: "p", text: "Clear boundaries, explicit contracts, reversible decisions and measurable outcomes. These principles predate AI and they will outlast the current model cycle." },
      { type: "quote", text: "AI makes building faster. It does not make thinking unnecessary." },
    ],
    related: ["building-reliable-rag-pipelines", "from-idea-to-production"],
  },
  {
    slug: "building-reliable-rag-pipelines",
    title: "Building Reliable RAG Pipelines",
    subtitle:
      "Retrieval quality decides answer quality. A practical walk through chunking, embeddings and evaluation.",
    category: "RAG",
    excerpt:
      "Most RAG failures are retrieval failures, not model failures. Notes on chunking strategies, embedding choice and the evaluation loop that makes a pipeline trustworthy.",
    author: "Edward Kwinane",
    date: "2026-06-22",
    readingTime: "8 min read",
    featured: false,
    placeholder: true,
    tags: ["rag", "retrieval", "embeddings", "evaluation"],
    tableOfContents: [
      { id: "start-with-retrieval", label: "Start with retrieval" },
      { id: "chunking", label: "Chunking" },
      { id: "embeddings", label: "Embeddings" },
      { id: "evaluate", label: "Evaluate" },
    ],
    content: [
      {
        type: "callout",
        title: "PLACEHOLDER ARTICLE",
        text: "This is a placeholder article written to demonstrate the reading experience. Replace it with a real technical post.",
      },
      { type: "p", text: "Retrieval-augmented generation is a pipeline, and pipelines are only as strong as their weakest stage. In my experience the weakest stage is almost always retrieval." },
      { type: "h2", id: "start-with-retrieval", text: "Start with retrieval" },
      { type: "p", text: "Before tuning prompts, measure whether the right context actually surfaces. If the answer is not in the retrieved window, no amount of prompt engineering fixes it." },
      { type: "h2", id: "chunking", text: "Chunking" },
      { type: "p", text: "Chunk size and overlap trade relevance against coherence. Small chunks retrieve precisely; large chunks carry context. The right size depends on your documents, not a default." },
      { type: "h2", id: "embeddings", text: "Embeddings" },
      { type: "p", text: "The embedding model sets an upper bound on retrieval quality. Evaluate alternatives on your own corpus instead of assuming the default is best." },
      { type: "h2", id: "evaluate", text: "Evaluate" },
      { type: "p", text: "Build a small golden set of question–answer pairs and score retrieval hit-rate and final answer quality on every change. Without this loop, improvements are guesswork." },
    ],
    related: ["why-architecture-still-matters-in-the-ai-era", "from-idea-to-production"],
  },
  {
    slug: "from-idea-to-production",
    title: "From Idea to Production: An AI-Native Build Flow",
    subtitle:
      "A repeatable sequence for turning an ambiguous idea into a deployed system without losing the thread.",
    category: "AI ENGINEERING",
    excerpt:
      "Ideas are cheap; production systems are expensive. A practical workflow for moving an AI product from concept to deployed reality with the least waste.",
    author: "Edward Kwinane",
    date: "2026-05-30",
    readingTime: "7 min read",
    featured: false,
    placeholder: true,
    tags: ["workflow", "production", "AI-native"],
    tableOfContents: [
      { id: "discover", label: "Discover" },
      { id: "architect", label: "Architect" },
      { id: "build", label: "Build" },
      { id: "validate", label: "Validate" },
      { id: "ship", label: "Ship and evolve" },
    ],
    content: [
      {
        type: "callout",
        title: "PLACEHOLDER ARTICLE",
        text: "This is a placeholder article written to demonstrate the reading experience. Replace it with a real technical post.",
      },
      { type: "p", text: "Most AI projects do not fail because the model was wrong. They fail because nobody bounded the problem, or because the system was never shaped for production from the start." },
      { type: "h2", id: "discover", text: "Discover" },
      { type: "p", text: "The first step is not choosing a model — it is defining the outcome and its constraints. What must the system do, what must it never do, and who is served?" },
      { type: "h2", id: "architect", text: "Architect" },
      { type: "p", text: "Design the boundaries before writing code: interface, orchestration, intelligence, knowledge and infrastructure. Each boundary stays replaceable." },
      { type: "h2", id: "build", text: "Build" },
      { type: "p", text: "With boundaries defined, building becomes implementation rather than invention. AI accelerates this stage precisely because the design already exists." },
      { type: "h2", id: "validate", text: "Validate" },
      { type: "p", text: "Measure against the outcome, not against vibes. Retrieval hit-rate, failure rates, latency and the qualitative experience of real users." },
      { type: "h2", id: "ship", text: "Ship and evolve" },
      { type: "p", text: "Deploy, observe, then improve. The production loop never ends; the design loop should close as early as possible." },
    ],
    related: ["why-architecture-still-matters-in-the-ai-era", "building-reliable-rag-pipelines"],
  },
  {
    slug: "voice-agents-need-orchestration",
    title: "Voice Agents Need Orchestration",
    subtitle:
      "Latency is a feature. A look at why the orchestration layer makes or breaks real-time voice systems.",
    category: "VOICE AI",
    excerpt:
      "Real-time voice is unforgiving: every stage adds latency and every drop in quality is felt immediately. Notes on the orchestration layer that keeps conversations moving.",
    author: "Edward Kwinane",
    date: "2026-04-18",
    readingTime: "5 min read",
    featured: false,
    placeholder: true,
    tags: ["voice", "agents", "latency", "orchestration"],
    tableOfContents: [
      { id: "real-time", label: "Real time is unforgiving" },
      { id: "orchestration", label: "The orchestration layer" },
      { id: "tradeoffs", label: "Tradeoffs that matter" },
    ],
    content: [
      {
        type: "callout",
        title: "PLACEHOLDER ARTICLE",
        text: "This is a placeholder article written to demonstrate the reading experience. Replace it with a real technical post.",
      },
      { type: "p", text: "Text chat tolerates a two-second pause. Voice does not. Real-time conversational systems are judged on rhythm, and rhythm is decided by the orchestration layer." },
      { type: "h2", id: "real-time", text: "Real time is unforgiving" },
      { type: "p", text: "Speech-to-text, orchestration, model inference and text-to-speech each add latency. The pipeline must be designed to start responding before the user finishes speaking." },
      { type: "h2", id: "orchestration", text: "The orchestration layer" },
      { type: "p", text: "The orchestrator decides what to do in the gaps: interrupt handling, barge-in, tool calls, and when to return the floor. It is the difference between a bot and a conversation." },
      { type: "h2", id: "tradeoffs", text: "Tradeoffs that matter" },
      { type: "p", text: "Smaller models answer faster but reason less. Cached context helps until it is stale. Every choice is a latency–quality tradeoff that must be made deliberately." },
    ],
    related: ["building-reliable-rag-pipelines", "from-idea-to-production"],
  },
  {
    slug: "agents-with-guardrails",
    title: "Agents with Guardrails",
    subtitle:
      "Autonomy without boundaries is just a bug with a plan. Designing tool access and failure handling for agent systems.",
    category: "AGENTS",
    excerpt:
      "Agent loops only ship when their boundaries are explicit. On tool catalogues, human-in-the-loop checks and the failure paths that make agents safe.",
    author: "Edward Kwinane",
    date: "2026-03-09",
    readingTime: "6 min read",
    featured: false,
    placeholder: true,
    tags: ["agents", "tools", "guardrails", "safety"],
    tableOfContents: [
      { id: "boundaries", label: "Boundaries before autonomy" },
      { id: "tools", label: "The tool catalogue" },
      { id: "failure", label: "Failure is a design input" },
    ],
    content: [
      {
        type: "callout",
        title: "PLACEHOLDER ARTICLE",
        text: "This is a placeholder article written to demonstrate the reading experience. Replace it with a real technical post.",
      },
      { type: "p", text: "The agent loop — plan, execute, observe, repeat — is powerful precisely because it is open-ended. That openness is why it needs design constraints more than any other AI pattern." },
      { type: "h2", id: "boundaries", text: "Boundaries before autonomy" },
      { type: "p", text: "Define what the agent may touch, what it may never touch and where a human must confirm. Permission sets are architecture, not policy paperwork." },
      { type: "h2", id: "tools", text: "The tool catalogue" },
      { type: "p", text: "Fewer, well-described tools beat a sprawling surface area. Every tool is an attack surface and a failure point; each one earns its place." },
      { type: "h2", id: "failure", text: "Failure is a design input" },
      { type: "p", text: "Agents fail differently than deterministic code. Timeouts, tool errors and ambiguous observations must be handled explicitly — otherwise the loop runs forever or silently stops." },
    ],
    related: ["why-architecture-still-matters-in-the-ai-era", "voice-agents-need-orchestration"],
  },
  {
    slug: "full-stack-with-ai-layers",
    title: "Full-Stack with AI Layers",
    subtitle:
      "Where AI belongs in a product, and where it should not go. Keeping intelligence a service, not a tangle.",
    category: "FULL-STACK",
    excerpt:
      "AI inside a product works best when it behaves like a service boundary. On keeping the intelligence layer clean inside a conventional stack.",
    author: "Edward Kwinane",
    date: "2026-02-14",
    readingTime: "5 min read",
    featured: false,
    placeholder: true,
    tags: ["full-stack", "architecture", "AI-native"],
    tableOfContents: [
      { id: "service", label: "AI as a service boundary" },
      { id: "frontend", label: "Keep the frontend honest" },
      { id: "when-not", label: "When not to use AI" },
    ],
    content: [
      {
        type: "callout",
        title: "PLACEHOLDER ARTICLE",
        text: "This is a placeholder article written to demonstrate the reading experience. Replace it with a real technical post.",
      },
      { type: "p", text: "The most maintainable AI products treat intelligence as a service behind a contract, exactly like a database or a payment provider." },
      { type: "h2", id: "service", text: "AI as a service boundary" },
      { type: "p", text: "When the model changes — and it will — the rest of the product should not notice. A clean interface around the intelligence layer makes that possible." },
      { type: "h2", id: "frontend", text: "Keep the frontend honest" },
      { type: "p", text: "Loading, streaming, empty and error states are not optional for AI UIs. The interface must communicate what the system is doing at every moment." },
      { type: "h2", id: "when-not", text: "When not to use AI" },
      { type: "p", text: "Deterministic logic, validation and lookup tables do not need a model. Using AI where a simple function works adds cost, latency and unpredictability." },
    ],
    related: ["from-idea-to-production", "why-architecture-still-matters-in-the-ai-era"],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((b) => b.slug === slug);
}