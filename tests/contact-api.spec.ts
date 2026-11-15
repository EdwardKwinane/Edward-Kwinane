import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import {
  handleContactRequest,
  SUBJECT,
  DefiniteSendFailure,
  UncertainSendFailure,
  type ContactDeps,
  type ContactMail,
  type ContactRequest,
  type RateLimitDecision,
} from "../src/lib/contact/handler";
import {
  MAX_BODY_BYTES,
  MAX_MESSAGE_LENGTH,
  MIN_MESSAGE_LENGTH,
  PROJECT_TYPES,
  RATE_LIMITS,
  evaluateSlidingWindow,
  isJsonContentType,
  sanitizeReplyTo,
} from "../src/lib/contact/rules";

/**
 * Backend contract tests for POST /api/contact.
 *
 * Deterministic: every dependency is faked, no network, no filesystem beyond
 * reading the built client bundle for the credential-leak check. Runs in CI
 * with no credentials by construction.
 */

const VALID_MESSAGE = "I would like to discuss a voice agent for our support team.";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    projectType: "AI Voice Agent",
    message: VALID_MESSAGE,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<ContactRequest> = {}): ContactRequest {
  return {
    method: "POST",
    headers: {
      origin: "https://portfolio.example.com",
      host: "portfolio.example.com",
      "content-type": "application/json",
    },
    rawBody: JSON.stringify(validPayload()),
    ...overrides,
  };
}

interface FakeDeps extends ContactDeps {
  sentMails: ContactMail[];
  /** Fingerprints for which the atomic reservation was won. */
  claims: string[];
  /** Fingerprints whose reservation was released after a definite failure. */
  releases: string[];
}

/**
 * Fakes the Redis reservation: a claim succeeds exactly once per fingerprint
 * until released, mirroring SET NX / DEL semantics.
 */
function makeDeps(overrides: Partial<ContactDeps> = {}): FakeDeps {
  const sentMails: ContactMail[] = [];
  const claims: string[] = [];
  const releases: string[] = [];
  const reserved = new Set<string>();
  const base: ContactDeps = {
    sendMail: async (mail: ContactMail) => {
      sentMails.push(mail);
      return "re_test_id";
    },
    claimFingerprint: async (fp: string) => {
      if (reserved.has(fp)) return false;
      reserved.add(fp);
      claims.push(fp);
      return true;
    },
    releaseFingerprint: async (fp: string) => {
      reserved.delete(fp);
      releases.push(fp);
    },
    checkRateLimit: async (): Promise<RateLimitDecision> => ({ allowed: true }),
    mail: { from: "onboarding@resend.dev", to: "owner@example.com" },
  };
  return { ...base, ...overrides, sentMails, claims, releases };
}

test.describe("POST /api/contact — request gates", () => {
  test("valid submission sends one email and reserves the fingerprint", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(makeRequest(), deps);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(deps.sentMails).toHaveLength(1);
    expect(deps.claims).toHaveLength(1);
    expect(deps.releases).toHaveLength(0);

    const mail = deps.sentMails[0];
    expect(mail.from).toBe("onboarding@resend.dev");
    expect(mail.to).toBe("owner@example.com");
    expect(mail.subject).toBe(SUBJECT);
    expect(mail.replyTo).toBe("ada@example.com");
    expect(mail.text).toContain("Name: Ada Lovelace");
    expect(mail.text).toContain(VALID_MESSAGE);
  });

  test("unsupported method returns 405", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(makeRequest({ method: "GET" }), deps);
    expect(result.status).toBe(405);
    expect(result.body.error?.code).toBe("method_not_allowed");
    expect(deps.sentMails).toHaveLength(0);
  });

  test("missing origin returns 403", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(
      makeRequest({
        headers: { host: "portfolio.example.com", "content-type": "application/json" },
      }),
      deps,
    );
    expect(result.status).toBe(403);
    expect(result.body.error?.code).toBe("forbidden");
    expect(deps.sentMails).toHaveLength(0);
  });

  test("mismatched origin returns 403", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(
      makeRequest({
        headers: {
          origin: "https://evil.example.com",
          host: "portfolio.example.com",
          "content-type": "application/json",
        },
      }),
      deps,
    );
    expect(result.status).toBe(403);
    expect(deps.sentMails).toHaveLength(0);
  });

  test("case-insensitive scheme matching on origin accepts same host", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(
      makeRequest({
        headers: {
          origin: "HTTPS://PORTFOLIO.EXAMPLE.COM",
          host: "portfolio.example.com",
          "content-type": "application/json",
        },
      }),
      deps,
    );
    expect(result.status).toBe(200);
  });

  test("body over 32 KB returns 413", async () => {
    const deps = makeDeps();
    const oversized = JSON.stringify({ data: "x".repeat(MAX_BODY_BYTES + 1) });
    const result = await handleContactRequest(makeRequest({ rawBody: oversized }), deps);
    expect(result.status).toBe(413);
    expect(result.body.error?.code).toBe("too_large");
    expect(deps.sentMails).toHaveLength(0);
  });

  test("malformed JSON returns 400 invalid_json", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(makeRequest({ rawBody: "{oops" }), deps);
    expect(result.status).toBe(400);
    expect(result.body.error?.code).toBe("invalid_json");
    expect(deps.sentMails).toHaveLength(0);
  });
});

test.describe("POST /api/contact — Content-Type gate", () => {
  test("missing Content-Type returns 415", async () => {
    const deps = makeDeps();
    const { headers } = makeRequest();
    const { "content-type": _omitted, ...rest } = headers;
    const result = await handleContactRequest(makeRequest({ headers: rest }), deps);
    expect(result.status).toBe(415);
    expect(result.body.error?.code).toBe("unsupported_media_type");
    expect(deps.sentMails).toHaveLength(0);
  });

  test("incorrect Content-Type returns 415", async () => {
    for (const contentType of ["text/plain", "application/x-www-form-urlencoded", "text/json"]) {
      const deps = makeDeps();
      const result = await handleContactRequest(
        makeRequest({ headers: { ...makeRequest().headers, "content-type": contentType } }),
        deps,
      );
      expect(result.status).toBe(415);
      expect(result.body.error?.code).toBe("unsupported_media_type");
      expect(deps.sentMails).toHaveLength(0);
    }
  });

  test("valid Content-Type is accepted, including charset and case variations", async () => {
    for (const contentType of ["application/json", "Application/JSON", "application/json; charset=utf-8"]) {
      const deps = makeDeps();
      const result = await handleContactRequest(
        makeRequest({ headers: { ...makeRequest().headers, "content-type": contentType } }),
        deps,
      );
      expect(result.status).toBe(200);
    }
  });

  test("isJsonContentType predicate", () => {
    expect(isJsonContentType(undefined)).toBe(false);
    expect(isJsonContentType("")).toBe(false);
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType("application/schema+json")).toBe(false);
    expect(isJsonContentType("application/xml")).toBe(false);
  });
});

test.describe("POST /api/contact — validation", () => {
  test("missing required fields returns 400 with per-field errors", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(makeRequest({ rawBody: "{}" }), deps);
    expect(result.status).toBe(400);
    expect(result.body.error?.code).toBe("validation");
    const fields = result.body.error?.fields ?? {};
    expect(fields).toHaveProperty("name");
    expect(fields).toHaveProperty("email");
    expect(fields).toHaveProperty("projectType");
    expect(fields).toHaveProperty("message");
    expect(deps.sentMails).toHaveLength(0);
  });

  test("invalid email structure returns 400 (no send)", async () => {
    for (const email of ["not-an-email", "a@b", "@example.com", "ada@example"]) {
      const deps = makeDeps();
      const result = await handleContactRequest(
        makeRequest({ rawBody: JSON.stringify(validPayload({ email })) }),
        deps,
      );
      expect(result.status).toBe(400);
      expect(result.body.error?.fields?.email).toBeTruthy();
      expect(deps.sentMails).toHaveLength(0);
    }
  });

  test("header-injection attempt in email is rejected", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(
      makeRequest({
        rawBody: JSON.stringify(validPayload({ email: "ada@example.com\nBcc: victim@example.com" })),
      }),
      deps,
    );
    expect(result.status).toBe(400);
    expect(deps.sentMails).toHaveLength(0);
  });

  test("projectType outside the whitelist returns 400", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(
      makeRequest({ rawBody: JSON.stringify(validPayload({ projectType: "Crypto Scam" })) }),
      deps,
    );
    expect(result.status).toBe(400);
    expect(result.body.error?.fields?.projectType).toBeTruthy();
    expect(deps.sentMails).toHaveLength(0);
  });

  test("all whitelist project types are accepted", async () => {
    for (const projectType of PROJECT_TYPES) {
      const deps = makeDeps();
      const result = await handleContactRequest(
        makeRequest({ rawBody: JSON.stringify(validPayload({ projectType })) }),
        deps,
      );
      expect(result.status).toBe(200);
    }
  });

  test("message shorter than the minimum returns 400", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(
      makeRequest({ rawBody: JSON.stringify(validPayload({ message: "short" })) }),
      deps,
    );
    expect(result.status).toBe(400);
    expect(result.body.error?.fields?.message).toContain(String(MIN_MESSAGE_LENGTH));
  });

  test("message longer than the maximum returns 400", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(
      makeRequest({
        rawBody: JSON.stringify(validPayload({ message: "x".repeat(MAX_MESSAGE_LENGTH + 1) })),
      }),
      deps,
    );
    expect(result.status).toBe(400);
    expect(result.body.error?.fields?.message).toBeTruthy();
  });
});

test.describe("POST /api/contact — honeypot", () => {
  test("filled honeypot silently discards and never sends", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(
      makeRequest({ rawBody: JSON.stringify(validPayload({ company: "Spam Farm Inc." })) }),
      deps,
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(deps.sentMails).toHaveLength(0);
    expect(deps.claims).toHaveLength(0);
  });
});

test.describe("POST /api/contact — rate limiting and atomic duplicates", () => {
  test("rate-limited request returns 429 with Retry-After information", async () => {
    const deps = makeDeps({
      checkRateLimit: async () => ({ allowed: false, retryAfterMs: 120_500 }),
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(429);
    expect(result.body.error?.code).toBe("rate_limited");
    expect(result.body.error?.retryAfterSeconds).toBe(121);
    expect(result.retryAfterSeconds).toBe(121);
    expect(deps.sentMails).toHaveLength(0);
    expect(deps.claims).toHaveLength(0);
  });

  test("Redis rate-limit failure fails closed with 503", async () => {
    const deps = makeDeps({
      checkRateLimit: async () => {
        throw new Error("redis down");
      },
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(503);
    expect(result.body.error?.code).toBe("unavailable");
    expect(deps.sentMails).toHaveLength(0);
    expect(deps.claims).toHaveLength(0);
  });

  test("Redis claim failure fails closed with 503 and never sends", async () => {
    const deps = makeDeps({
      claimFingerprint: async () => {
        throw new Error("redis down");
      },
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(503);
    expect(result.body.error?.code).toBe("unavailable");
    expect(deps.sentMails).toHaveLength(0);
  });

  test("duplicate reservation returns 409 without sending", async () => {
    const deps = makeDeps({ claimFingerprint: async () => false });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(409);
    expect(result.body.error?.code).toBe("duplicate");
    expect(deps.sentMails).toHaveLength(0);
  });

  test("simultaneous identical requests: exactly one delivery attempt, one 200 and one 409", async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const [first, second] = await Promise.all([
      handleContactRequest(req, deps),
      handleContactRequest(req, deps),
    ]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(deps.sentMails).toHaveLength(1);
    expect(deps.claims).toHaveLength(1);
  });

  test("409 is returned before the rate limit is consumed by a duplicate", async () => {
    const deps = makeDeps({ claimFingerprint: async () => false });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(409);
  });
});

test.describe("POST /api/contact — email delivery", () => {
  test("definite provider rejection (4xx) maps to 502 and releases the reservation", async () => {
    const deps = makeDeps({
      sendMail: async () => {
        throw new DefiniteSendFailure();
      },
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(502);
    expect(result.body.error?.code).toBe("unavailable");
    expect(deps.claims).toHaveLength(1);
    expect(deps.releases).toHaveLength(1);
  });

  test("uncertain provider failure (5xx) maps to 502 and KEEPS the reservation", async () => {
    const deps = makeDeps({
      sendMail: async () => {
        throw new UncertainSendFailure();
      },
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(502);
    expect(deps.claims).toHaveLength(1);
    expect(deps.releases).toHaveLength(0);

    // The reservation is kept, so an immediate retry is answered 409.
    const retry = await handleContactRequest(makeRequest(), deps);
    expect(retry.status).toBe(409);
    expect(deps.sentMails).toHaveLength(0);
  });

  test("an unknown provider error is treated as uncertain and keeps the reservation", async () => {
    const deps = makeDeps({
      sendMail: async () => {
        throw new Error("socket hang up");
      },
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(502);
    expect(deps.releases).toHaveLength(0);
  });

  test("Resend timeout maps to 504, keeps the reservation and aborts the provider request", async () => {
    let capturedSignal: AbortSignal | undefined;
    const deps = makeDeps({
      sendTimeoutMs: 50,
      sendMail: (_mail, signal) => {
        capturedSignal = signal;
        return new Promise(() => {
          /* never resolves */
        });
      },
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(504);
    expect(result.body.error?.code).toBe("unavailable");
    expect(deps.claims).toHaveLength(1);
    expect(deps.releases).toHaveLength(0);
    expect(capturedSignal?.aborted).toBe(true);
  });

  test("timeout then retry is answered 409 and never initiates a second delivery", async () => {
    const deps = makeDeps({
      sendTimeoutMs: 50,
      sendMail: () => new Promise(() => {
        /* never resolves */
      }),
    });
    const first = await handleContactRequest(makeRequest(), deps);
    expect(first.status).toBe(504);

    const retry = await handleContactRequest(makeRequest(), deps);
    expect(retry.status).toBe(409);
    expect(deps.sentMails).toHaveLength(0);
  });

  test("definite failure then retry succeeds — the reservation was released", async () => {
    let attempt = 0;
    const deps = makeDeps({
      sendMail: async (mail) => {
        attempt += 1;
        if (attempt === 1) throw new DefiniteSendFailure();
        deps.sentMails.push(mail);
        return "re_retry";
      },
    });
    const first = await handleContactRequest(makeRequest(), deps);
    expect(first.status).toBe(502);
    expect(deps.releases).toHaveLength(1);

    const second = await handleContactRequest(makeRequest(), deps);
    expect(second.status).toBe(200);
    expect(deps.sentMails).toHaveLength(1);
    expect(deps.claims).toHaveLength(2);
  });

  test("email subject is fixed and never contains user input", async () => {
    const deps = makeDeps();
    await handleContactRequest(
      makeRequest({
        rawBody: JSON.stringify(validPayload({ name: "Injected\nBcc: victim@example.com" })),
      }),
      deps,
    );
    expect(deps.sentMails[0].subject).toBe(SUBJECT);
    expect(deps.sentMails[0].subject).not.toContain("Injected");
  });
});

test.describe("reply-to sanitisation", () => {
  test("strips CR/LF from reply-to before transport", () => {
    // After stripping, the address contains two @ signs → invalid → null.
    expect(sanitizeReplyTo("ada@example.com\r\nBcc: victim@example.com")).toBeNull();
    expect(sanitizeReplyTo("ada@example.com\nSubject: hi")).toBeNull();
    expect(sanitizeReplyTo("plain@example.com")).toBe("plain@example.com");
    expect(sanitizeReplyTo("")).toBeNull();
  });
});

test.describe("evaluateSlidingWindow", () => {
  test("allows under the limit and reports the count", () => {
    const result = evaluateSlidingWindow([1000, 2000], 3000, 10_000, 5);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  test("rejects at the limit and computes retry-after from the oldest entry", () => {
    const now = 60_000;
    const stamps = [10_000, 20_000, 30_000];
    const result = evaluateSlidingWindow(stamps, now, 60_000, 3);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(10_000 + 60_000 - now);
  });

  test("expired entries do not count against the limit", () => {
    const now = 1_000_000;
    const stamps = [now - 120_000, now - 110_000, now - 90_000];
    const result = evaluateSlidingWindow(stamps, now, 60_000, 3);
    expect(result.allowed).toBe(true);
  });
});

test.describe("rolling 24-hour global window (no calendar-date reset)", () => {
  const { windowMs, max } = RATE_LIMITS.globalDay;

  test("allows 49 attempts within the window, rejects the 50th", () => {
    const now = Date.parse("2026-01-01T12:00:00.000Z");
    const stamps = Array.from({ length: max - 1 }, (_, i) => now - 1_000 - i * 60_000);
    expect(evaluateSlidingWindow(stamps, now, windowMs, max)).toEqual({ allowed: true, retryAfterMs: 0 });

    stamps.push(now - 2_000);
    const rejected = evaluateSlidingWindow(stamps, now, windowMs, max);
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterMs).toBeGreaterThan(0);
  });

  test("midnight does not reset the window: attempts spanning UTC midnight count together", () => {
    const midnight = Date.parse("2026-01-01T00:00:00.000Z");
    const now = midnight + 30 * 60_000; // 00:30 UTC on Jan 1
    const beforeMidnight = midnight - 90 * 60_000; // 22:30 UTC on Dec 31
    const afterMidnight = midnight + 15 * 60_000; // 00:15 UTC on Jan 1
    const stamps = [...Array(max - 1).fill(beforeMidnight), afterMidnight];
    expect(evaluateSlidingWindow(stamps, now, windowMs, max).allowed).toBe(false);
  });

  test("entries older than 24 hours are trimmed and never counted", () => {
    const now = Date.parse("2026-01-01T12:00:00.000Z");
    const stale = now - 34 * 60 * 60_000;
    const stamps = [...Array(max).fill(stale), now - 5 * 60_000];
    expect(evaluateSlidingWindow(stamps, now, windowMs, max).allowed).toBe(true);
  });

  test("retry-after is measured from the oldest surviving entry, not the full window", () => {
    const now = Date.parse("2026-01-01T12:00:00.000Z");
    const oldest = now - 23 * 60 * 60_000; // 23 hours old
    const stamps = Array.from({ length: max }, (_, i) => oldest + i * 60_000);
    const result = evaluateSlidingWindow(stamps, now, windowMs, max);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(oldest + windowMs - now);
    expect(result.retryAfterMs).toBeLessThan(windowMs);
  });
});

test.describe("client bundle never sees server secrets", () => {
  test("built bundle contains no server credential names", () => {
    if (!existsSync("dist/assets")) {
      test.skip();
      return;
    }
    const assets = readdirSync("dist/assets").filter((f) => f.endsWith(".js"));
    expect(assets.length).toBeGreaterThan(0);
    const bundle = assets.map((f) => readFileSync(`dist/assets/${f}`, "utf8")).join("\n");
    for (const leak of [
      "RESEND_API_KEY",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "CONTACT_RECIPIENT",
      "RL_SALT",
      "onboarding@resend.dev",
    ]) {
      expect(bundle.includes(leak)).toBe(false);
    }
  });

  test("contact form source never imports the server handler or adapter", () => {
    const source = readFileSync("src/components/contact/ContactForm.tsx", "utf8");
    // The endpoint URL is expected; server-module imports and secret names are not.
    expect(source).not.toMatch(/from\s+["']\.\.?\/.*(lib\/contact|api\/contact)/);
    expect(source).not.toContain("RESEND_API_KEY");
    expect(source).not.toContain("UPSTASH");
    expect(source).not.toContain("RL_SALT");
    expect(source).not.toContain("CONTACT_RECIPIENT");
  });
});
