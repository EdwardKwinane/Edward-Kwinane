import { defineType, defineField } from "sanity";

export const codeBlock = defineType({
  name: "codeBlock",
  title: "Code block",
  type: "object",
  fields: [
    defineField({
      name: "code",
      title: "Code",
      type: "text",
      rows: 12,
      validation: (rule) => rule.required().error("Code is required."),
    }),
    defineField({
      name: "language",
      title: "Language",
      type: "string",
      options: {
        list: [
          { title: "Plain text", value: "text" },
          { title: "TypeScript / JavaScript", value: "tsx" },
          { title: "Python", value: "python" },
          { title: "SQL", value: "sql" },
          { title: "Bash / Shell", value: "bash" },
          { title: "JSON", value: "json" },
          { title: "GROQ", value: "groq" },
          { title: "HTML / CSS", value: "html" },
        ],
      },
      initialValue: "text",
    }),
  ],
  preview: {
    select: { language: "language", code: "code" },
    prepare({ language, code }) {
      const preview = code ? code.split("\n").find((line: string) => line.trim()) ?? "" : "";
      return {
        title: "Code block",
        subtitle: `${language ?? "text"} · ${preview.slice(0, 60)}`,
      };
    },
  },
});

const linkAnnotation = defineField({
  name: "link",
  title: "Link",
  type: "object",
  fields: [
    defineField({
      name: "href",
      title: "URL",
      type: "url",
      validation: (rule) =>
        rule.uri({
          allowRelative: true,
          scheme: ["http", "https", "mailto"],
        }),
    }),
  ],
});

export const post = defineType({
  name: "post",
  title: "Blog Post",
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
      description: "Appears in the URL: /blog/<slug>",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required().error("A slug is required."),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
      description: "Short supporting line shown under the title.",
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      description: "Card summary and search/meta description.",
    }),
    defineField({
      name: "coverImage",
      title: "Cover image",
      type: "image",
      options: { hotspot: true },
      description: "Optional. Used on the article page and for social sharing.",
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "string",
      initialValue: "Edward Kwinane",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "AI Engineering", value: "AI ENGINEERING" },
          { title: "Voice AI", value: "VOICE AI" },
          { title: "RAG", value: "RAG" },
          { title: "LLMs", value: "LLMs" },
          { title: "Agents", value: "AGENTS" },
          { title: "Full-Stack", value: "FULL-STACK" },
          { title: "System Design", value: "SYSTEM DESIGN" },
        ],
      },
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      description: "Displayed as #tag pills on the article.",
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      description: "The most recent featured article is highlighted on the blog page.",
      initialValue: false,
    }),
    defineField({
      name: "estimatedReadingTime",
      title: "Estimated reading time (minutes)",
      type: "number",
      description: "Optional. If left empty, it is estimated automatically from the article length.",
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      description: "Write the article using headings, paragraphs, lists, links, code blocks and images.",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Heading 2", value: "h2" },
            { title: "Heading 3", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
              { title: "Code", value: "code" },
            ],
            annotations: [linkAnnotation],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alt text",
              type: "string",
            }),
            defineField({
              name: "caption",
              title: "Caption",
              type: "string",
            }),
          ],
        },
        { type: "codeBlock" },
      ],
    }),
    defineField({
      name: "related",
      title: "Related articles",
      type: "array",
      of: [{ type: "reference", to: [{ type: "post" }] }],
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "updatedAt",
      title: "Updated at",
      type: "datetime",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "seoImage",
      title: "SEO image",
      type: "image",
    }),
  ],
  orderings: [
    {
      title: "Publish date (newest first)",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      publishedAt: "publishedAt",
      media: "coverImage",
    },
    prepare({ title, category, publishedAt, media }) {
      const date = publishedAt ? new Date(publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
      return {
        title: title ?? "Untitled post",
        subtitle: [category, date].filter(Boolean).join(" · "),
        media,
      };
    },
  },
});