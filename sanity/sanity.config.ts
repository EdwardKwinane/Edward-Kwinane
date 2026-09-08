import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemaTypes";
import { structure } from "./structure";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? "";
const dataset = process.env.SANITY_STUDIO_DATASET ?? "production";

if (!projectId) {
  console.warn(
    "[sanity] No project ID found. Ensure root .env contains VITE_SANITY_PROJECT_ID and run `npm run studio`."
  );
}

export default defineConfig({
  name: "default",
  title: "Edward Kwinane — Content Studio",
  projectId,
  dataset,
  plugins: [structureTool({ structure }), visionTool()],
  schema: { types: schemaTypes },
});
