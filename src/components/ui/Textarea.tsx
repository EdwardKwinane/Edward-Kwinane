import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-slate-border bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 transition-all focus:border-navy focus:shadow-[0_0_0_3px_rgba(254,89,0,0.15)] focus:outline-none disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };