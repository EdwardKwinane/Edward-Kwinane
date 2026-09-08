import { defineType, defineField } from "sanity";

export const capability = defineType({
  name: "capability",
  title: "Capability",
  type: "document",
  description:
    "A service area such as AI Voice Agents, RAG Systems, AI Chatbots, AI Agents or Full-Stack Development.",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "Display name, e.g. 'AI Voice Agents'.",
      validation: (rule) => rule.required().min(1).error("A name is required."),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required().error("A slug is required."),
    }),
    defineField({
      name: "index",
      title: "Index",
      type: "string",
      description: "Number shown before the title, e.g. '01'.",
    }),
    defineField({
      name: "eyebrow",
      title: "Eyebrow",
      type: "string",
      description: "Uppercase label above the headline, e.g. 'CAPABILITY 01 — VOICE AGENTS'.",
    }),
    defineField({
      name: "headline",
      title: "Headline",
      type: "string",
      description: "Strong two or three word headline, e.g. 'Voice interfaces that feel natural.'",
    }),
    defineField({
      name: "shortDescription",
      title: "Short description",
      type: "text",
      rows: 3,
      description: "Used on the home page capability cards.",
    }),
    defineField({
      name: "description",
      title: "Full description",
      type: "text",
      rows: 6,
      description: "Used on the capabilities page.",
    }),
    defineField({
      name: "labels",
      title: "Labels",
      type: "array",
      description: "Short uppercase tags, e.g. VOICE SYSTEMS, REAL-TIME, TOOLS.",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "flow",
      title: "System flow",
      type: "array",
      description:
        "Steps shown as an architecture diagram, e.g. LISTENING → THINKING → EXECUTING → RESPONDING.",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "step",
              title: "Step",
              type: "string",
              validation: (rule) => rule.required().error("Each flow step needs a label."),
            }),
            defineField({
              name: "detail",
              title: "Detail",
              type: "string",
            }),
          ],
          preview: {
            select: { title: "step", subtitle: "detail" },
          },
        },
      ],
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      description: "Optional icon identifier for future UI use (e.g. 'mic', 'database').",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Voice", value: "voice" },
          { title: "Knowledge", value: "knowledge" },
          { title: "Conversation", value: "conversation" },
          { title: "Autonomous", value: "autonomous" },
          { title: "Product", value: "product" },
        ],
      },
    }),
    defineField({
      name: "technologies",
      title: "Technologies",
      type: "array",
      of: [{ type: "reference", to: [{ type: "technology" }] }],
    }),
    defineField({
      name: "useCases",
      title: "Use cases",
      type: "array",
      description: "Optional examples of situations this capability applies to.",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
          ],
          preview: {
            select: { title: "title" },
          },
        },
      ],
    }),
    defineField({
      name: "benefits",
      title: "Benefits",
      type: "array",
      description: "Optional list of client benefits.",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "ctaLabel",
      title: "Call to action label",
      type: "string",
      description: "Optional button text if this capability gets its own call to action.",
    }),
    defineField({
      name: "ctaDestination",
      title: "Call to action destination",
      type: "url",
      description: "Optional URL for the call to action.",
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      description: "Featured capabilities appear on the home page.",
      initialValue: false,
    }),
    defineField({
      name: "displayOrder",
      title: "Display order",
      type: "number",
      description: "Lower numbers sort first.",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  orderings: [
    {
      title: "Display order",
      name: "displayOrderAsc",
      by: [{ field: "displayOrder", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "name",
      headline: "headline",
      featured: "featured",
    },
    prepare({ title, headline, featured }) {
      return {
        title: title ?? "Untitled capability",
        subtitle: [headline, featured ? "Featured" : ""].filter(Boolean).join(" · "),
      };
    },
  },
});