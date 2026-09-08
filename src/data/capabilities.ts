import type { Capability } from "./technologies";

import { getSanityCapabilities } from "@/lib/sanity/queries";

export interface CapabilityPreviewItem {
  id: string;
  title: string;
  description: string;
  labels: string[];
}

export const capabilities: Capability[] = [
  {
    id: "voice-agents",
    index: "01",
    eyebrow: "CAPABILITY 01 — VOICE AGENTS",
    headline: "Voice interfaces that feel natural.",
    description:
      "Real-time conversational systems that understand context, execute tools and automate workflows — built to sound and feel human.",
    labels: ["LISTENING", "THINKING", "EXECUTING", "RESPONDING"],
    flow: [
      { step: "LISTENING", detail: "Speech-to-text with interruption handling" },
      { step: "THINKING", detail: "Intent understanding and orchestration" },
      { step: "EXECUTING", detail: "Tool calls and workflow automation" },
      { step: "RESPONDING", detail: "Natural text-to-speech reply" },
    ],
  },
  {
    id: "rag",
    index: "02",
    eyebrow: "CAPABILITY 02 — RAG SYSTEMS",
    headline: "Turning knowledge into intelligence.",
    description:
      "Knowledge systems that connect LLMs with private and structured information, delivering grounded and trustworthy answers.",
    labels: ["DOCUMENTS", "CHUNKING", "EMBEDDINGS", "VECTOR DB", "RETRIEVAL", "LLM", "ANSWER"],
    flow: [
      { step: "DOCUMENTS", detail: "Source knowledge and content" },
      { step: "CHUNKING", detail: "Segmented into retrievable pieces" },
      { step: "EMBEDDINGS", detail: "Converted into vector representations" },
      { step: "VECTOR DB", detail: "Stored and indexed for similarity search" },
      { step: "RETRIEVAL", detail: "Relevant context surfaced per query" },
      { step: "LLM", detail: "Grounds the generated answer" },
      { step: "ANSWER", detail: "Response with source context" },
    ],
  },
  {
    id: "ai-chatbots",
    index: "03",
    eyebrow: "CAPABILITY 03 — AI CHATBOTS",
    headline: "Conversational products with real context.",
    description:
      "Context-aware conversational products built around modern AI architectures — from support assistants to interactive tools.",
    labels: ["USER", "CHAT", "CONTEXT", "MEMORY", "LLM", "TOOLS", "RESPONSE"],
    flow: [
      { step: "USER", detail: "Initiates the conversation" },
      { step: "CHAT", detail: "Conversational interface" },
      { step: "CONTEXT", detail: "Conversation and product context" },
      { step: "MEMORY", detail: "Persistent state across turns" },
      { step: "LLM", detail: "Reasoning over the assembled context" },
      { step: "TOOLS", detail: "Actions taken when needed" },
      { step: "RESPONSE", detail: "Useful, grounded reply" },
    ],
  },
  {
    id: "ai-agents",
    index: "04",
    eyebrow: "CAPABILITY 04 — AI AGENTS",
    headline: "Autonomous systems with clear boundaries.",
    description:
      "Agent systems that plan, use tools, execute and observe — designed with guardrails so autonomy stays safe and reliable.",
    labels: ["GOAL", "PLANNING", "TOOLS", "EXECUTION", "OBSERVATION", "NEXT ACTION"],
    flow: [
      { step: "GOAL", detail: "Clear objective defined" },
      { step: "PLANNING", detail: "Steps broken down" },
      { step: "TOOLS", detail: "Catalogue of permitted actions" },
      { step: "EXECUTION", detail: "Actions performed safely" },
      { step: "OBSERVATION", detail: "Results fed back into the loop" },
      { step: "NEXT ACTION", detail: "Loop continues until done" },
    ],
  },
  {
    id: "full-stack",
    index: "05",
    eyebrow: "CAPABILITY 05 — FULL-STACK DEVELOPMENT",
    headline: "Production-ready, from interface to infrastructure.",
    description:
      "Modern full-stack applications built end to end — clean frontends, solid APIs, real databases and deployed infrastructure.",
    labels: ["FRONTEND", "API", "BACKEND", "DATABASE", "AI SERVICES", "DEPLOYMENT"],
    flow: [
      { step: "FRONTEND", detail: "Interface and experience" },
      { step: "API", detail: "Contract between client and server" },
      { step: "BACKEND", detail: "Business logic and services" },
      { step: "DATABASE", detail: "Persistent, structured data" },
      { step: "AI SERVICES", detail: "Intelligence integrated as a service" },
      { step: "DEPLOYMENT", detail: "Scalable, observable infrastructure" },
    ],
  },
];

export const capabilitiesPreview: CapabilityPreviewItem[] = [
  {
    id: "voice",
    title: "AI Voice Agents",
    description:
      "Real-time conversational systems that understand context, execute tools and automate workflows.",
    labels: ["VOICE SYSTEMS", "REAL-TIME", "TOOLS"],
  },
  {
    id: "rag",
    title: "RAG Systems",
    description: "Knowledge systems that connect LLMs with private and structured information.",
    labels: ["RAG PIPELINE", "EMBEDDINGS", "VECTOR DB"],
  },
  {
    id: "chatbots",
    title: "AI Chatbots",
    description: "Context-aware conversational products built around modern AI architectures.",
    labels: ["CHATBOTS", "MEMORY", "CONTEXT"],
  },
  {
    id: "fullstack",
    title: "Full-Stack Products",
    description: "Production-ready applications built from interface to infrastructure.",
    labels: ["FULL-STACK", "API", "DEPLOYMENT"],
  },
];

/* ------------------------------------------------------------------ */
/* Sanity CMS data access — falls back to local placeholder data       */
/* ------------------------------------------------------------------ */

/** Full capabilities for the capabilities page. Falls back to local data. */
export async function fetchCapabilities(): Promise<Capability[]> {
  const items = await getSanityCapabilities();
  return items.length ? items : capabilities;
}

/** Compact capability cards for the home page. Falls back to local data. */
export async function fetchCapabilityPreview(): Promise<CapabilityPreviewItem[]> {
  const items = await getSanityCapabilities();
  if (!items.length) return capabilitiesPreview;

  return items.slice(0, 4).map((cap) => ({
    id: cap.id,
    title: cap.name || cap.headline || "Capability",
    description: cap.description,
    labels: cap.labels,
  }));
}