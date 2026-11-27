import * as React from "react";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  useMotionValue,
  type MotionValue,
} from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Activity,
  Cloud,
  Code2,
  Cpu,
  Database,
  FileCode,
  HardDrive,
  Link2,
  Layers,
  Mic,
  Search,
  Speaker,
  Terminal,
  Volume2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Container } from "./Container";
import { useSiteSettings } from "@/data/site";

/* ---------------------------------------------------------------- */
/* Icon set — AI / full-stack concept icons (lucide-react)           */
/* ---------------------------------------------------------------- */

const ICONS = [
  { label: "AI agent", icon: Bot },
  { label: "APIs", icon: Link2 },
  { label: "Database", icon: Database },
  { label: "Vector DB", icon: Cpu },
  { label: "Embeddings", icon: Layers },
  { label: "Retrieval", icon: Search },
  { label: "Memory", icon: HardDrive },
  { label: "Tools", icon: Wrench },
  { label: "TypeScript", icon: FileCode },
  { label: "Node.js", icon: Terminal },
  { label: "React", icon: Code2 },
  { label: "Cloud", icon: Cloud },
  { label: "WebRTC", icon: Mic },
  { label: "STT", icon: Volume2 },
  { label: "TTS", icon: Speaker },
  { label: "Observability", icon: Activity },
] as const;

/** Placement as % of the icon field — deterministic, spread, no overlap by construction. */
const POSITIONS = [
  { x: 10, y: 8, s: 1.0 },
  { x: 34, y: 4, s: 0.72 },
  { x: 58, y: 10, s: 1.15 },
  { x: 82, y: 6, s: 0.82 },
  { x: 20, y: 27, s: 1.2 },
  { x: 66, y: 25, s: 0.78 },
  { x: 90, y: 29, s: 0.95 },
  { x: 8, y: 46, s: 0.8 },
  { x: 46, y: 40, s: 1.05 },
  { x: 76, y: 50, s: 1.15 },
  { x: 28, y: 56, s: 0.9 },
  { x: 58, y: 60, s: 0.72 },
  { x: 12, y: 72, s: 1.1 },
  { x: 88, y: 70, s: 0.85 },
  { x: 40, y: 78, s: 1.0 },
  { x: 68, y: 82, s: 0.88 },
] as const;

const REPEL_RADIUS = 150;
const REPEL_STRENGTH = 58;

interface FloatingIconProps {
  icon: React.ElementType;
  label: string;
  cx: number;
  cy: number;
  scale: number;
  delay: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  animate: boolean;
}

function FloatingIcon({
  icon: Icon,
  label,
  cx,
  cy,
  scale,
  delay,
  pointerX,
  pointerY,
  animate,
}: FloatingIconProps) {
  const offsetXValue = useTransform([pointerX, pointerY], (latest) => {
    const [px, py] = latest as [number, number];
    if (px < -500) return 0;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy);
    if (dist >= REPEL_RADIUS || dist === 0) return 0;
    return (dx / dist) * (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
  });
  const offsetYValue = useTransform([pointerX, pointerY], (latest) => {
    const [px, py] = latest as [number, number];
    if (px < -500) return 0;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy);
    if (dist >= REPEL_RADIUS || dist === 0) return 0;
    return (dy / dist) * (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
  });
  const repelX = useSpring(offsetXValue, { stiffness: 240, damping: 20, mass: 0.6 });
  const repelY = useSpring(offsetYValue, { stiffness: 240, damping: 20, mass: 0.6 });

  return (
    <motion.div
      className="absolute"
      style={{ left: cx, top: cy }}
      initial={animate ? { opacity: 0, scale: 0.6, y: 12 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div style={animate ? { x: repelX, y: repelY } : undefined}>
        <motion.div
          animate={animate ? { y: [0, -8, 0] } : undefined}
          transition={{
            duration: 4.6 + (delay * 10) % 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay * 2,
          }}
        >
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-sm"
            style={{ transform: `scale(${scale})` }}
          >
            <Icon className="h-5 w-5 text-white" aria-hidden="true" strokeWidth={1.5} />
            <span className="sr-only">{label}</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- */
/* Hero section                                                       */
/* ---------------------------------------------------------------- */

const MOBILE_QUERY = "(max-width: 767px)";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

const mobileIcons = ICONS.slice(0, 8);

export interface FloatingIconsHeroSectionProps
  extends React.HTMLAttributes<HTMLElement> {}

/**
 * Floating icons hero for the homepage.
 *
 * - Deep-navy surface using only existing tokens; glass tiles, restraint over
 *   glow. All icons are decorative (`aria-hidden`) and non-focusable.
 * - One shared pointer tracker (`onPointerMove` on the section) feeds two
 *   MotionValues; each icon springs its own repulsion offset from them.
 * - Reduced motion disables the entrance, the idle float and the repulsion.
 * - Below the `md` breakpoint the field renders as a static, low-density row.
 * - Icon positions are a fixed % table measured against the field's content
 *   box — deterministic, no randomness, icons cannot overlap the text column.
 */
export const FloatingIconsHeroSection = React.forwardRef<
  HTMLElement,
  FloatingIconsHeroSectionProps
>(function FloatingIconsHeroSection({ className, ...rest }, forwardedRef) {
  const settings = useSiteSettings();
  const reduce = useReducedMotion() === true;
  const isMobile = useIsMobile();

  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  React.useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pointerX = useMotionValue(-1000);
  const pointerY = useMotionValue(-1000);

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const el = fieldRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      pointerX.set(e.clientX - rect.left);
      pointerY.set(e.clientY - rect.top);
    },
    [pointerX, pointerY]
  );

  const handlePointerLeave = React.useCallback(() => {
    pointerX.set(-1000);
    pointerY.set(-1000);
  }, [pointerX, pointerY]);

  const animate = !reduce && !isMobile && size.w > 0;
  return (
    <section
      ref={forwardedRef}
      className={cn(
        "relative overflow-hidden bg-navy-deep pt-32 pb-14 lg:pt-40 lg:pb-20",
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...rest}
    >
      {/* Fine blueprint grid, inversed for the navy surface */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Single restrained accent glow, top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 -top-48 h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(254, 89, 0, 0.09) 0%, transparent 65%)",
        }}
      />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="max-w-xl">
            <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-accent">
              AI IMPLEMENTATION SPECIALIST
            </p>

            {/* Availability */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-pill border border-accent/30 bg-accent/10 py-1.5 pl-2 pr-3">
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full bg-accent",
                    !reduce && "motion-safe:animate-ping"
                  )}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="font-technical text-[11px] font-semibold uppercase tracking-tech text-white/85">
                {settings.availabilityText}
              </span>
            </div>

            <h1 className="mt-6 font-heading text-[30px] font-bold leading-[38px] text-white sm:text-[34px] sm:leading-[42px] lg:text-[46px] lg:leading-[54px]">
              {settings.heroHeadline}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/70 lg:text-lg">
              {settings.heroSubheadline}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button asChild variant="accent" size="lg">
                <Link to="/contact">
                  Discuss an AI opportunity
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="white" size="lg">
                <Link to="/about">
                  Explore my professional profile
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {settings.heroTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-pill border border-white/10 bg-white/5 px-3 py-1 font-technical text-[10px] font-semibold uppercase tracking-tech text-white/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Icon field */}
          <div
            ref={fieldRef}
            className="relative h-52 sm:h-64 md:h-[440px] lg:h-[520px]"
          >
            {isMobile ? (
              <ul
                aria-hidden="true"
                className="flex h-full flex-wrap content-center items-center justify-center gap-2.5 overflow-hidden"
              >
                {mobileIcons.map(({ label, icon: Icon }) => (
                  <li
                    key={label}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.12)]"
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </li>
                ))}
              </ul>
            ) : (
              <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
                {size.w > 0 &&
                  POSITIONS.map((pos, i) => {
                    const { label, icon } = ICONS[i];
                    return (
                      <FloatingIcon
                        key={label}
                        icon={icon}
                        label={label}
                        cx={(pos.x / 100) * size.w}
                        cy={(pos.y / 100) * size.h}
                        scale={pos.s}
                        delay={i * 0.055}
                        pointerX={pointerX}
                        pointerY={pointerY}
                        animate={animate}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
});

export default FloatingIconsHeroSection;
