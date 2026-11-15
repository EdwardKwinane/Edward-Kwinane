import { client, isSanityConfigured } from "./client";
import type { QueryParams } from "@sanity/client";

/**
 * Typed result model for every Sanity read.
 *
 * The previous fetch layer collapsed every outcome into `[]` / `null`, which
 * made a CMS outage indistinguishable from genuinely empty content and let
 * detail pages deindex themselves during temporary failures. This union makes
 * each case explicit so callers can render the right state:
 *
 *  - `success`  — request completed; `data` may be an empty array (a
 *                 legitimately empty dataset) or a populated document.
 *  - `not-found`— a by-slug lookup completed successfully but matched no
 *                 document. Not an error.
 *  - `unconfigured` — no `VITE_SANITY_PROJECT_ID` is set, so no request was
 *                 ever made. Not an empty dataset.
 *  - `error`    — recoverable network / HTTP / timeout failure.
 *  - `malformed`— the response arrived but had the wrong shape. Not retried.
 */
export type ContentResult<T> =
  | { status: "success"; data: T }
  | { status: "not-found" }
  | { status: "unconfigured" }
  | { status: "error"; reason: "network" | "server" | "timeout" | "http"; retriable: boolean }
  | { status: "malformed"; reason: string };

/** True only when `data` is present. */
export function isContentSuccess<T>(
  result: ContentResult<T>
): result is { status: "success"; data: T } {
  return result.status === "success";
}

/** True for every failure-like status (not success, not not-found, not empty). */
export function isContentFailure<T>(result: ContentResult<T>): boolean {
  return (
    result.status === "error" || result.status === "malformed" || result.status === "unconfigured"
  );
}

/* ------------------------------------------------------------------ */
/* Request lifecycle                                                   */
/* ------------------------------------------------------------------ */

/**
 * Hard ceiling for a single Sanity request, overridable for tests via
 * `VITE_SANITY_TIMEOUT_MS`. The abort signal below is handed to the
 * underlying fetch transport (verified against @sanity/client 8.x:
 * `RequestOptions.signal` / `RequestOptions.timeout` are forwarded), so the
 * in-flight request is genuinely cancelled, not just abandoned by a UI timer.
 */
const DEFAULT_TIMEOUT_MS = 9_000;

export const REQUEST_TIMEOUT_MS = (() => {
  // `import.meta.env` may be undefined in non-Vite consumers (e.g. node
  // bundles prepared by verify-seed); fall back to the default then.
  const raw = Number((import.meta.env as Record<string, string | undefined> | undefined)?.["VITE_SANITY_TIMEOUT_MS"]);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
})();

/** Initial request plus exactly one controlled retry. */
const MAX_ATTEMPTS = 2;
/** Linear backoff between attempts. */
const RETRY_BACKOFF_MS = 800;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface ErrorLike {
  name?: string;
  statusCode?: number;
}

/**
 * Classify a thrown error. Only clearly recoverable conditions are retried;
 * genuine "document is missing" responses never reach here (they resolve to
 * `not-found`), and malformed payloads are not retried at all.
 */
function classifyError(error: unknown): {
  reason: "network" | "server" | "timeout" | "http";
  retriable: boolean;
} {
  const err = error as ErrorLike | null;
  const statusCode = typeof err?.statusCode === "number" ? err.statusCode : undefined;

  if (statusCode !== undefined) {
    if (statusCode >= 500 || statusCode === 429) return { reason: "server", retriable: true };
    return { reason: "http", retriable: false };
  }
  if (err?.name === "AbortError" || err?.name === "TimeoutError") {
    return { reason: "timeout", retriable: true };
  }
  // Browser fetch failures surface as TypeError ("Failed to fetch").
  return { reason: "network", retriable: true };
}

async function fetchOnce<T>(
  query: string,
  params: QueryParams | undefined
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await client.fetch<T>(query, params ?? {}, {
      signal: controller.signal,
      timeout: REQUEST_TIMEOUT_MS + 1_000,
    });
  } finally {
    clearTimeout(timer);
  }
}

type Shape<T> =
  | { kind: "ok"; value: T }
  | { kind: "not-found" }
  | { kind: "malformed"; reason: string };

async function fetchWithRetry<T>(
  query: string,
  params: QueryParams | undefined,
  assertShape: (data: unknown) => Shape<T>
): Promise<ContentResult<T>> {
  if (!isSanityConfigured) return { status: "unconfigured" };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const data = await fetchOnce(query, params);
      const shaped = assertShape(data);
      if (shaped.kind === "ok") return { status: "success", data: shaped.value };
      if (shaped.kind === "not-found") return { status: "not-found" };
      // Wrong shape: retrying the same request cannot fix it.
      return { status: "malformed", reason: shaped.reason };
    } catch (error) {
      const { reason, retriable } = classifyError(error);
      if (!retriable || attempt >= MAX_ATTEMPTS) {
        return { status: "error", reason, retriable };
      }
      await delay(RETRY_BACKOFF_MS * attempt);
    }
  }
  // Unreachable: the loop always returns.
  return { status: "error", reason: "network", retriable: true };
}

/** Read a list query. An empty array is a successful, genuinely empty dataset. */
export function fetchContentArray<T>(
  query: string,
  params?: QueryParams
): Promise<ContentResult<T[]>> {
  return fetchWithRetry(query, params, (data): Shape<T[]> =>
    Array.isArray(data)
      ? { kind: "ok", value: data as T[] }
      : { kind: "malformed", reason: "expected an array response" }
  );
}

/**
 * Read a single document. A resolved `null` means "no matching document"
 * (a legitimate not-found), not a failure.
 */
export function fetchContentOne<T>(
  query: string,
  params?: QueryParams
): Promise<ContentResult<T | null>> {
  return fetchWithRetry(query, params, (data): Shape<T | null> =>
    data === null
      ? { kind: "not-found" }
      : typeof data === "object" && !Array.isArray(data)
        ? { kind: "ok", value: data as T }
        : { kind: "malformed", reason: "expected an object or null response" }
  );
}
