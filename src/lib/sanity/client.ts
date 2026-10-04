import { createClient, type ClientConfig } from "@sanity/client";

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined;
const dataset =
  (import.meta.env.VITE_SANITY_DATASET as string | undefined) ?? "production";
const apiVersion =
  (import.meta.env.VITE_SANITY_API_VERSION as string | undefined) ?? "2024-06-04";

/** True when the project has been wired up with a real Sanity project ID. */
export const isSanityConfigured = Boolean(projectId);

const config: ClientConfig = {
  projectId: projectId ?? "missing-project-id",
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
};

export const client = createClient(config);