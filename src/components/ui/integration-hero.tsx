import * as React from "react";
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
 * second copy `aria-hidden`, so assistive technology announces the
 * technologies exactly once; translating the track by exactly one copy
 * width (−50%) is a seamless, jump-free loop.
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

function ToolTile({ tool, className }: { tool: Tool; className?: string }) {
  return (
    <li
      className={cn(
        "group flex w-24 shrink-0 select-none flex-col items-center gap-2.5 sm:w-28 lg:w-32 lg:gap-3",
        className
      )}
    >
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full border border-navy-light/40 bg-navy text-surface shadow-[0_14px_34px_rgba(13,13,91,0.28),inset_0_1px_0_rgba(255,255,255,0.22)] transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-[0_20px_44px_rgba(13,13,91,0.36),inset_0_1px_0_rgba(255,255,255,0.26),0_0_0_2px_rgba(254,89,0,0.55)] sm:h-20 sm:w-20 lg:h-24 lg:w-24"
      >
        {tool.path ? (
          <svg
            viewBox="0 0 24 24"
            /* Decorative: the visible name below is the accessible label. */
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
      <span className="font-technical text-[10px] font-semibold uppercase leading-tight tracking-tech text-ink/55 transition-colors duration-300 group-hover:text-navy sm:text-[11px]">
        {tool.name}
      </span>
    </li>
  );
}

/**
 * Each copy repeats the sequence three times so a single copy is wider than
 * the largest expected viewport; combined with the mirrored second copy and
 * the exact −50% translation, the track covers the viewport at every point
 * of the loop — including on wide monitors.
 */
const REPEAT = 3;

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
          /* Repeat instances exist only to give the marquee track enough
             width to cover wide viewports; reduced-motion mode hides them
             and shows a single, readable set. */
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
      <div className="integration-marquee__track" role="list" aria-label={label}>
        {[false, true].map((duplicate) => (
          <ul
            key={duplicate ? "duplicate" : "primary"}
            className="integration-marquee__copy"
            aria-hidden={duplicate || undefined}
          >
            {sequence.map(({ tool, key, repeat }) => (
              <ToolTile
                key={key}
                tool={tool}
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
  return (
    <Section
      aria-labelledby="technologies-heading"
      className={cn(
        "relative overflow-hidden border-y border-surface-pale-3/60 bg-surface-alt",
        className
      )}
      {...props}
    >
      {/* Dotted technical grid — decorative, fades out toward the edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgb(13 13 91 / 0.12) 1px, transparent 1.2px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 120% 90% at 50% 40%, black 35%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 120% 90% at 50% 40%, black 35%, transparent 78%)",
        }}
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
        </div>
      </Container>

      <div className="relative mt-10 space-y-5 sm:mt-12 sm:space-y-7 lg:mt-14 lg:space-y-9">
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
