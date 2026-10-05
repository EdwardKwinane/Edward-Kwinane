import { cn } from "@/lib/utils";

export interface ArchitectureNodeProps {
  label: string;
  detail?: string;
  state?: "idle" | "active" | "accent";
  className?: string;
  compact?: boolean;
}

export function ArchitectureNode({
  label,
  detail,
  state = "idle",
  className,
  compact,
}: ArchitectureNodeProps) {
  return (
    <div
      className={cn(
        "flow-node flex flex-col items-center justify-center gap-0.5 rounded-lg border px-3 text-center transition-colors duration-300 sm:px-4",
        compact ? "py-2.5" : "py-3.5",
        state === "active" &&
          "border-accent bg-accent-fill text-white shadow-[0_8px_24px_rgba(199,67,0,0.35)]",
        state === "accent" &&
          "border-accent/30 bg-surface-pale3 text-navy",
        state === "idle" && "border-surface-pale4 bg-surface-pale text-navy",
        className
      )}
    >
      <span
        className={cn(
          "font-technical text-[11px] font-bold uppercase tracking-tech leading-none",
          state === "active" && "text-white"
        )}
      >
        {label}
      </span>
      {detail && (
        <span
          className={cn(
            "text-[11px] leading-tight",
            state === "active" ? "text-white/90" : "text-ink/55"
          )}
        >
          {detail}
        </span>
      )}
    </div>
  );
}