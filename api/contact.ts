/**
 * Vercel serverless adapter for the contact endpoint (`POST /api/contact`).
 *
 * All request logic lives in the pure handler (`src/lib/contact/handler.ts`);
 * this file only wires environment-backed dependencies and maps the result
 * onto the Node req/res contract Vercel provides.
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
  RATE_LIMITS,
} from "../src/lib/contact/rules";
import {
  handleContactRequest,
  type ContactMail,
  type RateLimitDecision,
} from "../src/lib/contact/handler";

export const maxDuration = 30;

/** Minimal structural types — avoids taking a dependency on @vercel/node. */
type VercelRequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
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
    const ip = firstHeader(req.headers["x-vercel-forwarded-for"]);
    const salt = env.RL_SALT as string;
    const ipHash = await hmacSha256(salt, `ip:${ip}`);

    redis ??= new Redis({
      url: env.UPSTASH_REDIS_REST_URL as string,
      token: env.UPSTASH_REDIS_REST_TOKEN as string,
    });
    resend ??= new Resend(env.RESEND_API_KEY);

    const hashFingerprint = (value: string) => hmacSha256(salt, `fp:${value}`);

    const dayKey = `rl:global:${new Date().toISOString().slice(0, 10)}`;
    const ip10mKey = `rl:ip10m:${ipHash}`;
    const ipDayKey = `rl:ipday:${ipHash}`;

    const checkRateLimit = async (): Promise<RateLimitDecision> => {
      const now = Date.now();
      // One round trip: trim stale ZSET members, read both ZCARD counts,
      // and read the global daily counter.
      const read = redis!.pipeline();
      read.zremrangebyscore(ip10mKey, 0, now - RATE_LIMITS.perIpTenMinutes.windowMs);
      read.zcard(ip10mKey);
      read.zremrangebyscore(ipDayKey, 0, now - RATE_LIMITS.perIpDay.windowMs);
      read.zcard(ipDayKey);
      read.get(dayKey);
      const [, ip10m, , ipDay, globalRaw] = (await read.exec()) as [unknown, number, unknown, number, unknown];
      const globalCount = Number(globalRaw ?? 0) || 0;
      const limits: Array<{ count: number; max: number; windowMs: number }> = [
        { count: Number(ip10m) || 0, max: RATE_LIMITS.perIpTenMinutes.max, windowMs: RATE_LIMITS.perIpTenMinutes.windowMs },
        { count: Number(ipDay) || 0, max: RATE_LIMITS.perIpDay.max, windowMs: RATE_LIMITS.perIpDay.windowMs },
        { count: globalCount, max: RATE_LIMITS.globalDay.max, windowMs: RATE_LIMITS.globalDay.windowMs },
      ];
      const binding = limits.find((limit) => limit.count >= limit.max);
      if (binding) {
        return { allowed: false, retryAfterMs: binding.windowMs };
      }
      // Consume a slot in each window (check-then-add; best effort under
      // concurrency — the global cap and per-IP caps stay meaningful at this
      // traffic level).
      const write = redis!.pipeline();
      write.zadd(ip10mKey, { score: now, member: `${now}:${crypto.randomUUID()}` });
      write.expire(ip10mKey, Math.ceil(RATE_LIMITS.perIpTenMinutes.windowMs / 1000));
      write.zadd(ipDayKey, { score: now, member: `${now}:${crypto.randomUUID()}` });
      write.expire(ipDayKey, Math.ceil(RATE_LIMITS.perIpDay.windowMs / 1000));
      write.incr(dayKey);
      write.expire(dayKey, Math.ceil(RATE_LIMITS.globalDay.windowMs / 1000));
      await write.exec();
      return { allowed: true };
    };

    const isDuplicate = async (fp: string): Promise<boolean> => {
      const seen = await redis!.get(`rl:dup:${await hashFingerprint(fp)}`);
      return seen !== null;
    };

    const recordFingerprint = async (fp: string): Promise<void> => {
      await redis!.set(`rl:dup:${await hashFingerprint(fp)}`, "1", {
        nx: true,
        ex: DEDUPE_WINDOW_SECONDS,
      });
    };

    const sendMail = async (mail: ContactMail): Promise<unknown> => {
      const { data, error } = await resend!.emails.send({
        from: mail.from,
        to: mail.to,
        subject: mail.subject,
        replyTo: mail.replyTo ?? undefined,
        text: mail.text,
      });
      if (error) {
        // Never include the provider's message — it may echo request data.
        console.error("contact_send_failed", error.name ?? "unknown");
        throw new Error("Email delivery failed");
      }
      console.log("contact_sent", data?.id ?? "unknown");
      return data;
    };

    // The pure handler wants the raw body for its byte-size gate. Vercel has
    // already parsed it, so approximate with the serialized payload (accurate
    // for the JSON shapes this endpoint accepts).
    const rawBody =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = firstHeader(value);
    }

    const result = await handleContactRequest(
      { method: req.method ?? "", headers, rawBody },
      {
        sendMail,
        isDuplicate,
        recordFingerprint,
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
