import { defineCliConfig } from "sanity/cli";

function env(name: string): string | undefined {
  return process.env[name];
}

const projectId =
  env("SANITY_PROJECT_ID") ?? env("SANITY_STUDIO_PROJECT_ID") ?? "";
const dataset =
  env("SANITY_DATASET") ?? env("SANITY_STUDIO_DATASET") ?? "production";

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
});