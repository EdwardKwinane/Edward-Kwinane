import { createClient, type ClientConfig } from "@sanity/client";

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined;
const dataset =
  (import.meta.env.VITE_SANITY_DATASET as string | undefined) ?? "production";
const apiVersion =
  (import.meta.env.VITE_SANITY_API_VERSION as string | undefined) ?? "2024-06-04";

/** True when the project has been wired up with a real Sanity project ID. */
export const isSanityConfigured = Boolean(projectId);

/**
 * The @sanity/client get-it transport installs its own retry middleware
 * (default `maxRetries: 5`, retrying transient network errors on GET queries).
 * That would multiply the app's single, controlled retry in
 * `lib/sanity/content.ts` into up to six transport attempts per fetch.
 * The retry policy is owned there, so the client-level retry is disabled —
 * one strategy, applied once, with backoff.
 */
const config: ClientConfig = {
  projectId: projectId ?? "missing-project-id",
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
  maxRetries: 0,
};

export const client = createClient(config);