import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Screen-reader announced loading copy. */
  label?: string;
  className?: string;
}

/**
 * Shared loading state.
 *
 * `role="status"` is implicitly `aria-live="polite"`, so the label is
 * announced to assistive technology without extra plumbing. The visual
 * spinner alone is never the only signal.
 */
export function LoadingState({ label = "Loading content…", className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-pale4 bg-surface-alt px-6 py-14 text-center",
        className
      )}
    >
      <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-accent" />
      <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/65">
        {label}
      </p>
    </div>
  );
}
