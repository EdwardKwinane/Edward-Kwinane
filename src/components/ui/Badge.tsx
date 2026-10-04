import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-technical text-[11px] font-semibold uppercase tracking-tech",
  {
    variants: {
      variant: {
        navy: "bg-primary text-white",
        orange: "bg-accent/10 text-accent-dark border border-accent/25",
        pale: "bg-surface-pale text-navy border border-surface-pale4",
        outline: "border border-navy/20 text-navy",
        status: "bg-surface-alt text-navy border border-surface-pale4",
      },
    },
    defaultVariants: {
      variant: "pale",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };