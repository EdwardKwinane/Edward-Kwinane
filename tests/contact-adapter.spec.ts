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

function makeReq(body: string | Buffer, headers: Record<string, string>, method = "POST") {
  const stream = Readable.from([
    typeof body === "string" ? Buffer.from(body, "utf8") : body,
  ]) as Readable & {
    method: string;
    headers: Record<string, string>;
  };
  stream.method = method;
  stream.headers = headers;
  return stream;
}

interface FakeRes {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

function makeRes() {
  const res: FakeRes & {
    status(code: number): unknown;
    setHeader(name: string, value: string | number): unknown;
    json(payload: unknown): void;
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
  await handler(makeReq(body, baseHeaders()) as never, res as never);
  expect(res.statusCode).toBe(413);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("too_large");
});

test("413 is enforced on a single byte over the limit", async () => {
  const padding = " ".repeat(MAX_BODY_BYTES + 1 - validPayloadJSON().length);
  const body = padding + validPayloadJSON(); // exactly MAX_BODY_BYTES + 1 bytes
  const res = makeRes();
  await handler(makeReq(body, baseHeaders()) as never, res as never);
  expect(res.statusCode).toBe(413);
});

test("a body of exactly 32 KB passes the size gate", async () => {
  // Invalid payload, so validation fails with 400 AFTER the size gate —
  // proving the gate allowed the full 32 KB.
  const inner = invalidPayloadJSON();
  const body = " ".repeat(MAX_BODY_BYTES - Buffer.byteLength(inner, "utf8")) + inner;
  expect(Buffer.byteLength(body, "utf8")).toBe(MAX_BODY_BYTES);
  const res = makeRes();
  await handler(makeReq(body, baseHeaders()) as never, res as never);
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
  await handler(makeReq(inner, baseHeaders()) as never, res as never);
  expect(res.statusCode).toBe(413);
  expect(Buffer.byteLength(inner, "utf8")).toBeGreaterThan(MAX_BODY_BYTES);
  expect(inner.length).toBeLessThan(MAX_BODY_BYTES);
});

test("a lying small Content-Length does not bypass the byte counter", async () => {
  const body = " ".repeat(MAX_BODY_BYTES + 100) + validPayloadJSON();
  const res = makeRes();
  await handler(
    makeReq(body, { ...baseHeaders(), "content-length": "10" }) as never,
    res as never,
  );
  expect(res.statusCode).toBe(413);
});

test("415 when Content-Type is missing", async () => {
  const headers = baseHeaders();
  delete headers["content-type"];
  const res = makeRes();
  await handler(makeReq(validPayloadJSON(), headers) as never, res as never);
  expect(res.statusCode).toBe(415);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("unsupported_media_type");
});

test("415 when Content-Type is not application/json", async () => {
  const res = makeRes();
  await handler(
    makeReq(validPayloadJSON(), { ...baseHeaders(), "content-type": "text/plain" }) as never,
    res as never,
  );
  expect(res.statusCode).toBe(415);
});

test("valid Content-Type (with charset) proceeds past the 415 gate", async () => {
  const res = makeRes();
  await handler(
    makeReq(invalidPayloadJSON(), { ...baseHeaders(), "content-type": "application/json; charset=utf-8" }) as never,
    res as never,
  );
  expect(res.statusCode).toBe(400);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("validation");
});

test("malformed JSON still returns 400 invalid_json", async () => {
  const res = makeRes();
  await handler(makeReq("{ not json", baseHeaders()) as never, res as never);
  expect(res.statusCode).toBe(400);
  expect((res.body as { error?: { code?: string } }).error?.code).toBe("invalid_json");
});

test("method and origin gates are preserved", async () => {
  const getRes = makeRes();
  await handler(makeReq(validPayloadJSON(), baseHeaders(), "GET") as never, getRes as never);
  expect(getRes.statusCode).toBe(405);

  const headers = baseHeaders();
  delete headers.origin;
  const originRes = makeRes();
  await handler(makeReq(validPayloadJSON(), headers) as never, originRes as never);
  expect(originRes.statusCode).toBe(403);
});

test("filled honeypot short-circuits to a 200 without any dependency", async () => {
  const body = JSON.stringify({
    ...JSON.parse(validPayloadJSON()),
    company: "Spam Farm Inc.",
  });
  const res = makeRes();
  await handler(makeReq(body, baseHeaders()) as never, res as never);
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
