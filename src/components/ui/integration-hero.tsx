import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Section, Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import {
  integrationRowOne,
  integrationRowTwo,
  type Tool,
} from "@/data/tool-stack";

/**
 * IntegrationHero — the “Technologies & Tools” showcase.
 *
 * Two edge-to-edge marquee tracks of circular brand tiles, scrolling in
 * opposite directions. The mechanics live in `src/index.css`
 * (`integration-marquee-*`), driven by pure CSS keyframes: no JS animation
 * loops, no layout reads per frame. Each track is rendered twice with the
 * second copy `aria-hidden`, so assistive technology sees the technologies
 * once; translating the track by exactly one copy width (−50%) is a seamless,
 * jump-free loop.
 *
 * Motion can be stopped three ways:
 *  - the Pause/Play button (React state, `data-paused` on the group),
 *  - hovering a row (pointer users, unchanged),
 *  - focusing the group (`:focus-within`, keyboard users).
 *
 * `prefers-reduced-motion: reduce` disables the animation entirely and
 * renders a static, wrapped, centred arrangement instead.
 *
 * Every tile is non-interactive and decorative in the link sense: the
 * visible name under the glyph is the accessible label, the inline SVG
 * brand marks are `aria-hidden`. Tiles never imply partnerships or
 * certifications — each entry in `src/data/tool-stack.ts` carries a
 * `source` proving it is used in this project.
 */

const REPEAT = 3;

/** Tracks the OS reduced-motion preference so the control can explain itself. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function ToolTile({
  tool,
  className,
  ariaHidden,
}: {
  tool: Tool;
  className?: string;
  /** Repeat instances exist only to give the track width; hide them from AT. */
  ariaHidden?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex w-24 shrink-0 select-none flex-col items-center gap-2.5 sm:w-28 lg:w-32 lg:gap-3",
        className
      )}
      aria-hidden={ariaHidden || undefined}
    >
      {/* The visible name below is the accessible label: the whole disc is
          decorative, including the WebRTC text fallback. */}
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full border border-navy-light/40 bg-navy text-surface shadow-[0_14px_34px_rgba(13,13,91,0.28),inset_0_1px_0_rgba(255,255,255,0.22)] sm:h-20 sm:w-20 lg:h-24 lg:w-24"
      >
        {tool.path ? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
            fill="currentColor"
          >
            <path d={tool.path} />
          </svg>
        ) : (
          <span className="font-technical text-[9px] font-bold uppercase leading-none tracking-tech text-surface sm:text-[10px] lg:text-[11px]">
            {tool.fallback}
          </span>
        )}
      </span>
      <span
        data-testid="tech-label"
        className="font-technical text-[10px] font-semibold uppercase leading-tight tracking-tech text-ink/70 sm:text-[11px]"
      >
        {tool.name}
      </span>
    </li>
  );
}

function ToolRow({
  tools,
  direction,
  label,
}: {
  tools: Tool[];
  direction: "ltr" | "rtl";
  label: string;
}) {
  const sequence = React.useMemo(
    () =>
      Array.from({ length: REPEAT }, (_, repeatIndex) =>
        tools.map((tool) => ({
          tool,
          key: `${tool.id}-${repeatIndex}`,
          /* Only the first pass is the real list; the rest exist to widen the
             track and are hidden from assistive technology (CSS hides them in
             reduced-motion mode as well). */
          repeat: repeatIndex > 0,
        }))
      ).flat(),
    [tools]
  );

  return (
    <div
      className={cn(
        "integration-marquee",
        direction === "rtl" && "integration-marquee--reverse"
      )}
    >
      <div className="integration-marquee__track">
        {[false, true].map((duplicate) => (
          <ul
            key={duplicate ? "duplicate" : "primary"}
            data-testid="tech-copy"
            className="integration-marquee__copy"
            aria-label={duplicate ? undefined : label}
            aria-hidden={duplicate || undefined}
          >
            {sequence.map(({ tool, key, repeat }) => (
              <ToolTile
                key={key}
                tool={tool}
                ariaHidden={repeat}
                className={repeat ? "integration-tile--repeat" : undefined}
              />
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function IntegrationHero({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const [paused, setPaused] = React.useState(false);
  const [ignoreHover, setIgnoreHover] = React.useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const isPaused = paused || reducedMotion;

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    /* An explicit Play wins over a pointer that is already resting on a row.
       The flag clears as soon as the pointer leaves or re-enters the group,
       so ordinary hover-to-pause keeps working. */
    if (!next) setIgnoreHover(true);
  };

  return (
    <Section
      aria-labelledby="technologies-heading"
      className={cn(
        "relative overflow-hidden border-y border-surface-pale-3/60 bg-surface-alt",
        className
      )}
      {...props}
    >
      {/* Dotted technical grid — decorative, theme-aware, fades toward the edges */}
      <div
        aria-hidden="true"
        className="integration-grid pointer-events-none absolute inset-0"
      />

      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Technologies &amp; Tools</p>
          <h2
            id="technologies-heading"
            className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]"
          >
            The stack I build with
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/65">
            A modern, typed, CMS-driven stack — chosen so the products I ship stay fast to
            build and easy to maintain long after launch.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              data-testid="tech-pause"
              onClick={togglePause}
              aria-pressed={isPaused}
              aria-label={
                reducedMotion
                  ? "Motion off — reduced motion is enabled in your system settings"
                  : paused
                    ? "Play technology marquee"
                    : "Pause technology marquee"
              }
              disabled={reducedMotion}
              className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-pill border border-navy/15 bg-surface-alt px-4 text-[13px] font-semibold text-navy transition-colors hover:border-navy/35 hover:bg-surface-pale disabled:cursor-not-allowed disabled:border-navy/10 disabled:text-ink/70"
            >
              {paused || reducedMotion ? (
                <Play aria-hidden="true" focusable="false" className="h-4 w-4" />
              ) : (
                <Pause aria-hidden="true" focusable="false" className="h-4 w-4" />
              )}
              <span>{reducedMotion ? "Motion off" : paused ? "Play" : "Pause"}</span>
            </button>
          </div>
        </div>
      </Container>

      <div
        data-testid="tech-marquee-group"
        data-paused={paused ? "true" : "false"}
        data-ignore-hover={ignoreHover ? "true" : "false"}
        role="group"
        tabIndex={0}
        aria-label="Technology marquee"
        aria-describedby="technologies-motion-hint"
        onPointerEnter={() => setIgnoreHover(false)}
        onPointerLeave={() => setIgnoreHover(false)}
        className="integration-marquee-group relative mt-8 space-y-5 sm:mt-10 sm:space-y-7 lg:mt-10 lg:space-y-9"
      >
        <p id="technologies-motion-hint" className="sr-only">
          This section scrolls automatically. Focusing here pauses it; the pause button
          above stops and restarts it.
        </p>
        <ToolRow
          tools={integrationRowOne}
          direction="ltr"
          label="Interface, language and runtime technologies"
        />
        <ToolRow
          tools={integrationRowTwo}
          direction="rtl"
          label="Content, motion, delivery and real-time technologies"
        />
      </div>
    </Section>
  );
}

export default IntegrationHero;
