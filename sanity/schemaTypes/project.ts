import { defineType, defineField } from "sanity";

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().min(1).error("A title is required."),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "Appears in the URL: /portfolio/<slug>",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required().error("A slug is required."),
    }),
    defineField({
      name: "shortDescription",
      title: "Short description",
      type: "text",
      rows: 3,
      description: "One or two sentences shown on project cards.",
    }),
    defineField({
      name: "fullDescription",
      title: "Full description",
      type: "text",
      rows: 4,
      description: "Longer summary shown at the top of the project page.",
    }),
    defineField({
      name: "coverImage",
      title: "Cover image",
      type: "image",
      options: { hotspot: true },
      description: "Optional. Shown on project cards and the project page.",
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "Short accessible description of the image.",
        }),
      ],
    }),
    defineField({
      name: "galleryImages",
      title: "Gallery images",
      type: "array",
      description: "Optional. Additional images for the case study.",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alt text",
              type: "string",
            }),
          ],
        },
      ],
    }),
    defineField({
      name: "category",
      title: "Primary category",
      type: "string",
      options: {
        list: [
          { title: "AI", value: "AI" },
          { title: "Voice", value: "VOICE" },
          { title: "RAG", value: "RAG" },
          { title: "Chatbots", value: "CHATBOTS" },
          { title: "Agents", value: "AGENTS" },
          { title: "Full-Stack", value: "FULL-STACK" },
        ],
      },
      validation: (rule) => rule.required().error("Pick the primary category."),
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      description: "All categories this project belongs to (used for filtering).",
      of: [
        {
          type: "string",
          options: {
            list: [
              { title: "AI", value: "AI" },
              { title: "Voice", value: "VOICE" },
              { title: "RAG", value: "RAG" },
              { title: "Chatbots", value: "CHATBOTS" },
              { title: "Agents", value: "AGENTS" },
              { title: "Full-Stack", value: "FULL-STACK" },
            ],
          },
        },
      ],
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Shipped", value: "shipped" },
          { title: "In Production", value: "in-production" },
          { title: "Building", value: "building" },
          { title: "Placeholder", value: "placeholder" },
        ],
      },
      initialValue: "shipped",
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      description: "Featured projects appear on the home page.",
      initialValue: false,
    }),
    defineField({
      name: "technologies",
      title: "Technologies",
      type: "array",
      of: [{ type: "reference", to: [{ type: "technology" }] }],
      description: "Select existing technologies. Add new ones under Technologies in the Studio.",
    }),
    defineField({
      name: "sections",
      title: "Case study sections",
      type: "array",
      description:
        "Optional. Renders in order on the project page and overrides the individual case study fields below. Use it when a project needs its own section headings.",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "heading",
              title: "Heading",
              type: "string",
              validation: (rule) => rule.required().error("Each section needs a heading."),
            }),
            defineField({
              name: "body",
              title: "Body",
              type: "text",
              rows: 6,
              description: "One paragraph per blank line.",
            }),
          ],
          preview: {
            select: { title: "heading", subtitle: "body" },
          },
        },
      ],
    }),
    defineField({
      name: "problem",
      title: "Problem",
      type: "text",
      rows: 4,
      description: "Case study — what problem was this solving? (Optional)",
    }),
    defineField({
      name: "requirements",
      title: "Requirements",
      type: "text",
      rows: 4,
      description: "Case study — key constraints and requirements. (Optional)",
    }),
    defineField({
      name: "solution",
      title: "Solution",
      type: "text",
      rows: 4,
      description: "Case study — the approach and solution. (Optional)",
    }),
    defineField({
      name: "architecture",
      title: "Architecture",
      type: "text",
      rows: 4,
      description: "Case study — system architecture and AI workflow. (Optional)",
    }),
    defineField({
      name: "implementation",
      title: "Implementation",
      type: "text",
      rows: 4,
      description: "Case study — how it was built. (Optional)",
    }),
    defineField({
      name: "challenges",
      title: "Challenges",
      type: "text",
      rows: 4,
      description: "Case study — hard problems and how they were handled. (Optional)",
    }),
    defineField({
      name: "results",
      title: "Results",
      type: "text",
      rows: 4,
      description: "Case study — outcomes and impact. (Optional)",
    }),
    defineField({
      name: "lessonsLearned",
      title: "Lessons learned",
      type: "text",
      rows: 4,
      description: "Case study — what you would do differently. (Optional)",
    }),
    defineField({
      name: "githubUrl",
      title: "GitHub URL",
      type: "url",
    }),
    defineField({
      name: "liveUrl",
      title: "Live URL",
      type: "url",
    }),
    defineField({
      name: "related",
      title: "Related projects",
      type: "array",
      description: "Other projects to show at the bottom of the page.",
      of: [{ type: "reference", to: [{ type: "project" }] }],
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
      description: "Optional. Browser tab / search title override. Defaults to the project title.",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: 2,
      description: "Optional. Meta description override.",
    }),
    defineField({
      name: "seoImage",
      title: "SEO image",
      type: "image",
      description: "Optional. Social sharing image for this project.",
    }),
  ],
  orderings: [
    {
      title: "Publish date (newest first)",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
    {
      title: "Featured first, then publish date",
      name: "featuredPublished",
      by: [
        { field: "featured", direction: "desc" },
        { field: "publishedAt", direction: "desc" },
      ],
    },
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "category",
      status: "status",
      media: "coverImage",
    },
    prepare({ title, subtitle, status, media }) {
      const statusLabel =
        status === "in-production" ? "In production" : status ? String(status).toUpperCase() : "";
      return {
        title: title ?? "Untitled project",
        subtitle: [subtitle, statusLabel].filter(Boolean).join(" · "),
        media,
      };
    },
  },
});