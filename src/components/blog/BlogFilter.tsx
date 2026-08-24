import { cn } from "@/lib/utils";
import { blogFilterCategories } from "@/data/blog";

export function BlogFilter({
  active,
  onChange,
  className,
}: {
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label="Filter articles by category" className={cn("flex flex-wrap items-center gap-2", className)}>
      {blogFilterCategories.map((option) => (
        <button
          key={option}
          role="tab"
          aria-selected={active === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full border px-4 py-2 font-technical text-[11px] font-bold uppercase tracking-tech transition-all focus-ring",
            active === option
              ? "border-primary bg-primary text-white shadow-[0_4px_16px_rgba(13,13,91,0.25)]"
              : "border-surface-pale-4 bg-surface-alt text-ink/60 hover:border-navy/40 hover:text-navy"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}