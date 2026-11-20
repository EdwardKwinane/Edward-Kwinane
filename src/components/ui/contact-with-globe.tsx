import * as React from "react";
import {
  geoGraticule10,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import land110m from "world-atlas/land-110m.json";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { useSiteSettings } from "@/data/site";

/**
 * Contact-with-Globe — the supplied contact page layout, rebuilt on this
 * site's design system.
 *
 * Left column: the current availability status (the only verified contact
 * context the site publishes) plus a static vector globe.
 * Right column: `children`, which is the real `<ContactForm />` — this
 * component never renders its own inputs, so the `/api/contact` contract is
 * untouched.
 *
 * The globe is a static orthographic projection of the bundled 110m
 * land outline. It has no auto-rotation, no entrance/scroll effects and no
 * hover movement, and it renders fully synchronously at build time, so there
 * is no network to fail at runtime. If anything fails during path generation,
 * a plain outline illustration is shown instead.
 */

export interface ContactWithGlobeProps {
  /** The real contact form card (rendered in the right column). */
  children?: React.ReactNode;
  className?: string;
}

interface GlobeModel {
  sphere: string;
  graticule: string;
  land: string;
}

const GLOBE_WIDTH = 320;
const GLOBE_HEIGHT = 252;

function buildGlobe(): GlobeModel | null {
  try {
    if (!land110m.objects?.land) return null;

    const land = feature(land110m, land110m.objects.land) as unknown as GeoPermissibleObjects;
    const projection = geoOrthographic()
      .rotate([-17, -19])
      .fitExtent(
        [
          [4, 4],
          [GLOBE_WIDTH - 4, GLOBE_HEIGHT - 4],
        ],
        { type: "Sphere" },
      );
    const path = geoPath(projection);

    const sphere = path({ type: "Sphere" });
    const graticule = path(geoGraticule10());
    const landPath = path(land);

    if (!sphere || !graticule || !landPath) return null;
    return { sphere, graticule, land: landPath };
  } catch {
    return null;
  }
}

/** Static meridians + a sphere outline, used only if path building fails. */
function GlobeFallback() {
  const cx = GLOBE_WIDTH / 2;
  const cy = GLOBE_HEIGHT / 2;
  const r = Math.min(cx, cy) - 6;
  return (
    <svg
      viewBox={`0 0 ${GLOBE_WIDTH} ${GLOBE_HEIGHT}`}
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx={cx} cy={cy} r={r} className="fill-navy-light/40 stroke-accent-dark" strokeWidth={1.5} />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.38} className="fill-none stroke-white/25" />
      <ellipse cx={cx} cy={cy} rx={r * 0.38} ry={r} className="fill-none stroke-white/25" />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.8} className="fill-none stroke-white/15" />
    </svg>
  );
}

/** Static globe — no rotation, no transitions, no pointer interaction. */
function StaticGlobe() {
  const model = React.useMemo(buildGlobe, []);

  if (!model) {
    return (
      <div className="mx-auto flex w-full max-w-[340px] items-center justify-center sm:max-w-[420px]">
        <GlobeFallback />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[340px] sm:max-w-[420px]">
      <svg
        viewBox={`0 0 ${GLOBE_WIDTH} ${GLOBE_HEIGHT}`}
        className="h-auto w-full"
        aria-hidden="true"
        focusable="false"
      >
        <path d={model.sphere} className="fill-navy-light/40" />
        <path d={model.graticule} className="fill-none stroke-white/15" strokeWidth={0.6} />
        <path
          d={model.land}
          className="fill-white/70 stroke-white/40"
          strokeWidth={0.5}
          strokeLinejoin="round"
        />
        <path d={model.sphere} className="fill-transparent stroke-accent-dark" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

/**
 * Two-column contact layout. `children` is the real form card.
 *
 * @example
 * <ContactWithGlobe>
 *   <SurfaceCard>…<ContactForm /></SurfaceCard>
 * </ContactWithGlobe>
 */
export function ContactWithGlobe({ children, className }: ContactWithGlobeProps) {
  const settings = useSiteSettings();

  return (
    <div className={cn("grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16", className)}>
      {/* Left column — availability + globe. */}
      <SurfaceCard className="flex flex-col gap-6 p-6 sm:p-8">
        <span className="inline-flex w-max items-center gap-2 rounded-full border border-surface-pale4 bg-surface-pale px-3 py-1.5">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="whitespace-nowrap font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65">
            {settings.availabilityText}
          </span>
        </span>

        <figure className="flex flex-1 flex-col justify-center gap-3 overflow-hidden rounded-2xl border border-surface-pale3 bg-navy-deep px-4 pb-5 pt-6">
          <StaticGlobe />
          <figcaption className="text-center font-technical text-[9px] font-semibold uppercase tracking-tech text-white/60">
            Every project starts with a conversation
          </figcaption>
        </figure>
      </SurfaceCard>

      {/* Right column — the real form card. */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default ContactWithGlobe;
