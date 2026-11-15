import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Shared genuinely-empty state.
 *
 * Must only be rendered after a *successful* response confirmed there is no
 * content. Never use it for API failures — those get `ErrorState`.
 */
export function EmptyState({
  title = "Nothing here yet",
  description = "There is no published content for this section yet. Check back soon.",
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-surface-pale4 bg-surface-alt px-6 py-14 text-center",
        className
      )}
    >
      <Inbox aria-hidden="true" className="h-8 w-8 text-ink/65" />
      <h2 tabIndex={-1} className="font-heading text-2xl font-semibold text-navy">
        {title}
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-ink/65">{description}</p>
    </div>
  );
}
