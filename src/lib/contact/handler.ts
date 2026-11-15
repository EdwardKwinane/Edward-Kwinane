/**
 * Pure, dependency-injected request handler for the contact endpoint.
 *
 * The Vercel adapter in `api/contact.ts` wires real dependencies (Resend,
 * Upstash) into this handler; tests inject fakes. Nothing here talks to the
 * network, the filesystem or Node-specific APIs, so the file stays inside the
 * `tsc -b` scope and is fully testable in isolation.
 */
import {
  MAX_BODY_BYTES,
  SEND_TIMEOUT_MS,
  HONEYPOT_FIELD,
  fingerprint,
  sanitizeReplyTo,
  validateSubmission,
} from "./rules";

export interface ContactRequest {
  method: string;
  /** Lowercased header names. Values come from the platform. */
  headers: Record<string, string>;
  rawBody: string;
}

export interface ContactMail {
  from: string;
  to: string;
  subject: string;
  replyTo: string | null;
  text: string;
}

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export interface ContactMailConfig {
  from: string;
  to: string;
}

export interface ContactDeps {
  /** Sends the email. Throws on failure. Resolved with the Resend id. */
  sendMail: (mail: ContactMail) => Promise<unknown>;
  /** True when this fingerprint was already recorded (recent duplicate). */
  isDuplicate: (fingerprint: string) => Promise<boolean>;
  /** Records the fingerprint after a successful send (TTL-dedupe for retries). */
  recordFingerprint: (fingerprint: string) => Promise<void>;
  /** Checks (and consumes, when allowed) the configured rate limits. */
  checkRateLimit: () => Promise<RateLimitDecision>;
  /** Fixed sender/recipient for this deployment (from the environment). */
  mail: ContactMailConfig;
  sendTimeoutMs?: number;
}

export interface ApiErrorBody {
  code: string;
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
}

export interface ApiBody {
  ok: boolean;
  error?: ApiErrorBody;
}

export interface ApiResult {
  status: number;
  body: ApiBody;
  retryAfterSeconds: number | null;
}

function respond(status: number, body: ApiBody, retryAfterSeconds: number | null = null): ApiResult {
  return { status, body, retryAfterSeconds };
}

const ok = (): ApiResult => respond(200, { ok: true });

function error(status: number, code: string, extra?: Omit<ApiErrorBody, "code">, retryAfterSeconds: number | null = null): ApiResult {
  return respond(status, { ok: false, error: { code, ...extra } }, retryAfterSeconds);
}

/** Fixed subject line — never contains user input. */
export const SUBJECT = "New portfolio contact";

/** Same-origin check: Origin header must be present and match the Host header. */
function sameOrigin(origin: string, host: string): boolean {
  try {
    const url = new URL(origin);
    // Prefixing the host with the origin's protocol lets the URL parser
    // resolve default ports (https → 443, http → 80) on both sides.
    const hostUrl = new URL(`${url.protocol}//${host}`);
    const defaultPort = url.protocol === "https:" ? "443" : "80";
    const originPort = url.port || defaultPort;
    const hostPort = hostUrl.port || defaultPort;
    return hostUrl.hostname === url.hostname && hostPort === originPort;
  } catch {
    return false;
  }
}

/** Trims a possibly oversized or missing header value. */
function header(headers: Record<string, string>, name: string): string {
  return (headers[name] ?? "").trim();
}

class TimeoutError extends Error {
  constructor() {
    super("Operation timed out");
    this.name = "TimeoutError";
  }
}

async function withTimeout<T>(operation: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new TimeoutError()), ms);
      (timer as { unref?: () => void }).unref?.();
    });
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function handleContactRequest(req: ContactRequest, deps: ContactDeps): Promise<ApiResult> {
  // 1. Method gate.
  if (req.method.toUpperCase() !== "POST") {
    return error(405, "method_not_allowed");
  }

  // 2. Origin gate (same-origin only; same-origin POST always sends Origin).
  const origin = header(req.headers, "origin");
  const host = header(req.headers, "host");
  if (!origin || !host || !sameOrigin(origin, host)) {
    return error(403, "forbidden");
  }

  // 3. Size gate (bytes, not UTF-16 code units).
  if (new TextEncoder().encode(req.rawBody).length > MAX_BODY_BYTES) {
    return error(413, "too_large");
  }

  // 4. JSON parse gate.
  let payload: unknown;
  try {
    payload = JSON.parse(req.rawBody);
  } catch {
    return error(400, "invalid_json");
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return error(400, "invalid_json");
  }
  const raw = payload as Record<string, unknown>;
  const str = (key: string): string => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  const submission = {
    name: str("name"),
    email: str("email"),
    projectType: str("projectType"),
    message: str("message"),
  };

  // 5. Honeypot: silent, success-shaped discard. Never sends, never logs.
  if (str(HONEYPOT_FIELD).trim() !== "") {
    return ok();
  }

  // 6. Server-authoritative validation.
  const fields = validateSubmission(submission);
  if (Object.keys(fields).length > 0) {
    return error(400, "validation", { fields });
  }

  const fp = fingerprint(submission);

  // 7–8. Dedupe + rate limits, fail closed on any dependency failure (A3).
  let duplicate = false;
  let decision: RateLimitDecision;
  try {
    duplicate = await deps.isDuplicate(fp);
    if (duplicate) {
      return error(409, "duplicate");
    }
    decision = await deps.checkRateLimit();
  } catch {
    return error(503, "unavailable");
  }
  if (!decision.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    return error(429, "rate_limited", { retryAfterSeconds }, retryAfterSeconds);
  }

  // 9. Send email, bounded by the configured timeout.
  const replyTo = sanitizeReplyTo(submission.email);
  const text = [
    `Name: ${submission.name.trim()}`,
    `Email: ${submission.email.trim()}`,
    `Project type: ${submission.projectType}`,
    "",
    "Message:",
    submission.message.trim(),
  ].join("\n");

  const sendTimeoutMs = deps.sendTimeoutMs ?? SEND_TIMEOUT_MS;
  try {
    await withTimeout(
      deps.sendMail({ from: deps.mail.from, to: deps.mail.to, subject: SUBJECT, replyTo, text }),
      sendTimeoutMs,
    );
  } catch (err) {
    if (err instanceof TimeoutError) return error(504, "unavailable");
    return error(502, "unavailable");
  }

  // 10. Record the fingerprint only after a successful send, so a 5xx never
  // blocks the client's retry-once behavior.
  try {
    await deps.recordFingerprint(fp);
  } catch {
    // The email was delivered; failing to record the dedupe stamp must not
    // turn a successful send into a 5xx. Worst case: a retry sends a copy.
  }

  return ok();
}
