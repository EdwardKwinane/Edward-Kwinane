import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-slate-border bg-surface-alt px-4 text-base text-ink placeholder:text-ink/40 transition-all focus:border-navy focus:shadow-[0_0_0_3px_rgba(254,89,0,0.15)] focus:outline-none disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };