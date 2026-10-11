import * as React from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface LogoMarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The content to scroll. Pass it **once** — this component renders its children
   * twice internally to make the loop seamless.
   */
  children: React.ReactNode;
  /** Seconds for one full pass of the track at normal speed. */
  duration?: number;
  /** Divisor applied to the speed while hovered. `3` means "three times slower". */
  hoverSlowdown?: number;
  /**
   * Soften the hard clip at each edge so logos are not sliced mid-glyph. The
   * mask fades to transparent, so it needs no knowledge of the section
   * background and is correct in both themes.
   */
  fade?: boolean;
}

/**
 * An infinite, seamless horizontal marquee.
 *
 * The track holds two identical copies of `children`. The first is real content;
 * the second is `aria-hidden` so assistive technology announces each item once
 * rather than twice. Because the trailing padding of a copy equals the gap
 * between its items, translating by exactly one copy width is invisible — there
 * is no seam and no jump.
 *
 * The position is integrated from the frame delta rather than driven by a
 * repeating tween, so changing speed on hover never restarts or re-seeks the
 * animation: the loop just continues from wherever it is. `useAnimationFrame`
 * tears its own frame loop down on unmount.
 *
 * Measurement uses a `ResizeObserver` on a single copy. Until the first
 * measurement lands nothing is translated, so the row is simply laid out and
 * visible — no flash, no `NaN` transform, no reflow on load.
 */
export function LogoMarquee({
  children,
  duration = 45,
  hoverSlowdown = 3,
  fade = true,
  className,
  onPointerEnter,
  onPointerLeave,
  ...props
}: LogoMarqueeProps) {
  const itemRef = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  /* Mutable loop state, kept in refs so the frame callback can never close over
   * stale values. */
  const progress = React.useRef(0);
  const width = React.useRef(0);
  const slowed = React.useRef(false);
  const durationRef = React.useRef(duration);
  const slowdownRef = React.useRef(hoverSlowdown);
  const reduceMotion = useReducedMotion();
  const reduceMotionRef = React.useRef(reduceMotion);

  durationRef.current = duration;
  slowdownRef.current = hoverSlowdown;
  reduceMotionRef.current = Boolean(reduceMotion);

  /* Re-measure whenever the row resizes — a webfont landing after first layout
   * changes the width, and a stale width would break the seam. */
  React.useEffect(() => {
    const element = itemRef.current;
    if (!element) return;

    const measure = () => {
      const next = element.getBoundingClientRect().width;
      width.current = next;
      /* Restart from a known offset so the row never sits mid-seam after a
       * resize. */
      progress.current = 0;
      x.set(0);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
    /* Deliberately not keyed on `children`: the observer already fires on any
       width change, and re-running this on every parent render would reset the
       scroll position for no reason. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x]);

  React.useEffect(() => {
    slowed.current = false;
  }, [reduceMotion]);

  useAnimationFrame((_time, delta) => {
    if (reduceMotionRef.current) return;
    const itemWidth = width.current;
    /* Not measured yet — hold at the start of the track. */
    if (!itemWidth) return;

    const perMs = 1 / (durationRef.current * 1000);
    const factor = slowed.current ? 1 / slowdownRef.current : 1;
    progress.current = (progress.current + delta * perMs * factor) % 1;
    x.set(-progress.current * itemWidth);
  });

  const handleEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    slowed.current = true;
    onPointerEnter?.(event);
  };

  const handleLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    slowed.current = false;
    onPointerLeave?.(event);
  };

  /* Reduced motion: a plain, wrapped, fully readable row. The gaps mirror the
   * scrolling row so the two presentations read as the same list. */
  if (reduceMotion) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-12",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  const rowClass = "flex shrink-0 items-center gap-x-8 pr-8 sm:gap-x-12 sm:pr-12";

  const fadeMask: React.CSSProperties | undefined = fade
    ? {
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }
    : undefined;

  return (
    <div
      className={cn("w-full overflow-hidden", className)}
      style={fadeMask}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      {...props}
    >
      <motion.div className="flex w-max will-change-transform" style={{ x }}>
        <div ref={itemRef} className={rowClass}>
          {children}
        </div>
        <div className={rowClass} aria-hidden="true">
          {children}
        </div>
      </motion.div>
    </div>
  );
}