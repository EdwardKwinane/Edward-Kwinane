import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Shared content-card foundation for the site, extracted from the approved
 * Hover Reveal Cards design (see `components/ui/cards.tsx`).
 *
 * - `SurfaceCard` is the neutral shell: the radius, hairline border and panel
 *   surface every content card sits on, in both themes.
 * - `interactive` adds the hover/focus treatment (lift, deeper border, shadow,
 *   `focus-ring`) for cards that are links. Non-interactive panels pass no
 *   prop and get no affordance that would imply they are clickable.
 * - `CardMedia` is the 16:9 image band with the deep-navy gradient overlay
 *   used on image-led cards. When `src` is absent it renders the plain
 *   navy-deep surface with the blueprint grid, leaving the visual content to
 *   `children` (used by the ProjectCard monogram pattern).
 *
 * Deliberately not a universal card: cards carry their own layout and content
 * hierarchy; only the shell and the media band are centralised.
 */
export const surfaceCardClass =
  "rounded-2xl border border-surface-pale3 bg-surface-alt";

export const interactiveSurfaceCardClass = cn(
  surfaceCardClass,
  "transition-[border-color,box-shadow,transform] duration-300 ease-out motion-reduce:transition-none",
  "hover:border-navy/25 hover:shadow-[0_16px_40px_rgba(13,13,91,0.12)]",
  "motion-safe:hover:-translate-y-1 focus-ring"
);

/** Small uppercase pill used for technologies and capability labels. */
export const cardChipClass =
  "rounded-full border border-surface-pale4 bg-surface-pale px-2.5 py-0.5 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65";

/** Icon tile used on capability, expertise and channel cards. */
export const cardIconChipClass =
  "flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white transition-colors duration-300 motion-reduce:transition-none group-hover:bg-accent-fill";

export interface SurfaceCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Render the child element (e.g. a `Link`) as the card root. */
  asChild?: boolean;
  /** Adds the hover/focus affordance. Use only on cards that navigate. */
  interactive?: boolean;
}

export function SurfaceCard({
  asChild = false,
  interactive = false,
  className,
  ...props
}: SurfaceCardProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        interactive ? interactiveSurfaceCardClass : surfaceCardClass,
        className
      )}
      {...props}
    />
  );
}

export interface CardMediaProps {
  /** Cover image URL (from the CMS). Omit to render the navy-deep placeholder surface. */
  src?: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

export function CardMedia({ src, alt, className, children }: CardMediaProps) {
  return (
    <div
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden bg-navy-deep",
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
        />
      ) : null}
      {/* Deep-navy gradient keeps any text on the band readable and ties the
          image treatment to the approved process cards. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy-deep/20 to-transparent"
      />
      {children}
    </div>
  );
}
