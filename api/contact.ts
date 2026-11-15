/**
 * Vercel serverless adapter for the contact endpoint (`POST /api/contact`).
 *
 * All request logic lives in the pure handler (`src/lib/contact/handler.ts`);
 * this file only wires environment-backed dependencies and maps the result
 * onto the Node req/res contract Vercel provides.
 *
 * Body size: the raw request stream is consumed with a strict byte counter
 * BEFORE any JSON parsing. Vercel's `request.body` helper is a lazy getter,
 * so by never touching it we own the stream and can stop reading (and destroy
 * the connection) as soon as 32 KB is exceeded. No unbounded buffering.
 *
 * Fail closed: any missing configuration or dependency failure returns 503
 * rather than swallowing a lead or degrading anti-abuse protection.
 *
 * Privacy: no raw IPs, message contents or visitor emails are stored. Keys
 * are HMAC-SHA256 hashes over RL_SALT; the dedupe fingerprint is hashed the
 * same way and expires after ten minutes.
 */
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import {
  DEDUPE_WINDOW_SECONDS,
  MAX_BODY_BYTES,
  RATE_LIMITS,
} from "../src/lib/contact/rules";
import {
  DefiniteSendFailure,
  handleContactRequest,
  UncertainSendFailure,
  type ContactMail,
  type RateLimitDecision,
} from "../src/lib/contact/handler";

export const maxDuration = 30;

/** Minimal structural types — avoids taking a dependency on @vercel/node. */
type VercelRequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  /** Raw body stream (Node IncomingMessage); never touch the lazy `body` getter. */
  on(event: "data" | "end" | "error", listener: (...args: unknown[]) => void): unknown;
  destroy?(error?: Error): void;
};
type VercelResponseLike = {
  status(code: number): VercelResponseLike;
  setHeader(name: string, value: string | number): VercelResponseLike;
  json(payload: unknown): void;
};

interface ContactEnv {
  RESEND_API_KEY?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  CONTACT_RECIPIENT?: string;
  CONTACT_SENDER?: string;
  RL_SALT?: string;
}

let redis: Redis | null = null;
let resend: Resend | null = null;

async function hmacSha256(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function firstHeader(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").split(",")[0].trim();
}

type RawBodyResult = { tooLarge: false; body: string } | { tooLarge: true };

/**
 * Consumes the raw request stream with a strict byte counter. Stops reading
 * (and tears the connection down) the moment the limit is exceeded, so an
 * unbounded upload is never buffered. A stream error yields an empty body,
 * which the handler's JSON gate rejects as invalid_json.
 */
function readRawBody(req: VercelRequestLike, maxBytes: number): Promise<RawBodyResult> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const settle = (result: RawBodyResult): void => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    req.on("data", (chunk: unknown) => {
      total += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
      if (total > maxBytes) {
        settle({ tooLarge: true });
        req.destroy?.();
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    });
    req.on("end", () => settle({ tooLarge: false, body: Buffer.concat(chunks).toString("utf8") }));
    req.on("error", () => settle({ tooLarge: false, body: "" }));
  });
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike): Promise<void> {
  const env: ContactEnv = process.env;
  const missing = [
    "RESEND_API_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "CONTACT_RECIPIENT",
    "CONTACT_SENDER",
    "RL_SALT",
  ].filter((name) => !env[name as keyof ContactEnv]);

  if (missing.length > 0) {
    // Misconfigured deployment: fail closed, log only the missing key names.
    console.error("contact_misconfigured", JSON.stringify(missing));
    res.status(503).json({ ok: false, error: { code: "unavailable" } });
    return;
  }

  try {
    // Genuine byte limit on the ORIGINAL request bytes, before JSON parsing.
    const raw = await readRawBody(req, MAX_BODY_BYTES);
    if (raw.tooLarge) {
      res.status(413).json({ ok: false, error: { code: "too_large" } });
      return;
    }

    const ip = firstHeader(req.headers["x-vercel-forwarded-for"]);
    const salt = env.RL_SALT as string;
    const ipHash = await hmacSha256(salt, `ip:${ip}`);

    const hashFingerprint = (value: string) => hmacSha256(salt, `fp:${value}`);

    const globalKey = "rl:global";
    const ip10mKey = `rl:ip10m:${ipHash}`;
    const ipDayKey = `rl:ipday:${ipHash}`;

    // Lazy singletons: only constructed on a request that reaches a Redis or
    // Resend dependency, so early-rejected requests (405/403/413/415/400)
    // never touch the network.
    const getRedis = (): Redis => (redis ??= new Redis({
      url: env.UPSTASH_REDIS_REST_URL as string,
      token: env.UPSTASH_REDIS_REST_TOKEN as string,
    }));
    const getResend = (): Resend => (resend ??= new Resend(env.RESEND_API_KEY));

    const checkRateLimit = async (): Promise<RateLimitDecision> => {
      const now = Date.now();
      // One round trip: trim stale members, read all three rolling windows
      // (ZCARD) and their oldest member (for a precise Retry-After).
      // The global window is a genuine rolling 24 hours — no calendar-date
      // key, so a UTC midnight boundary cannot reset it.
      const read = getRedis().pipeline();
      read.zremrangebyscore(ip10mKey, 0, now - RATE_LIMITS.perIpTenMinutes.windowMs);
      read.zcard(ip10mKey);
      read.zremrangebyscore(ipDayKey, 0, now - RATE_LIMITS.perIpDay.windowMs);
      read.zcard(ipDayKey);
      read.zremrangebyscore(globalKey, 0, now - RATE_LIMITS.globalDay.windowMs);
      read.zcard(globalKey);
      read.zrange(ip10mKey, "-inf", "+inf", { byScore: true, withScores: true, offset: 0, count: 1 });
      read.zrange(ipDayKey, "-inf", "+inf", { byScore: true, withScores: true, offset: 0, count: 1 });
      read.zrange(globalKey, "-inf", "+inf", { byScore: true, withScores: true, offset: 0, count: 1 });
      const results = (await read.exec()) as unknown[];

      const count = (i: number): number => Number(results[i]) || 0;
      const oldestScore = (i: number): number | null => {
        const entry = results[i] as string[] | null;
        return entry && entry.length >= 2 ? Number(entry[1]) : null;
      };

      const limits: Array<{ count: number; max: number; windowMs: number; oldestIndex: number }> = [
        { count: count(1), max: RATE_LIMITS.perIpTenMinutes.max, windowMs: RATE_LIMITS.perIpTenMinutes.windowMs, oldestIndex: 6 },
        { count: count(3), max: RATE_LIMITS.perIpDay.max, windowMs: RATE_LIMITS.perIpDay.windowMs, oldestIndex: 7 },
        { count: count(5), max: RATE_LIMITS.globalDay.max, windowMs: RATE_LIMITS.globalDay.windowMs, oldestIndex: 8 },
      ];
      const binding = limits.find((limit) => limit.count >= limit.max);
      if (binding) {
        const oldest = oldestScore(binding.oldestIndex);
        // Precise retry-after from the oldest in-window stamp; fall back to
        // the full window if the ZSET is somehow empty.
        const retryAfterMs = oldest === null
          ? binding.windowMs
          : Math.max(0, oldest + binding.windowMs - now);
        return { allowed: false, retryAfterMs };
      }

      // Consume a slot in each window. Check-then-add: under genuine
      // concurrency two requests can both pass the read, so the caps are
      // best-effort at this traffic level. The duplicate-send guarantee does
      // NOT rely on this — it relies on the atomic SET NX claim below.
      const write = getRedis().pipeline();
      write.zadd(ip10mKey, { score: now, member: `${now}:${crypto.randomUUID()}` });
      write.zadd(ipDayKey, { score: now, member: `${now}:${crypto.randomUUID()}` });
      write.zadd(globalKey, { score: now, member: `${now}:${crypto.randomUUID()}` });
      write.expire(ip10mKey, Math.ceil(RATE_LIMITS.perIpTenMinutes.windowMs / 1000));
      write.expire(ipDayKey, Math.ceil(RATE_LIMITS.perIpDay.windowMs / 1000));
      write.expire(globalKey, Math.ceil(RATE_LIMITS.globalDay.windowMs / 1000));
      await write.exec();
      return { allowed: true };
    };

    // Atomic duplicate reservation: exactly one request can win the SET NX.
    const claimFingerprint = async (fp: string): Promise<boolean> => {
      const claimed = await getRedis().set(`rl:dup:${await hashFingerprint(fp)}`, "1", {
        nx: true,
        ex: DEDUPE_WINDOW_SECONDS,
      });
      return claimed === "OK";
    };

    // Released only on a DEFINITE send failure, so an uncertain outcome
    // (timeout / provider 5xx / network error) can never produce a second
    // delivery attempt for the same fingerprint.
    const releaseFingerprint = async (fp: string): Promise<void> => {
      await getRedis().del(`rl:dup:${await hashFingerprint(fp)}`);
    };

    const sendMail = async (mail: ContactMail, signal?: AbortSignal): Promise<unknown> => {
      const { data, error } = await getResend().emails.send(
        {
          from: mail.from,
          to: mail.to,
          subject: mail.subject,
          replyTo: mail.replyTo ?? undefined,
          text: mail.text,
        },
        { signal },
      );
      if (error) {
        // Never include the provider's message — it may echo request data.
        console.error("contact_send_failed", error.name ?? "unknown");
        // A 4xx rejection definitively did not deliver; anything else
        // (5xx, network) has an unknown outcome and must keep the reservation.
        const statusCode = error.statusCode ?? 0;
        if (statusCode >= 400 && statusCode < 500) throw new DefiniteSendFailure();
        throw new UncertainSendFailure();
      }
      console.log("contact_sent", data?.id ?? "unknown");
      return data;
    };

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = firstHeader(value);
    }

    const result = await handleContactRequest(
      { method: req.method ?? "", headers, rawBody: raw.body },
      {
        sendMail,
        claimFingerprint,
        releaseFingerprint,
        checkRateLimit,
        mail: {
          from: env.CONTACT_SENDER as string,
          to: env.CONTACT_RECIPIENT as string,
        },
      },
    );

    if (result.retryAfterSeconds !== null) {
      res.setHeader("Retry-After", result.retryAfterSeconds);
    }
    res.status(result.status).json(result.body);
  } catch (err) {
    // Fail closed. Never leak internals; TypeError/message may contain hints.
    console.error("contact_unexpected", err instanceof Error ? err.name : "unknown");
    res.status(503).json({ ok: false, error: { code: "unavailable" } });
  }
}
