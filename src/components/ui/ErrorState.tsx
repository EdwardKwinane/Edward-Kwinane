import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Visitor-facing recovery action. Rendered only when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Shared recoverable-error state.
 *
 * Deliberately visitor-safe: no stack traces, GROQ, URLs or API details are
 * rendered, ever. Announcement to assistive technology is handled by
 * `role="alert"` — focus is intentionally NOT moved on mount, because these
 * states render inline per section and async error resolution times vary, so
 * stealing focus would yank keyboard visitors away from where they were. The
 * heading keeps `tabIndex={-1}` so a deliberate programmatic focus is still
 * possible. The retry control keeps a full 44px tap target per the existing
 * a11y work.
 */
export function ErrorState({
  title = "This content couldn't be loaded",
  description = "Something went wrong while fetching the latest content. This is usually temporary — please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false);

  function handleRetry() {
    setRetrying(true);
    onRetry?.();
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-accent/30 bg-surface-alt px-6 py-14 text-center",
        className
      )}
    >
      <AlertTriangle aria-hidden="true" className="h-8 w-8 text-accent-dark" />
      <h2 tabIndex={-1} className="focus-ring font-heading text-2xl font-semibold text-navy">
        {title}
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-ink/65">{description}</p>
      {onRetry && (
        <Button variant="accent" size="md" disabled={retrying} onClick={handleRetry}>
          {retrying ? "Retrying…" : retryLabel}
        </Button>
      )}
    </div>
  );
}
