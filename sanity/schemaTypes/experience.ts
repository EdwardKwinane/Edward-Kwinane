import { defineType, defineField } from "sanity";

export const experience = defineType({
  name: "experience",
  title: "Experience, Education & Certification",
  type: "document",
  description:
    "A single entry describing work, education or a certification. Supports all three so future entries need no code changes.",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Role, course or certification name.",
      validation: (rule) => rule.required().min(1).error("A title is required."),
    }),
    defineField({
      name: "organization",
      title: "Organization",
      type: "string",
      description: "Company, institution or certifying body.",
      validation: (rule) => rule.required().min(1).error("The organization is required."),
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Work", value: "work" },
          { title: "Education", value: "education" },
          { title: "Certification", value: "certification" },
        ],
      },
      validation: (rule) => rule.required().error("Pick the entry type."),
    }),
    defineField({
      name: "startDate",
      title: "Start date",
      type: "date",
      options: { dateFormat: "MMMM YYYY" },
    }),
    defineField({
      name: "endDate",
      title: "End date",
      type: "date",
      description: "Leave empty when this is the current position.",
      options: { dateFormat: "MMMM YYYY" },
    }),
    defineField({
      name: "currentlyActive",
      title: "Currently active",
      type: "boolean",
      description: "Marks the entry as 'Present' instead of an end date.",
      initialValue: false,
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 5,
    }),
    defineField({
      name: "credentialUrl",
      title: "Credential URL",
      type: "url",
      description: "Link to the certificate or verified credential.",
    }),
    defineField({
      name: "organizationUrl",
      title: "Organization URL",
      type: "url",
    }),
    defineField({
      name: "skills",
      title: "Skills",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "displayOrder",
      title: "Display order",
      type: "number",
      description: "Lower numbers sort first. Newest entries usually get lower numbers.",
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
      title: "Start date (newest first)",
      name: "startDateDesc",
      by: [{ field: "startDate", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      organization: "organization",
      type: "type",
    },
    prepare({ title, organization, type }) {
      const typeLabel =
        type === "work"
          ? "Work"
          : type === "education"
            ? "Education"
            : type === "certification"
              ? "Certification"
              : "";
      return {
        title: title ?? "Untitled entry",
        subtitle: [organization, typeLabel].filter(Boolean).join(" · "),
      };
    },
  },
});