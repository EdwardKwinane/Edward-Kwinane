import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const rootEnv = readFileSync(resolve(root, ".env"), "utf-8");

const studioEnv = rootEnv
  .split("\n")
  .map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return line;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (key.startsWith("VITE_SANITY_")) {
      const studioKey = key.replace(/^VITE_SANITY_/, "SANITY_STUDIO_");
      return `${studioKey}=${value}`;
    }
    return line;
  })
  .join("\n");

writeFileSync(resolve(root, "sanity", ".env"), studioEnv, "utf-8");
