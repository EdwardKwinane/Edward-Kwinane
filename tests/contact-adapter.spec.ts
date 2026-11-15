import { test, expect } from "@playwright/test";
import { Readable } from "node:stream";
import handler from "../api/contact";
import { MAX_BODY_BYTES } from "../src/lib/contact/rules";

/**
 * Adapter-level tests for the Vercel contact function (`api/contact.ts`).
 *
 * These prove the 32 KB limit is enforced on the ORIGINAL request bytes,
 * before any JSON parsing — not on a serialized view of an already-parsed
 * body. Every early gate (405/403/413/415/400) is exercised with no network:
 * the handler never reaches its Redis/Resend dependencies on those paths,
 * and none of those dependencies are constructed until they are needed.
 *
 * They also prove the stream lifecycle contracts:
 * - early-rejected requests never consume the request stream (no `data`
 *   listener is even attached, `read()` is never called);
 * - an oversized request still receives its 413: the stream is paused, the
 *   response carries `connection: close`, and the request is destroyed only
 *   AFTER the response has flushed — never mid-response.
 *
 * Dummy environment values are set per test; no real credentials are used.
 */

const VALID_MESSAGE = "I would like to discuss a voice agent for our support team.";

function validPayloadJSON(): string {
  return JSON.stringify({
    name: "Ada Lovelace",
    email: "ada@example.com",
    projectType: "AI Voice Agent",
    message: VALID_MESSAGE,
  });
}

function invalidPayloadJSON(): string {
  return JSON.stringify({ name: "", email: "", projectType: "", message: "" });
}

/**
 * Builds a req stream that records how much the adapter consumed it.
 * The harness attaches NO listeners of its own (a `data` listener would force
 * flowing mode and mask a consumer), so `reads === 0` and
 * `listenerCount("data") === 0` prove the adapter never touched the stream.
 */
function makeReq(
  body: string | Buffer,
  headers: Record<string, string>,
  method = "POST",
) {
  const seen = { reads: 0, destroyed: 0 };
  const chunk = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  const stream = new Readable({
    autoDestroy: false, // only explicit adapter destroy() calls are counted
    read() {
      seen.reads += 1;
      this.push(chunk);
      this.push(null);
    },
  }) as Readable & {
    method: string;
    headers: Record<string, string>;
  };
  stream.method = method;
  stream.headers = headers;
  const originalDestroy = stream.destroy.bind(stream);
  stream.destroy = ((...args: unknown[]) => {
    seen.destroyed += 1;
    return originalDestroy(...(args as []));
  }) as typeof stream.destroy;
  return { req: stream, seen };
}

interface FakeRes {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Minimal res fake. `on("finish")` stores listeners so tests can fire the
 * Node ServerResponse "finish" event and assert what the adapter does only
 * after the response has been flushed.
 */
function makeRes() {
  const finishListeners: Array<() => void> = [];
  const res: FakeRes & {
    status(code: number): unknown;
    setHeader(name: string, value: string | number): unknown;
    json(payload: unknown): void;
    on(event: "finish", listener: () => void): unknown;
    emitFinish(): void;
  } = {
    statusCode: 0,
    headers: {},
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    setHeader(name: string, value: string | number) {
      res.headers[name.toLowerCase()] = String(value);
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
    },
    on(event: "finish", listener: () => void) {
      if (event === "finish") finishListeners.push(listener);
      return res;
    },
    emitFinish() {
      for (const listener of [...finishListeners]) listener();
    },
  };
  return res;
}

function baseHeaders(): Record<string, string> {
  return {
    "x-vercel-forwarded-for": "203.0.113.7",
    origin: "https://portfolio.example.com",
    host: "portfolio.example.com",
    "content-type": "application/json",
  };
}

const ENV_KEYS = [
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CONTACT_RECIPIENT",
  "CONTACT_SENDER",
  "RL_SALT",
] as const;

test.beforeEach(() => {
  process.env.RESEND_API_KEY = "test_resend_key";
  process.env.UPSTASH_REDIS_REST_URL = "https://upstash.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test_upstash_token";
  process.env.CONTACT_RECIPIENT = "owner@example.com";
  process.env.CONTACT_SENDER = "onboarding@resend.dev";
  process.env.RL_SALT = "test_salt";
});

test.afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

test("413 on original request bytes: whitespace padding that JSON.stringify would hide", async () => {
  // The old implementation measured the serialized parsed body, which ignores
  // insignificant whitespace. This body is > 32 KB of leading whitespace plus
  // a tiny JSON document — it must be rejected even though its parsed form is small.
  const body = " ".repeat(MAX_BODY_BYTES + 100) + validPayloadJSON();
  const res = makeRes();
  await handler(makeReq(body, baseHeaders()).req as never, res as never);
  expect(res.statusCode).toBe(413);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("too_large");
});

test("413 is enforced on a single byte over the limit", async () => {
  const padding = " ".repeat(MAX_BODY_BYTES + 1 - validPayloadJSON().length);
  const body = padding + validPayloadJSON(); // exactly MAX_BODY_BYTES + 1 bytes
  const res = makeRes();
  await handler(makeReq(body, baseHeaders()).req as never, res as never);
  expect(res.statusCode).toBe(413);
});

test("a body of exactly 32 KB passes the size gate", async () => {
  // Invalid payload, so validation fails with 400 AFTER the size gate —
  // proving the gate allowed the full 32 KB.
  const inner = invalidPayloadJSON();
  const body = " ".repeat(MAX_BODY_BYTES - Buffer.byteLength(inner, "utf8")) + inner;
  expect(Buffer.byteLength(body, "utf8")).toBe(MAX_BODY_BYTES);
  const res = makeRes();
  await handler(makeReq(body, baseHeaders()).req as never, res as never);
  expect(res.statusCode).toBe(400);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("validation");
});

test("the limit counts bytes, not UTF-16 code units", async () => {
  // 2-byte characters: fewer than MAX_BODY_BYTES characters, more bytes.
  const inner = JSON.stringify({
    name: "é".repeat(17_000),
    email: "",
    projectType: "II",
    message: "",
  });
  const res = makeRes();
  await handler(makeReq(inner, baseHeaders()).req as never, res as never);
  expect(res.statusCode).toBe(413);
  expect(Buffer.byteLength(inner, "utf8")).toBeGreaterThan(MAX_BODY_BYTES);
  expect(inner.length).toBeLessThan(MAX_BODY_BYTES);
});

test("a lying small Content-Length does not bypass the byte counter", async () => {
  const body = " ".repeat(MAX_BODY_BYTES + 100) + validPayloadJSON();
  const res = makeRes();
  await handler(
    makeReq(body, { ...baseHeaders(), "content-length": "10" }).req as never,
    res as never,
  );
  expect(res.statusCode).toBe(413);
});

test("415 when Content-Type is missing", async () => {
  const headers = baseHeaders();
  delete headers["content-type"];
  const res = makeRes();
  await handler(makeReq(validPayloadJSON(), headers).req as never, res as never);
  expect(res.statusCode).toBe(415);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("unsupported_media_type");
});

test("415 when Content-Type is not application/json", async () => {
  const res = makeRes();
  await handler(
    makeReq(validPayloadJSON(), { ...baseHeaders(), "content-type": "text/plain" }).req as never,
    res as never,
  );
  expect(res.statusCode).toBe(415);
});

test("valid Content-Type (with charset) proceeds past the 415 gate", async () => {
  const res = makeRes();
  await handler(
    makeReq(invalidPayloadJSON(), { ...baseHeaders(), "content-type": "application/json; charset=utf-8" }).req as never,
    res as never,
  );
  expect(res.statusCode).toBe(400);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("validation");
});

test("malformed JSON still returns 400 invalid_json", async () => {
  const res = makeRes();
  await handler(makeReq("{ not json", baseHeaders()).req as never, res as never);
  expect(res.statusCode).toBe(400);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("invalid_json");
});

test("method and origin gates are preserved", async () => {
  const getRes = makeRes();
  await handler(makeReq(validPayloadJSON(), baseHeaders(), "GET").req as never, getRes as never);
  expect(getRes.statusCode).toBe(405);

  const headers = baseHeaders();
  delete headers.origin;
  const originRes = makeRes();
  await handler(makeReq(validPayloadJSON(), headers).req as never, originRes as never);
  expect(originRes.statusCode).toBe(403);
});

test("filled honeypot short-circuits to a 200 without any dependency", async () => {
  const body = JSON.stringify({
    ...JSON.parse(validPayloadJSON()),
    company: "Spam Farm Inc.",
  });
  const res = makeRes();
  await handler(makeReq(body, baseHeaders()).req as never, res as never);
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ ok: true });
});

test("early gates reject without consuming a single byte of the request stream", async () => {
  // Finding 2: the inexpensive gates run in the adapter BEFORE readRawBody(),
  // so a rejected request must not read the stream at all — not even one
  // `read()` call, not even a `data` listener registration.
  const withoutHeader = (headers: Record<string, string>, name: string) => {
    const copy = { ...headers };
    delete copy[name];
    return copy;
  };
  const cases: Array<{ name: string; method?: string; headers: Record<string, string>; status: number; code: string }> = [
    { name: "non-POST method", method: "GET", headers: baseHeaders(), status: 405, code: "method_not_allowed" },
    { name: "missing Origin", headers: withoutHeader(baseHeaders(), "origin"), status: 403, code: "forbidden" },
    { name: "cross-origin Origin", headers: { ...baseHeaders(), origin: "https://evil.example.com" }, status: 403, code: "forbidden" },
    { name: "missing Content-Type", headers: withoutHeader(baseHeaders(), "content-type"), status: 415, code: "unsupported_media_type" },
    { name: "non-JSON Content-Type", headers: { ...baseHeaders(), "content-type": "text/plain" }, status: 415, code: "unsupported_media_type" },
  ];
  for (const c of cases) {
    const { req, seen } = makeReq(validPayloadJSON(), c.headers, c.method);
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.statusCode, `${c.name} → ${c.status}`).toBe(c.status);
    expect((res.body as { error?: { code?: string } }).error?.code, `${c.name} code`).toBe(c.code);
    expect(seen.reads, `${c.name}: read() must not be called`).toBe(0);
    expect(req.listenerCount("data"), `${c.name}: no data listener may be attached`).toBe(0);
  }
});

test("oversized request: 413 is delivered, then the request stream is released", async () => {
  // Finding 1: req.destroy() during the response drops the 413 (verified
  // against the Node lifecycle: the client sees ECONNRESET instead). The
  // adapter must pause the stream, send the response with connection: close,
  // and only destroy the request after the response has flushed.
  const body = " ".repeat(MAX_BODY_BYTES + 100) + validPayloadJSON();
  const { req, seen } = makeReq(body, baseHeaders());
  const res = makeRes();
  await handler(req as never, res as never);

  // The response was fully delivered before anything is torn down…
  expect(res.statusCode).toBe(413);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("too_large");
  expect(res.headers["connection"]).toBe("close");

  // …the stream was consumed up to the limit and then stopped (paused),
  // with no unbounded buffering and NO destroy mid-response…
  expect(seen.reads).toBeGreaterThan(0);
  expect(req.isPaused()).toBe(true);
  expect(seen.destroyed).toBe(0);

  // …and the request is destroyed only when Node flushes the response.
  res.emitFinish();
  expect(seen.destroyed).toBe(1);
});
