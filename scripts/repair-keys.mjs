import { ensureArrayKeys } from "./seed-documents.mjs";
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");

function readEnvFile(path) {
  const out = {};
  let text;
  try {
    text = readFileSync(path, "utf-8");
  } catch {
    return out;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = {
  ...readEnvFile(resolve(root, ".env")),
  ...readEnvFile(resolve(root, ".env.local")),
};
const projectId = fileEnv.VITE_SANITY_PROJECT_ID;
const dataset = fileEnv.VITE_SANITY_DATASET ?? "production";
const apiVersion = fileEnv.VITE_SANITY_API_VERSION ?? "2024-06-04";

function token() {
  const flag = argv.indexOf("--token");
  if (flag !== -1 && argv[flag + 1]) return argv[flag + 1];
  if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN;
  const base = process.env.XDG_CONFIG_HOME || resolve(homedir(), ".config");
  try {
    const config = JSON.parse(readFileSync(resolve(base, "sanity", "config.json"), "utf-8"));
    return typeof config.authToken === "string" ? config.authToken : undefined;
  } catch {
    return undefined;
  }
}

const authToken = token();
if (!projectId || !authToken) {
  console.error(
    "Need a project id and credentials. Run `npx sanity login` first, or pass --token <t>."
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: authToken,
  useCdn: false,
  perspective: "raw",
});

/**
 * Studio cannot edit a list whose items are missing _key. Documents created
 * through the mutations API do not get keys automatically, so this walks the
 * dataset and fills them in without touching any other field.
 */
const CONTENT_TYPES = ["project", "post", "capability", "technology", "siteSettings"];

const ids = await client.fetch(
  `*[!(_id in path("drafts.**")) && _type in $types]._id`,
  { types: CONTENT_TYPES }
);
const draftIds = await client.fetch(`*[_id in path("drafts.**") && _type in $types]._id`, {
  types: CONTENT_TYPES,
});

const targets = [...ids, ...draftIds];
console.log(`Scanning ${targets.length} document(s) in ${projectId} / ${dataset}.`);

let repaired = 0;
const changes = [];

for (const id of targets) {
  const doc = await client.fetch(`*[_id == $id][0]`, { id });
  if (!doc) continue;
  if (!ensureArrayKeys(doc)) continue;
  repaired += 1;
  const fields = Object.entries(doc)
    .filter(([, value]) => Array.isArray(value) && value.some((i) => i?._key))
    .map(([key]) => key);
  changes.push(`${id} (${doc._type}): ${fields.join(", ")}`);
}

if (!repaired) {
  console.log("\nNothing to repair — every list item already has a _key.");
  process.exit(0);
}

console.log(`\n${repaired} document(s) need keys:`);
for (const change of changes) console.log(`  - ${change}`);

if (dryRun) {
  console.log("\nDry run — nothing written.");
  process.exit(0);
}

for (const id of targets) {
  const doc = await client.fetch(`*[_id == $id][0]`, { id });
  if (!doc) continue;
  if (!ensureArrayKeys(doc)) continue;
  await client.createOrReplace(doc);
}

console.log(`\nRepaired ${repaired} document(s).`);