import { defineType, defineField } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  description:
    "Global content that applies to the whole site. Keep page-specific content in its own document type.",
  fields: [
    defineField({
      name: "siteTitle",
      title: "Site title",
      type: "string",
      description: "Used in the browser tab and social sharing.",
      initialValue: "Edward Kwinane — AI Engineer & Digital Architect",
    }),
    defineField({
      name: "siteDescription",
      title: "Site description",
      type: "text",
      rows: 3,
      description: "Default meta description for the site.",
    }),
    defineField({
      name: "ownerName",
      title: "Owner name",
      type: "string",
      description: "Used in the navbar and footer.",
      initialValue: "Edward Kwinane",
    }),
    defineField({
      name: "roleLine",
      title: "Role line",
      type: "string",
      description: "Short title shown under the name, e.g. 'AI Engineer · Digital Architect'.",
      initialValue: "AI Engineer · Digital Architect",
    }),
    defineField({
      name: "heroHeadline",
      title: "Hero headline",
      type: "string",
      description: "Main headline on the home page.",
    }),
    defineField({
      name: "heroSubheadline",
      title: "Hero subheadline",
      type: "text",
      rows: 3,
      description: "Supporting line under the hero headline.",
    }),
    defineField({
      name: "heroTags",
      title: "Hero tags",
      type: "array",
      description: "Small uppercase tags listed under the hero call to action.",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "availabilityText",
      title: "Availability text",
      type: "string",
      description: "e.g. 'Available for select projects'.",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
    }),
    defineField({
      name: "facebookUrl",
      title: "Facebook URL",
      type: "url",
    }),
    defineField({
      name: "instagramUrl",
      title: "Instagram URL",
      type: "url",
    }),
    defineField({
      name: "youtubeUrl",
      title: "YouTube URL",
      type: "url",
    }),
    defineField({
      name: "linkedinUrl",
      title: "LinkedIn URL",
      type: "url",
    }),
    defineField({
      name: "twitterUrl",
      title: "X / Twitter URL",
      type: "url",
    }),
    defineField({
      name: "githubUrl",
      title: "GitHub URL",
      type: "url",
    }),
    defineField({
      name: "resumeUrl",
      title: "Resume URL",
      type: "url",
      description: "Link to a hosted PDF or resume page.",
    }),
    defineField({
      name: "defaultSEOImage",
      title: "Default SEO image",
      type: "image",
      description: "Used when a page has no specific SEO image.",
    }),
    defineField({
      name: "footerTagline",
      title: "Footer tagline",
      type: "text",
      rows: 3,
      description: "Short paragraph under the name in the footer.",
    }),
    defineField({
      name: "footerText",
      title: "Footer text",
      type: "text",
      rows: 3,
      description: "Short line shown in the footer.",
    }),
    defineField({
      name: "footerSignoff",
      title: "Footer signoff",
      type: "string",
      description: "Right-aligned line at the very bottom, e.g. 'Concept → Architecture → Build → Ship'.",
    }),
  ],
  preview: {
    select: { title: "siteTitle" },
  },
});