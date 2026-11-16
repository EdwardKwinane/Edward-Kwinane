/**
 * Shared rules for the contact form.
 *
 * This module is deliberately dependency-free and free of Node/browser-only
 * APIs so it can be imported by the server function, the browser bundle and
 * the test suites alike.
 */

export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 2000;

/** Approved project-type whitelist (mirrors the client Select options). */
export const PROJECT_TYPES = [
  "AI Voice Agent",
  "RAG System",
  "AI Chatbot",
  "AI Agent",
  "Full-Stack Product",
  "Automation",
  "Other",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/** Honeypot: invisible to humans, filled by bots. Non-empty → discard. */
export const HONEYPOT_FIELD = "company";

export const SEND_TIMEOUT_MS = 8_000;
export const DEDUPE_WINDOW_SECONDS = 600;

/** Per-IP / global send limits (sliding windows). */
export const RATE_LIMITS = {
  perIpTenMinutes: { windowMs: 10 * 60 * 1000, max: 5 },
  perIpDay: { windowMs: 24 * 60 * 60 * 1000, max: 20 },
  globalDay: { windowMs: 24 * 60 * 60 * 1000, max: 50 },
} as const;

/** Content-Type must be exactly application/json; a charset parameter is allowed. */
export function isJsonContentType(value: string | undefined): boolean {
  if (!value) return false;
  const main = value.split(";", 1)[0].trim().toLowerCase();
  return main === "application/json";
}

const EMAIL_PATTERN = /^[^\s@<>"'(){}\[\],;:\\]+@[^\s@<>"'(){}\[\],;:\\]+\.[^\s@<>"'(){}\[\],;:\\]+$/;

/** Structure + length check for an email address. No CR/LF by construction. */
export function isValidEmail(email: string): boolean {
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false;
  if (/[\r\n\0]/.test(email)) return false;
  const at = email.lastIndexOf("@");
  if (at <= 0 || at !== email.indexOf("@")) return false;
  return EMAIL_PATTERN.test(email);
}

/** Header-injection-safe Reply-To: strips CR/LF, then re-validates. */
export function sanitizeReplyTo(email: string): string | null {
  const clean = email.replace(/[\r\n\0]/g, "").trim();
  return isValidEmail(clean) ? clean : null;
}

export interface ValidatableSubmission {
  name: string;
  email: string;
  projectType: string;
  message: string;
}

/** Server-authoritative field validation. Returns a map of field → message. */
export function validateSubmission(input: ValidatableSubmission): Partial<Record<"name" | "email" | "projectType" | "message", string>> {
  const fields: Partial<Record<"name" | "email" | "projectType" | "message", string>> = {};

  const name = input.name.trim();
  if (name.length < 1) fields.name = "Please enter your name.";
  else if (name.length > MAX_NAME_LENGTH) fields.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;

  const email = input.email.trim();
  if (email.length === 0) fields.email = "Please enter your email.";
  else if (!isValidEmail(email)) fields.email = "Enter a valid email address.";

  if (!PROJECT_TYPES.includes(input.projectType as ProjectType)) {
    fields.projectType = "Please select a project type.";
  }

  const message = input.message.trim();
  if (message.length < MIN_MESSAGE_LENGTH) {
    fields.message = `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`;
  } else if (message.length > MAX_MESSAGE_LENGTH) {
    fields.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
  }

  return fields;
}

/** Stable, normalized fingerprint for duplicate detection. */
export function fingerprint(submission: ValidatableSubmission): string {
  return [
    submission.name.trim().toLowerCase(),
    submission.email.trim().toLowerCase(),
    submission.message.trim(),
  ].join("|");
}

export interface SlidingWindowResult {
  allowed: boolean;
  /** Milliseconds until the next slot opens. 0 when allowed. */
  retryAfterMs: number;
}

/**
 * Pure sliding-window evaluation over sorted request timestamps (ascending).
 * Exported for the unit tests; the Redis wiring mirrors this logic with
 * ZREMRANGEBYSCORE/ZCARD against a sorted set.
 */
export function evaluateSlidingWindow(
  timestamps: number[],
  now: number,
  windowMs: number,
  limit: number,
): SlidingWindowResult {
  const cutoff = now - windowMs;
  const inWindow = timestamps.filter((t) => t > cutoff);
  if (inWindow.length < limit) return { allowed: true, retryAfterMs: 0 };
  const oldest = Math.min(...inWindow);
  return { allowed: false, retryAfterMs: oldest + windowMs - now };
}
