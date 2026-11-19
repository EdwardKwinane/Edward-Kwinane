import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dock — an Apple-dock-style magnifying row of navigation links.
 *
 * The reference arrives as a bottom-pinned application launcher. Here it is
 * adapted to a top navigation bar: the pointer-tracking magnification, spring
 * smoothing and floating labels are kept, but the items are real React Router
 * `NavLink`s in a `<nav>`, nothing is pinned to the bottom of the viewport,
 * and the label chips are configurable per placement (the navbar opens them
 * above the dock, where there is room; a bottom dock can use `"top"` too).
 *
 * Implementation notes:
 * - Pointer coordinates use `clientX` and `getBoundingClientRect()`, so both
 *   are in the same (viewport) coordinate space even when the page is scrolled.
 * - Only the icon glyph scales; the link's hit box stays a fixed square. That
 *   keeps keyboard targets stable and stops neighbour items from reflowing
 *   while the pointer moves across the dock.
 * - Magnification and label motion are disabled when the user asks for reduced
 *   motion. Focus still gets the visible ring, the active surface and the label.
 */

export type DockLabelPlacement = "top" | "bottom";

export interface DockItem {
  /** Router destination (or an absolute URL when `external` is set). */
  to: string;
  /** Human label used for the floating chip and the link's accessible name. */
  label: string;
  /** lucide-react icon rendered inside the link. */
  icon: LucideIcon;
  /** Match the route exactly — needed for `/` so it is not active everywhere. */
  end?: boolean;
  /** Render a plain anchor that opens in a new tab, preserving native behaviour. */
  external?: boolean;
}

export interface DockProps {
  items: DockItem[];
  /** Accessible name for the enclosing `<nav>`. */
  label?: string;
  /** Scale of the hovered/focused icon. */
  magnification?: number;
  /** Half-width of the pointer falloff, in pixels. */
  distance?: number;
  /** Fixed square size of each link's hit area, in pixels. */
  size?: number;
  /** Spring used for both pointer magnification and focus boost. */
  spring?: SpringOptions;
  /** Where the floating label appears relative to the icon. */
  labelPlacement?: DockLabelPlacement;
  className?: string;
}

const DEFAULT_SPRING: SpringOptions = { stiffness: 320, damping: 26, mass: 0.6 };
const LABEL_SPRING_MS = { duration: 0.16, ease: "easeOut" as const };

interface DockEntryProps {
  item: DockItem;
  mouseX: MotionValue<number>;
  magnification: number;
  distance: number;
  size: number;
  spring: SpringOptions;
  labelPlacement: DockLabelPlacement;
  reduceMotion: boolean;
}

function DockEntry({
  item,
  mouseX,
  magnification,
  distance,
  size,
  spring,
  labelPlacement,
  reduceMotion,
}: DockEntryProps) {
  const itemRef = React.useRef<HTMLLIElement>(null);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  // Distance from the pointer to this item's centre, in viewport coordinates.
  const distanceFromPointer = useTransform(mouseX, (value) => {
    const bounds = itemRef.current?.getBoundingClientRect();
    if (!bounds || !Number.isFinite(value)) return distance;
    return value - (bounds.left + bounds.width / 2);
  });

  const pointerTarget = useTransform(
    distanceFromPointer,
    [-distance, 0, distance],
    [1, magnification, 1]
  );
  const pointerScale = useSpring(pointerTarget, spring);

  // Keyboard focus gets the same magnification as hover, through a second
  // spring so the two inputs combine without fighting each other.
  const focusTarget = useMotionValue(1);
  const focusScale = useSpring(focusTarget, spring);
  const scale = useTransform([pointerScale, focusScale], (values) => {
    const [pointer, focus] = values as [number, number];
    return Math.max(pointer, focus);
  });

  React.useEffect(() => {
    focusTarget.set(focused && !reduceMotion ? magnification : 1);
  }, [focused, focusTarget, magnification, reduceMotion]);

  const labelVisible = hovered || focused;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative grid place-items-center rounded-full transition-colors duration-200 focus-ring motion-reduce:transition-none",
      isActive
        ? "bg-primary text-white shadow-[0_4px_14px_rgba(13,13,91,0.24)]"
        : "text-ink/70 hover:bg-surface-alt hover:text-navy focus-visible:bg-surface-alt"
    );

  const icon = (
    <motion.span
      aria-hidden="true"
      className="grid place-items-center"
      style={reduceMotion ? undefined : { scale }}
    >
      <item.icon className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden="true" />
    </motion.span>
  );

  const linkProps = {
    "aria-label": item.label,
    style: { width: size, height: size },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  return (
    <li
      ref={itemRef}
      className="relative flex items-center justify-center"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {item.external ? (
        <a
          href={item.to}
          target="_blank"
          rel="noreferrer"
          className={linkClass({ isActive: false })}
          {...linkProps}
        >
          {icon}
        </a>
      ) : (
        <NavLink to={item.to} end={item.end} className={linkClass} {...linkProps}>
          {icon}
        </NavLink>
      )}

      <AnimatePresence>
        {labelVisible && (
          <motion.span
            key="label"
            aria-hidden="true"
            initial={{ opacity: 0, x: "-50%", y: labelPlacement === "top" ? 4 : -4 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: labelPlacement === "top" ? 4 : -4 }}
            transition={reduceMotion ? { duration: 0 } : LABEL_SPRING_MS}
            className={cn(
              "pointer-events-none absolute left-1/2 z-20 whitespace-nowrap rounded-pill border border-surface-pale3 bg-surface-alt px-2.5 py-1.5",
              "font-technical text-[9px] font-bold uppercase tracking-tech leading-none text-navy",
              "shadow-[0_8px_20px_rgba(8,8,60,0.28)]",
              labelPlacement === "top" ? "bottom-full mb-2" : "top-full mt-2"
            )}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Dock({
  items,
  label = "Primary",
  magnification = 1.45,
  distance = 110,
  size = 40,
  spring = DEFAULT_SPRING,
  labelPlacement = "top",
  className,
}: DockProps) {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <nav aria-label={label} className={cn("flex items-center", className)}>
      <ul
        role="list"
        onPointerMove={(event) => mouseX.set(event.clientX)}
        onPointerLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
        className="flex items-center gap-1 rounded-full border border-surface-pale3/80 bg-surface-pale/70 p-1"
      >
        {items.map((item) => (
          <DockEntry
            key={item.to}
            item={item}
            mouseX={mouseX}
            magnification={magnification}
            distance={distance}
            size={size}
            spring={spring}
            labelPlacement={labelPlacement}
            reduceMotion={reduceMotion}
          />
        ))}
      </ul>
    </nav>
  );
}

export default Dock;
