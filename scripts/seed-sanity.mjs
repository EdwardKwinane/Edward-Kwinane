import { buildDocuments } from "./seed-documents.mjs";
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
};

if (flag("help")) {
  console.log(
    [
      "Usage: npm run seed -- [options]",
      "",
      "Pushes the site's content into the Sanity dataset so the CMS becomes the",
      "source of truth. Safe to re-run: existing documents are left untouched",
      "unless --overwrite is passed.",
      "",
      "Options:",
      "  --overwrite   Replace documents that already exist (discards Studio edits)",
      "  --dry-run     Print what would be written without writing",
      "  --token <t>   Sanity write token (defaults to $SANITY_AUTH_TOKEN)",
    ].join("\n")
  );
  process.exit(0);
}

const dryRun = flag("dry-run");
const overwrite = flag("overwrite");

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
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    out[key] = value;
  }
  return out;
}

const fileEnv = { ...readEnvFile(resolve(root, ".env")), ...readEnvFile(resolve(root, ".env.local")) };
const projectId = fileEnv.VITE_SANITY_PROJECT_ID;
const dataset = fileEnv.VITE_SANITY_DATASET ?? "production";
const apiVersion = fileEnv.VITE_SANITY_API_VERSION ?? "2024-06-04";
const token = option("token") ?? process.env.SANITY_AUTH_TOKEN;

if (!projectId) {
  console.error("No VITE_SANITY_PROJECT_ID in .env — nothing to seed.");
  process.exit(1);
}

async function resolveClient() {
  if (token) {
    return createClient({ projectId, dataset, apiVersion, token, useCdn: false });
  }
  try {
    const { getCliClient } = await import("sanity/cli");
    return getCliClient({
      api: { projectId, dataset, apiVersion, useCdn: false },
      perspective: "raw",
    });
  } catch {
    return null;
  }
}

const client = await resolveClient();

if (!client && !dryRun) {
  console.error(
    [
      "No Sanity write credentials available.",
      "",
      "Either run a one-time browser login:",
      "",
      "  npx sanity login",
      "  npm run seed:studio",
      "",
      "or supply a token (Editor role) from",
      "https://www.sanity.io/manage/project/" + projectId + "/tokens",
      "",
      "  SANITY_AUTH_TOKEN=<token> npm run seed",
      "  npm run seed -- --token <token>",
      "",
      "Use --dry-run to preview without credentials.",
    ].join("\n")
  );
  process.exit(1);
}

const { documents, warnings } = await buildDocuments({ projectId, dataset, apiVersion });

const counts = documents.reduce((acc, doc) => {
  acc[doc._type] = (acc[doc._type] ?? 0) + 1;
  return acc;
}, {});

console.log(`Target        ${projectId} / ${dataset}`);
console.log(`Mode          ${dryRun ? "dry run" : overwrite ? "overwrite" : "create if missing"}`);
console.log(
  `Documents     ${Object.entries(counts)
    .map(([type, n]) => `${n} ${type}`)
    .join(", ")}`
);

if (warnings.length) {
  console.log("\nFidelity warnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (dryRun) {
  console.log("\nDry run — nothing written.");
  process.exit(0);
}

const existing = new Set(
  (await client.fetch(`*[_id in $ids]._id`, { ids: documents.map((d) => d._id) })) ?? []
);

const toCreate = documents.filter((d) => !existing.has(d._id));
const skipped = documents.length - toCreate.length;

if (skipped > 0 && !overwrite) {
  console.log(`\nSkipping ${skipped} existing document(s). Re-run with --overwrite to replace them.`);
}

if (toCreate.length > 0) {
  let transaction = client.transaction();
  for (const doc of toCreate) {
    transaction = transaction[overwrite ? "createOrReplace" : "createIfNotExists"](doc);
  }
  await transaction.commit({ visibility: "async" });
}

console.log(`\nWrote ${toCreate.length} document(s).`);

const after = await client.fetch(`{counts: array::unique(*[]._type)}`);
console.log(`Dataset now contains: ${JSON.stringify(after)}`);
