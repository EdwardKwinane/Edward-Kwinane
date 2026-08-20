import { cn } from "@/lib/utils";
import type { ProjectCategory } from "@/data/projects";

export const filterOptions: ("ALL" | ProjectCategory)[] = [
  "ALL",
  "AI",
  "VOICE",
  "RAG",
  "CHATBOTS",
  "AGENTS",
  "FULL-STACK",
];

export function ProjectFilter({
  active,
  onChange,
  className,
}: {
  active: "ALL" | ProjectCategory;
  onChange: (value: "ALL" | ProjectCategory) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter projects by category"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {filterOptions.map((option) => (
        <button
          key={option}
          role="tab"
          aria-selected={active === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full border px-4 py-2 font-technical text-[11px] font-bold uppercase tracking-tech transition-all focus-ring",
            active === option
              ? "border-navy bg-navy text-white shadow-[0_4px_16px_rgba(13,13,91,0.25)]"
              : "border-surface-pale-4 bg-white text-ink/60 hover:border-navy/40 hover:text-navy"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}