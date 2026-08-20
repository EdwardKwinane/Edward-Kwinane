import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

type FormState = "idle" | "submitting" | "success" | "error";

const projectTypes = [
  "AI Voice Agent",
  "RAG System",
  "AI Chatbot",
  "AI Agent",
  "Full-Stack Product",
  "Automation",
  "Other",
];

const initialErrors: Record<string, string> = {};

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [projectType, setProjectType] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors);
  const [state, setState] = useState<FormState>("idle");

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) next.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (!projectType) next.projectType = "Please select a project type.";
    if (!message.trim() || message.trim().length < 10)
      next.message = "Message must be at least 10 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      setState("error");
      return;
    }
    setState("submitting");
    window.setTimeout(() => {
      setState("success");
    }, 1200);
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-success/30 bg-success-container/40 p-8" role="status">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h3 className="font-heading text-xl font-semibold text-navy">Message ready to send</h3>
        <p className="text-sm leading-relaxed text-ink/70">
          Thanks, {name.split(" ")[0] || "there"} — this demo form simulates submission. Connect the
          form to your email or API endpoint to start receiving messages.
        </p>
        <Button variant="outline" size="sm" onClick={() => { setState("idle"); setMessage(""); setErrors({}); }}>
          Send another message
        </Button>
      </div>
    );
  }

  const fieldError = (key: string) =>
    errors[key] ? (
      <p id={`${key}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-error">
        <XCircle className="h-3.5 w-3.5" /> {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {state === "error" && (
        <p role="alert" className="rounded-md border border-error/30 bg-error-container/40 px-4 py-3 text-sm font-medium text-error">
          Please fix the highlighted fields and try again.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" className="mb-1.5 block">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            value={name}
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
        <Select value={projectType} onValueChange={(v) => { setProjectType(v); if (errors.projectType) setErrors((p) => ({ ...p, projectType: "" })); }}>
          <SelectTrigger id="project-type" aria-invalid={!!errors.projectType} aria-describedby={errors.projectType ? "projectType-error" : undefined}>
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
            Processing…
          </>
        ) : (
          "Start the conversation →"
        )}
      </Button>
      <p className="text-xs text-ink/40">
        This form is a demo with simulated submission. Connect it to a real endpoint to receive messages.
      </p>
    </form>
  );
}