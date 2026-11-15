/**
 * Environment loading for the build-time scripts.
 *
 * These scripts used to read `.env` directly, which made them unusable in CI
 * (no `.env` there) and silently ignored values exported in the shell. This
 * helper prefers `process.env` and falls back to a local `.env`, and treats a
 * missing file as "no values" rather than a crash — so a script can decide for
 * itself whether it can run without configuration.
 *
 * No values are ever printed by this module.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const repoRoot = resolve(import.meta.dirname, "..");

function parseEnvFile(contents) {
  const values = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    values[key] = value;
  }
  return values;
}

/**
 * `process.env` wins, so a CI job or a shell export can override `.env` without
 * editing the file.
 */
export function loadEnv() {
  const path = resolve(repoRoot, ".env");
  const fromFile = existsSync(path) ? parseEnvFile(readFileSync(path, "utf-8")) : {};
  return { ...fromFile, ...process.env };
}

export function loadSanityConfig(env = loadEnv()) {
  return {
    projectId: env.VITE_SANITY_PROJECT_ID || "",
    dataset: env.VITE_SANITY_DATASET || "production",
    apiVersion: env.VITE_SANITY_API_VERSION || "2024-06-04",
  };
}
