import { defineType, defineField } from "sanity";

export const technology = defineType({
  name: "technology",
  title: "Technology",
  type: "document",
  description:
    "A reusable technology entry (e.g. React, TypeScript, Python, OpenAI, n8n, PostgreSQL). Projects and capabilities reference these instead of repeating names.",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "Display name, e.g. 'React'.",
      validation: (rule) => rule.required().min(1).error("A name is required."),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "URL-safe identifier, generated from the name.",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required().error("A slug is required."),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "AI / LLM", value: "ai" },
          { title: "Frontend", value: "frontend" },
          { title: "Backend", value: "backend" },
          { title: "Database", value: "database" },
          { title: "Infrastructure", value: "infrastructure" },
          { title: "Workflow / Automation", value: "automation" },
          { title: "Tool", value: "tool" },
        ],
      },
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "website",
      title: "Website",
      type: "url",
    }),
    defineField({
      name: "displayOrder",
      title: "Display order",
      type: "number",
      description: "Lower numbers sort first (optional).",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  orderings: [
    {
      title: "Display order",
      name: "displayOrderAsc",
      by: [{ field: "displayOrder", direction: "asc" }],
    },
    {
      title: "Name",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "category",
    },
  },
});