import * as React from "react";
import {
  geoGraticule10,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import land110m from "world-atlas/land-110m.json";
import { Mail, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard, cardIconChipClass } from "@/components/ui/SurfaceCard";
import { useSiteSettings } from "@/data/site";

/**
 * Contact-with-Globe — the supplied contact page layout, rebuilt on this
 * site's design system.
 *
 * Left column: direct context on how engagements start (project types,
 * response expectations, the fact that email is not public yet) plus a
 * static vector globe.
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

const contactChannels = [
  {
    icon: Zap,
    title: "Project types",
    description:
      "Voice agents, RAG systems, AI chatbots, AI agents, full-stack products and automation.",
  },
  {
    icon: MessageSquare,
    title: "Response time",
    description: "Messages are typically reviewed within a couple of business days.",
  },
  {
    icon: Mail,
    title: "Prefer email?",
    description: "There is no public email address yet — use the form to get in touch.",
  },
];

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
      <div className="mx-auto flex w-full max-w-[340px] items-center justify-center">
        <GlobeFallback />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[340px]">
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
      {/* Left column — context + globe. */}
      <SurfaceCard className="flex flex-col gap-8 p-6 sm:p-8">
        <div>
          <p className="font-technical text-[10px] font-bold uppercase tracking-tech text-accent-dark">
            Get in touch
          </p>
          <h2 className="mt-2 font-heading text-xl font-semibold text-navy lg:text-2xl">
            How this usually starts
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            The form is the fastest route — it lands straight in Edward&apos;s inbox, not a ticket
            queue. A short brief is all it takes to scope the first conversation.
          </p>
        </div>

        <ul className="flex flex-col gap-5">
          {contactChannels.map((channel) => {
            const Icon = channel.icon;
            return (
              <li key={channel.title} className="flex items-start gap-4">
                <span className={cn(cardIconChipClass, "h-11 w-11 shrink-0")}>
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-heading text-sm font-semibold text-navy">
                    {channel.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink/65">
                    {channel.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex flex-col gap-4 border-t border-surface-pale3 pt-6">
          <span className="inline-flex w-max items-center gap-2 rounded-full border border-surface-pale4 bg-surface-pale px-3 py-1.5">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="whitespace-nowrap font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65">
              {settings.availabilityText}
            </span>
          </span>

          <figure className="overflow-hidden rounded-2xl border border-surface-pale3 bg-navy-deep px-4 pb-5 pt-6">
            <StaticGlobe />
            <figcaption className="mt-1 text-center font-technical text-[9px] font-semibold uppercase tracking-tech text-white/60">
              Every project starts with a conversation
            </figcaption>
          </figure>
        </div>
      </SurfaceCard>

      {/* Right column — the real form card. */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default ContactWithGlobe;
