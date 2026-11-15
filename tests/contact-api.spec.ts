import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import {
  handleContactRequest,
  SUBJECT,
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
  evaluateSlidingWindow,
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
    headers: { origin: "https://portfolio.example.com", host: "portfolio.example.com" },
    rawBody: JSON.stringify(validPayload()),
    ...overrides,
  };
}

interface FakeDeps extends ContactDeps {
  sentMails: ContactMail[];
  fingerprints: string[];
}

function makeDeps(overrides: Partial<ContactDeps> = {}): FakeDeps {
  const sentMails: ContactMail[] = [];
  const fingerprints: string[] = [];
  return {
    sentMails,
    fingerprints,
    sendMail: async (mail: ContactMail) => {
      sentMails.push(mail);
      return "re_test_id";
    },
    isDuplicate: async () => false,
    recordFingerprint: async (fp: string) => {
      fingerprints.push(fp);
    },
    checkRateLimit: async (): Promise<RateLimitDecision> => ({ allowed: true }),
    mail: { from: "onboarding@resend.dev", to: "owner@example.com" },
    ...overrides,
  };
}

test.describe("POST /api/contact — request gates", () => {
  test("valid submission sends one email and records the fingerprint", async () => {
    const deps = makeDeps();
    const result = await handleContactRequest(makeRequest(), deps);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(deps.sentMails).toHaveLength(1);
    expect(deps.fingerprints).toHaveLength(1);

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
      makeRequest({ headers: { host: "portfolio.example.com" } }),
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
        headers: { origin: "https://evil.example.com", host: "portfolio.example.com" },
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
        headers: { origin: "HTTPS://PORTFOLIO.EXAMPLE.COM", host: "portfolio.example.com" },
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
    expect(deps.fingerprints).toHaveLength(0);
  });
});

test.describe("POST /api/contact — rate limiting and duplicates", () => {
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
  });

  test("Redis dedupe failure fails closed with 503", async () => {
    const deps = makeDeps({
      isDuplicate: async () => {
        throw new Error("redis down");
      },
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(503);
    expect(result.body.error?.code).toBe("unavailable");
    expect(deps.sentMails).toHaveLength(0);
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
  });

  test("duplicate fingerprint returns 409 without sending", async () => {
    const deps = makeDeps({ isDuplicate: async () => true });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(409);
    expect(result.body.error?.code).toBe("duplicate");
    expect(deps.sentMails).toHaveLength(0);
  });
});

test.describe("POST /api/contact — email delivery", () => {
  test("Resend failure maps to 502 and does not record the fingerprint", async () => {
    const deps = makeDeps({
      sendMail: async () => {
        throw new Error("resend exploded");
      },
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(502);
    expect(result.body.error?.code).toBe("unavailable");
    expect(deps.fingerprints).toHaveLength(0);
  });

  test("Resend timeout maps to 504 and does not record the fingerprint", async () => {
    const deps = makeDeps({
      sendTimeoutMs: 50,
      sendMail: () => new Promise(() => {
        /* never resolves */
      }),
    });
    const result = await handleContactRequest(makeRequest(), deps);
    expect(result.status).toBe(504);
    expect(result.body.error?.code).toBe("unavailable");
    expect(deps.fingerprints).toHaveLength(0);
  });

  test("a failed attempt leaves no dedupe stamp, so a retry can succeed (A9)", async () => {
    let attempt = 0;
    const deps = makeDeps({
      sendMail: async (mail) => {
        attempt += 1;
        if (attempt === 1) throw new Error("transient failure");
        deps.sentMails.push(mail);
        return "re_retry";
      },
    });
    const first = await handleContactRequest(makeRequest(), deps);
    expect(first.status).toBe(502);

    // Simulate the client's retry-once: same fingerprint, sendMail now works.
    const second = await handleContactRequest(makeRequest(), deps);
    expect(second.status).toBe(200);
    expect(deps.fingerprints).toHaveLength(1);
  });

  test("email subject is fixed and never contains user input", async () => {
    const deps = makeDeps();
    await handleContactRequest(
      makeRequest({
        rawBody: JSON.stringify(validPayload({ name: "Injected\nBcc: victim@example.com" })),
      }),
      deps,
    );
    // The name contains a CRLF, which is fine in the body, but the subject must stay fixed.
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
