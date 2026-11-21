import * as React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Cloud,
  Cpu,
  Database,
  Layers,
  Network,
  Terminal,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Container } from "./Container";
import { useSiteSettings } from "@/data/site";

/* ---------------------------------------------------------------- */
/* Decorative icon set                                                */
/* ---------------------------------------------------------------- */

/**
 * Generic systems glyphs — deliberately *not* brand marks or a technology
 * inventory (that role belongs to the Tools marquee). They read as abstract
 * "building blocks" and stay purely decorative.
 *
 * The first entry is the composition's core; the rest orbit it on desktop and
 * form the compact row on tablet/mobile.
 */
const DECORATIVE_ICONS = [
  { key: "core", icon: Cpu },
  { key: "modules", icon: Boxes },
  { key: "layers", icon: Layers },
  { key: "network", icon: Network },
  { key: "data", icon: Database },
  { key: "cloud", icon: Cloud },
  { key: "workflow", icon: Workflow },
  { key: "activity", icon: Activity },
  { key: "terminal", icon: Terminal },
] as const;

/** Radius (in % of the square field) the eight orbit nodes sit on. */
const ORBIT_RADIUS = 34;

/** Eight evenly spaced nodes at 45° intervals, starting at 12 o'clock. */
const ORBIT_NODES = Array.from({ length: 8 }, (_, index) => {
  const angle = ((-90 + index * 45) * Math.PI) / 180;
  return {
    key: DECORATIVE_ICONS[index + 1].key,
    icon: DECORATIVE_ICONS[index + 1].icon,
    x: 50 + ORBIT_RADIUS * Math.cos(angle),
    y: 50 + ORBIT_RADIUS * Math.sin(angle),
  };
});

/** Shared glass treatment for every tile, at any breakpoint. */
const TILE_BASE =
  "items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] text-white/85 shadow-[0_12px_36px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-sm";

/* ---------------------------------------------------------------- */
/* Hero section                                                       */
/* ---------------------------------------------------------------- */

export interface FloatingIconsHeroSectionProps
  extends React.HTMLAttributes<HTMLElement> {}

/**
 * Homepage hero.
 *
 * Deliberately static: nothing moves on entrance, on scroll, on hover or on
 * pointer movement, and no animation runs under any preference. The visual
 * hierarchy (badge → heading → description → CTAs → tags → icon composition)
 * carries the page on its own.
 *
 * The icon field is a fixed, symmetric composition: a core tile with eight
 * nodes on a 45° orbit at desktop widths, and the same glyphs as a compact
 * single row on tablet and mobile. Everything is laid out in CSS — no
 * measurement, no client-side breakpoint switching and no layout shift.
 * All glyphs are decorative: `aria-hidden`, non-focusable and unlabelled.
 */
export const FloatingIconsHeroSection = React.forwardRef<
  HTMLElement,
  FloatingIconsHeroSectionProps
>(function FloatingIconsHeroSection({ className, ...rest }, forwardedRef) {
  const settings = useSiteSettings();

  return (
    <section
      ref={forwardedRef}
      aria-labelledby="hero-heading"
      className={cn(
        "relative overflow-hidden bg-navy-deep pt-32 pb-16 lg:pt-36 lg:pb-20",
        className
      )}
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
        <div className="grid items-center gap-8 xl:grid-cols-2 xl:gap-16">
          <div className="max-w-xl">
            {/* Availability — the navbar shows this from `2xl` up, so the
                hero badge is hidden there to avoid showing it twice. */}
            <div
              data-testid="hero-availability"
              className="inline-flex items-center gap-2 rounded-pill border border-accent/30 bg-accent/10 py-1.5 pl-2 pr-3 2xl:hidden"
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              <span className="font-technical text-[11px] font-semibold uppercase tracking-tech text-white/85">
                {settings.availabilityText}
              </span>
            </div>

            <h1
              id="hero-heading"
              className="mt-6 font-heading text-[30px] font-bold leading-[38px] text-white sm:text-[34px] sm:leading-[42px] lg:text-[46px] lg:leading-[54px]"
            >
              {settings.heroHeadline}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/70 lg:text-lg">
              {settings.heroSubheadline}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button
                asChild
                variant="accent"
                size="lg"
                className="transition-none duration-0 hover:!translate-y-0"
              >
                <Link to="/portfolio">
                  View my portfolio
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="white"
                size="lg"
                className="transition-none duration-0 hover:!translate-y-0"
              >
                <Link to="/contact">
                  Let's build something
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

          {/* Icon composition */}
          <div
            data-testid="hero-icon-field"
            aria-hidden="true"
            className="w-full max-w-xl xl:max-w-none xl:justify-self-end"
          >
            {/* Desktop / large: core + orbit */}
            <div className="relative mx-auto hidden aspect-square w-full max-w-[440px] xl:block">
              {/* Orbit guide, through the node centres */}
              <div className="absolute inset-[16%] rounded-full border border-dashed border-white/10" />
              {/* Inner guide around the core */}
              <div className="absolute inset-[33%] rounded-full border border-white/[0.06]" />
              {/* Restrained glow behind the core */}
              <div
                className="absolute inset-[27%] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(254, 89, 0, 0.10) 0%, transparent 70%)",
                }}
              />

              {/* Core */}
              <div
                data-testid="hero-icon-tile"
                className={cn(
                  "absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2",
                  "rounded-xl border border-accent/35 bg-accent/[0.14] text-white",
                  "shadow-[0_16px_44px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm"
                )}
              >
                <Cpu className="h-7 w-7" strokeWidth={1.5} focusable="false" />
              </div>

              {/* Orbit nodes */}
              {ORBIT_NODES.map(({ key, icon: Icon, x, y }) => (
                <div
                  key={key}
                  data-testid="hero-icon-tile"
                  className={cn(
                    "absolute z-10 flex h-13 w-13 -translate-x-1/2 -translate-y-1/2",
                    TILE_BASE
                  )}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.5} focusable="false" />
                </div>
              ))}
            </div>

            {/* Tablet / mobile: compact single row */}
            <ul className="flex min-h-[104px] items-center justify-center gap-2.5 md:min-h-[128px] md:gap-4 xl:hidden">
              {DECORATIVE_ICONS.slice(1).map(({ key, icon: Icon }, index) => (
                <li
                  key={key}
                  data-testid="hero-icon-tile"
                  className={cn(
                    "flex h-11 w-11 shrink-0 md:h-13 md:w-13",
                    TILE_BASE,
                    index >= 6 && "hidden md:flex"
                  )}
                >
                  <Icon
                    className="h-5 w-5 md:h-6 md:w-6"
                    strokeWidth={1.5}
                    focusable="false"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
});

export default FloatingIconsHeroSection;
