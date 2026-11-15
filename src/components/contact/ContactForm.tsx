import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

const projectTypes = [
  "AI Voice Agent",
  "RAG System",
  "AI Chatbot",
  "AI Agent",
  "Full-Stack Product",
  "Automation",
  "Other",
];

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;
const REQUEST_TIMEOUT_MS = 10_000;

type FormState = "idle" | "submitting" | "success" | "error";

/** Machine-readable outcome of one /api/contact round trip. */
type SubmitOutcome =
  | { kind: "success" }
  | { kind: "validation"; fields: Record<string, string> }
  | { kind: "duplicate" }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "too_large" }
  | { kind: "unavailable" };

const initialErrors: Record<string, string> = {};

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [projectType, setProjectType] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — never visible to humans or assistive technology.
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors);
  const [state, setState] = useState<FormState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [serverDown, setServerDown] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) next.name = "Please enter your name.";
    else if (trimmedName.length > MAX_NAME)
      next.name = `Name must be ${MAX_NAME} characters or fewer.`;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = "Please enter your email.";
    else if (
      trimmedEmail.length > MAX_EMAIL ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    )
      next.email = "Enter a valid email address.";

    if (!projectType) next.projectType = "Please select a project type.";

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < MIN_MESSAGE)
      next.message = `Message must be at least ${MIN_MESSAGE} characters.`;
    else if (trimmedMessage.length > MAX_MESSAGE)
      next.message = `Message must be ${MAX_MESSAGE} characters or fewer.`;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function postContact(payload: Record<string, string>): Promise<SubmitOutcome> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (response.status === 200) return { kind: "success" };
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as {
          error?: { fields?: Record<string, string> };
        } | null;
        return { kind: "validation", fields: body?.error?.fields ?? {} };
      }
      if (response.status === 409) return { kind: "duplicate" };
      if (response.status === 429) {
        const body = (await response.json().catch(() => null)) as {
          error?: { retryAfterSeconds?: number };
        } | null;
        return {
          kind: "rate_limited",
          retryAfterSeconds: body?.error?.retryAfterSeconds ?? 600,
        };
      }
      if (response.status === 413) return { kind: "too_large" };
      // 5xx (and anything unexpected) maps to "unavailable" and is safe to retry once.
      return { kind: "unavailable" };
    } catch {
      // Network failure or the 10s abort both surface as "unavailable".
      return { kind: "unavailable" };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function submitWithOneRetry(payload: Record<string, string>): Promise<SubmitOutcome> {
    const first = await postContact(payload);
    if (first.kind !== "unavailable") return first;
    // Single retry; the server's dedupe fingerprint makes it safe.
    return postContact(payload);
  }

  async function submitPayload(): Promise<void> {
    setState("submitting");
    setStatusMessage(null);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      projectType,
      message: message.trim(),
      company, // honeypot — must stay empty for real visitors
    };

    const outcome = await submitWithOneRetry(payload);

    if (outcome.kind === "success") {
      setState("success");
      return;
    }
    if (outcome.kind === "validation") {
      setErrors(outcome.fields);
      setStatusMessage("Please fix the highlighted fields and try again.");
      setState("error");
      return;
    }
    if (outcome.kind === "duplicate") {
      setStatusMessage("This message looks like it was already sent — no need to send it again.");
      setState("error");
      return;
    }
    if (outcome.kind === "rate_limited") {
      const minutes = Math.max(1, Math.ceil(outcome.retryAfterSeconds / 60));
      setStatusMessage(
        `Too many attempts. Please wait about ${minutes} ${
          minutes === 1 ? "minute" : "minutes"
        } and try again.`,
      );
      setState("error");
      return;
    }
    if (outcome.kind === "too_large") {
      setStatusMessage("That message is too long to send. Please shorten it and try again.");
      setState("error");
      return;
    }
    setServerDown(true);
    setState("error");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    if (!validate()) {
      setStatusMessage("Please fix the highlighted fields and try again.");
      setState("error");
      return;
    }
    await submitPayload();
  }

  if (state === "success") {
    return (
      <div
        className="flex flex-col items-start gap-4 rounded-2xl border border-success/30 bg-success-container/40 p-8"
        role="status"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-fg">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h3 className="font-heading text-xl font-semibold text-navy">Message submitted</h3>
        <p className="text-sm leading-relaxed text-ink/70">
          Thanks, {name.trim().split(" ")[0] || "there"} — your message was submitted to the
          email service. I typically reply within a couple of business days.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setState("idle");
            setMessage("");
            setErrors({});
            setStatusMessage(null);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  const fieldError = (key: string) =>
    errors[key] ? (
      <p
        id={`${key}-error`}
        role="alert"
        className="mt-1.5 flex items-center gap-1 text-xs font-medium text-error"
      >
        <XCircle className="h-3.5 w-3.5" /> {errors[key]}
      </p>
    ) : null;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={state === "submitting"}
      className="flex flex-col gap-5"
    >
      {state === "submitting" && (
        <p role="status" className="sr-only">
          Sending your message…
        </p>
      )}

      {state === "error" && serverDown ? (
        <ErrorState
          title="We couldn't send your message"
          description="The service is temporarily unavailable or your connection dropped. Your message was not sent — please try again."
          retryLabel="Try again"
          onRetry={() => {
            setServerDown(false);
            if (validate()) void submitPayload();
          }}
        />
      ) : state === "error" && statusMessage ? (
        <p
          role="alert"
          className="rounded-md border border-error/30 bg-error-container/40 px-4 py-3 text-sm font-medium text-error"
        >
          {statusMessage}
        </p>
      ) : null}

      {/* Honeypot: hidden from sight, unreachable by keyboard, removed from
          the accessibility tree. Real visitors leave it empty. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" className="mb-1.5 block">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            placeholder="Your name"
            autoComplete="name"
          />
          {fieldError("name")}
        </div>
        <div>
          <Label htmlFor="email" className="mb-1.5 block">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            maxLength={MAX_EMAIL}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            placeholder="you@company.com"
            autoComplete="email"
          />
          {fieldError("email")}
        </div>
      </div>

      <div>
        <Label htmlFor="project-type" className="mb-1.5 block">
          Project type
        </Label>
        <Select
          value={projectType}
          onValueChange={(v) => {
            setProjectType(v);
            if (errors.projectType) setErrors((p) => ({ ...p, projectType: "" }));
          }}
        >
          <SelectTrigger
            id="project-type"
            aria-invalid={!!errors.projectType}
            aria-describedby={errors.projectType ? "projectType-error" : undefined}
          >
            <SelectValue placeholder="Select a project type" />
          </SelectTrigger>
          <SelectContent>
            {projectTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError("projectType")}
      </div>

      <div>
        <Label htmlFor="message" className="mb-1.5 block">
          Message
        </Label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          value={message}
          maxLength={MAX_MESSAGE}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          placeholder="Tell me about the system you want to build…"
        />
        {fieldError("message")}
      </div>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={state === "submitting"}
        className={cn(state === "submitting" && "cursor-wait")}
      >
        {state === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
      <p className="text-xs text-ink/65">
        Your details are sent only to Edward and are never shared. Please don't include passwords
        or secrets.
      </p>
    </form>
  );
}
