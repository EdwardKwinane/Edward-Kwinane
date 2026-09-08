import type { StructureBuilder } from "sanity/structure";
import { Settings, FolderKanban, Newspaper, Layers, Boxes, GraduationCap, Quote } from "lucide-react";

export function structure(S: StructureBuilder) {
  return S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Site Settings")
        .icon(Settings)
        .child(
          S.editor().id("siteSettings").schemaType("siteSettings").documentId("siteSettings")
        ),
      S.divider(),
      S.documentTypeListItem("project").title("Projects").icon(FolderKanban),
      S.documentTypeListItem("post").title("Blog Posts").icon(Newspaper),
      S.documentTypeListItem("capability").title("Capabilities").icon(Layers),
      S.documentTypeListItem("technology").title("Technologies").icon(Boxes),
      S.documentTypeListItem("experience").title("Experience & Education").icon(GraduationCap),
      S.documentTypeListItem("testimonial").title("Testimonials").icon(Quote),
    ]);
}