import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("container-site", className)} {...props} />;
}

const Section = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return <section ref={ref} className={cn("py-16 lg:py-24", className)} {...props} />;
  }
);
Section.displayName = "Section";

export { Section };