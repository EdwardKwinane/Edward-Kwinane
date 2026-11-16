/**
 * Pure, dependency-injected request handler for the contact endpoint.
 *
 * The Vercel adapter in `api/contact.ts` wires real dependencies (Resend,
 * Upstash) into this handler; tests inject fakes. Nothing here talks to the
 * network, the filesystem or Node-specific APIs, so the file stays inside the
 * `tsc -b` scope and is fully testable in isolation.
 *
 * The adapter applies the method/Origin/Content-Type gates before it consumes
 * the request stream; the identical checks are kept here as defence in depth.
 */
import {
  MAX_BODY_BYTES,
  SEND_TIMEOUT_MS,
  HONEYPOT_FIELD,
  fingerprint,
  isJsonContentType,
  sanitizeReplyTo,
  validateSubmission,
} from "./rules.js";

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
  /**
   * Sends the email. Throws DefiniteSendFailure when the provider rejected the
   * request (retry is safe), UncertainSendFailure (or anything else) when the
   * outcome is unknown. Receives the handler's AbortSignal so the underlying
   * request can be cancelled on timeout.
   */
  sendMail: (mail: ContactMail, signal?: AbortSignal) => Promise<unknown>;
  /**
   * Atomically reserves the fingerprint for the dedupe window (Redis SET NX EX).
   * True when this call won the reservation, false when it is already held.
   */
  claimFingerprint: (fingerprint: string) => Promise<boolean>;
  /** Best-effort release of a reservation after a definite send failure. */
  releaseFingerprint: (fingerprint: string) => Promise<void>;
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

/** Same-origin check: Origin header must be present and match the Host header.
 *  Exported so the Vercel adapter can apply the identical rule before it
 *  consumes the request stream (kept in one place so they cannot drift). */
export function sameOrigin(origin: string, host: string): boolean {
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

/**
 * Send failure where delivery definitively did not happen (the provider
 * rejected the request with a 4xx). The idempotency reservation may be
 * released so a retry can proceed.
 */
export class DefiniteSendFailure extends Error {
  constructor() {
    super("Email delivery definitively failed");
    this.name = "DefiniteSendFailure";
  }
}

/**
 * Send failure with an unknown outcome (provider 5xx, network error, timeout).
 * The email may or may not have been delivered, so the idempotency reservation
 * must be kept: a retry must not initiate a second delivery attempt.
 */
export class UncertainSendFailure extends Error {
  constructor() {
    super("Email delivery outcome unknown");
    this.name = "UncertainSendFailure";
  }
}

async function withTimeout<T>(operation: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        onTimeout?.();
        reject(new TimeoutError());
      }, ms);
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

  // 3. Content-Type gate: the endpoint speaks JSON only.
  const contentType = header(req.headers, "content-type");
  if (!isJsonContentType(contentType)) {
    return error(415, "unsupported_media_type");
  }

  // 4. Size gate (bytes, not UTF-16 code units). The adapter additionally
  // enforces this on the raw request stream before JSON parsing; this check
  // is defence in depth for direct callers.
  if (new TextEncoder().encode(req.rawBody).length > MAX_BODY_BYTES) {
    return error(413, "too_large");
  }

  // 5. JSON parse gate.
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

  // 6. Honeypot: silent, success-shaped discard. Never sends, never logs.
  if (str(HONEYPOT_FIELD).trim() !== "") {
    return ok();
  }

  // 7. Server-authoritative validation.
  const fields = validateSubmission(submission);
  if (Object.keys(fields).length > 0) {
    return error(400, "validation", { fields });
  }

  const fp = fingerprint(submission);

  // 8. Rate limits — before claiming the fingerprint so a 429 never burns the
  //    dedupe reservation. Fail closed on any dependency failure (A3).
  let decision: RateLimitDecision;
  try {
    decision = await deps.checkRateLimit();
  } catch {
    return error(503, "unavailable");
  }
  if (!decision.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    return error(429, "rate_limited", { retryAfterSeconds }, retryAfterSeconds);
  }

  // 9. Atomic duplicate reservation: a single Redis SET NX EX claims the
  //    fingerprint for the whole send. Concurrent identical requests cannot
  //    both win the claim, so at most one initiates delivery. The loser gets
  //    409. Any Redis failure here fails closed with 503.
  let claimed: boolean;
  try {
    claimed = await deps.claimFingerprint(fp);
  } catch {
    return error(503, "unavailable");
  }
  if (!claimed) {
    return error(409, "duplicate");
  }

  // 10. Send email, bounded by the configured timeout. The timeout aborts the
  //     underlying provider request via AbortSignal instead of merely racing
  //     it, and the reservation is KEPT: an aborted request has an unknown
  //     delivery outcome.
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
  const controller = new AbortController();
  const sendOperation = deps.sendMail(
    { from: deps.mail.from, to: deps.mail.to, subject: SUBJECT, replyTo, text },
    controller.signal,
  );
  // If the timeout wins the race, the operation promise may still reject later;
  // give that rejection a handler so it never becomes an unhandled rejection.
  sendOperation.catch(() => {});
  try {
    await withTimeout(sendOperation, sendTimeoutMs, () => controller.abort());
  } catch (err) {
    if (err instanceof TimeoutError) return error(504, "unavailable");
    if (err instanceof DefiniteSendFailure) {
      // The provider definitively rejected this submission; the reservation is
      // released so the client's retry can proceed.
      try {
        await deps.releaseFingerprint(fp);
      } catch {
        // Release is best effort. Worst case the retry gets 409 within the
        // dedupe window instead of a fresh send.
      }
      return error(502, "unavailable");
    }
    // Uncertain outcome (provider 5xx, network failure): keep the reservation
    // so no second delivery attempt is ever initiated for this fingerprint.
    return error(502, "unavailable");
  }

  // 11. The reservation stays in place for the rest of the dedupe window: a
  //     re-submission of the identical payload gets 409, which is what makes
  //     the client's retry-on-5xx safe.
  //
  //     Known limitation, stated honestly: this design guarantees at-most-one
  //     send per fingerprint per dedupe window, not exactly-once delivery.
  //     After a 504 (uncertain outcome) a client retry is answered 409 even
  //     though delivery may never have happened; after the 10-minute window a
  //     genuine re-submission is a fresh send. The Redis reservation is the
  //     single source of truth; there is no two-phase provider confirmation.

  return ok();
}
