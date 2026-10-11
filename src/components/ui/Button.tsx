import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold font-heading transition-all duration-200 focus-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary-hover shadow-[0_0_0_rgba(13,13,91,0)] hover:shadow-[0_8px_24px_rgba(13,13,91,0.18)] hover:-translate-y-0.5",
        accent:
          "bg-accent-fill text-white hover:bg-accent-dark shadow-[0_0_0_rgba(254,89,0,0)] hover:shadow-[0_8px_24px_rgba(199,67,0,0.35)] hover:-translate-y-0.5",
        outline:
          "border border-navy/20 bg-surface-alt text-navy hover:border-navy/50 hover:bg-surface-pale",
        ghost: "text-navy hover:bg-surface-pale",
        link: "text-navy underline-offset-4 hover:underline",
        white: "bg-surface-alt text-navy hover:bg-surface-pale hover:-translate-y-0.5",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6",
        lg: "h-13 px-5 text-[15px] sm:px-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };