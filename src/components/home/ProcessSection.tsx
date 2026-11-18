import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Container, Section } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

const stages = [
  { index: "01", name: "DISCOVER", detail: "Understand the problem, users and constraints before anything else." },
  { index: "02", name: "ARCHITECT", detail: "Design the system boundaries and contracts before writing code." },
  { index: "03", name: "BUILD", detail: "Implement with AI where it creates leverage, from interface to infrastructure." },
  { index: "04", name: "VALIDATE", detail: "Measure against the outcome — retrieval quality, reliability, real usage." },
  { index: "05", name: "DEPLOY", detail: "Ship to production with clean infrastructure and observability." },
  { index: "06", name: "EVOLVE", detail: "Improve based on evidence, not guesswork." },
] as const;

type Stage = (typeof stages)[number];
type ScrollProgress = ReturnType<typeof useScroll>["scrollYProgress"];

const STAGE_COUNT = stages.length;

/**
 * Scroll distance each card gets before the next one lands, in viewport units.
 * The deck is pinned with CSS sticky; this only controls how long the reader
 * stays on each card, never the scroll itself.
 */
const SCROLL_PER_CARD_VH = 30;
/** Extra room after the last card so it can rest before the deck releases. */
const TAIL_VH = 90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface ProcessCardProps {
  stage: Stage;
  position: number;
  stacked?: boolean;
}

function ProcessCard({ stage, position, stacked = false }: ProcessCardProps) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl border border-surface-pale3 bg-surface",
        stacked
          ? "p-7 shadow-[0_18px_50px_-24px_rgba(13,13,91,0.28)] sm:p-8 lg:p-10"
          : "p-6"
      )}
    >
      {stacked ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-20 right-5 select-none font-heading text-[128px] font-bold leading-none tracking-tight text-navy/[0.06]"
        >
          {stage.index}
        </span>
      ) : null}

      <div className="relative flex items-center justify-between gap-4">
        <span className="font-technical text-[11px] font-bold uppercase tracking-tech text-accent-dark">
          Stage {stage.index}
        </span>
        <span className="relative z-10 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
      </div>

      <div className={cn("relative flex flex-1 flex-col justify-center", stacked ? "py-5" : "py-4")}>
        <h3
          className={cn(
            "font-heading font-semibold text-navy",
            stacked ? "text-3xl sm:text-4xl" : "text-2xl"
          )}
        >
          {stage.name}
        </h3>
        <p
          className={cn(
            "mt-3 leading-relaxed text-ink/65",
            stacked ? "max-w-lg text-base sm:text-lg" : "text-sm"
          )}
        >
          {stage.detail}
        </p>
      </div>

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-surface-pale3">
          <div
            className="h-px bg-accent"
            style={{ width: `${((position + 1) / STAGE_COUNT) * 100}%` }}
          />
        </div>
        <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/50">
          {stage.index} / {String(STAGE_COUNT).padStart(2, "0")}
        </span>
      </div>
    </article>
  );
}

interface StackCardProps {
  stage: Stage;
  position: number;
  active: ScrollProgress;
}

function StackCard({ stage, position, active }: StackCardProps) {
  /**
   * `enter` is 0 while the card waits below the deck and 1 once it has landed.
   * Card 0 starts at 1, so the first frame has a readable card rather than an
   * empty deck.
   */
  const enter = useTransform(active, (value) => {
    const raw = clamp(value - (position - 1), 0, 1);
    return 1 - Math.pow(1 - raw, 3);
  });

  /** How many cards have landed on top of this one. */
  const depth = useTransform(active, (value) =>
    clamp(value - position, 0, STAGE_COUNT - 1 - position)
  );

  /**
   * Cards are fully opaque. A card is revealed by rising into the deck from
   * below the viewport, rather than fading in, so the card behind never shows
   * through it mid-transition.
   */
  const y = useTransform(enter, (value) => `${(1 - value) * 100}%`);
  /**
   * Step the opacity instead of fading: a card is either fully opaque or fully
   * transparent. That prevents bleed-through and keeps every stage heading in
   * the accessibility tree for screen-reader users.
   */
  const opacity = useTransform(enter, (value) => (value > 0 ? 1 : 0));
  const scale = useTransform(depth, (value) => 1 - value * 0.022);
  const depthY = useTransform(depth, (value) => value * -11);
  /**
   * Only the card on top of the deck should accept pointer input, otherwise an
   * invisible waiting card would sit over the visible one and block selection.
   */
  const pointerEvents = useTransform(active, (value) =>
    Math.round(clamp(value, 0, STAGE_COUNT - 1)) === position ? "auto" : "none"
  );

  return (
    <motion.li
      className="absolute inset-0 will-change-transform"
      style={{
        y,
        opacity,
        pointerEvents,
        zIndex: position + 1,
      }}
    >
      <motion.div
        className="h-full will-change-transform"
        style={{
          scale,
          y: depthY,
          transformOrigin: "center top",
        }}
      >
        <ProcessCard stage={stage} position={position} stacked />
      </motion.div>
    </motion.li>
  );
}

function StaticStageList({ className }: { className?: string }) {
  return (
    <ol
      className={cn("grid gap-4", className)}
      aria-label="Process stages"
      data-testid="process-static"
    >
      {stages.map((stage, index) => (
        <li key={stage.index} className="h-full">
          <ProcessCard stage={stage} position={index} />
        </li>
      ))}
    </ol>
  );
}

function ProcessStack() {
  const stackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stackRef,
    offset: ["start start", "end end"],
  });

  /**
   * Map the deck's scroll progress onto a continuous card index. Finishing at
   * 90% gives the last card a short rest before the sticky deck releases, so
   * the section ends cleanly instead of cutting away mid-transition.
   */
  const active = useTransform(scrollYProgress, (value) =>
    Math.min(value / 0.9, 1) * (STAGE_COUNT - 1)
  );

  return (
    <div
      ref={stackRef}
      className="relative mt-8 hidden md:block"
      style={{ height: `calc(${STAGE_COUNT} * ${SCROLL_PER_CARD_VH}vh + ${TAIL_VH}vh)` }}
      data-testid="process-stack"
    >
      <div className="sticky top-24 flex h-[min(calc(100svh-7rem),760px)] items-center justify-center">
        <Container className="w-full">
          <div className="relative mx-auto w-full max-w-3xl">
            <ol className="relative h-[clamp(340px,48vh,460px)]" aria-label="Process stages">
              {stages.map((stage, index) => (
                <StackCard key={stage.index} stage={stage} position={index} active={active} />
              ))}
            </ol>
          </div>
        </Container>
      </div>
    </div>
  );
}

export function ProcessSection() {
  const reduceMotion = useReducedMotion();

  return (
    <Section className="bg-surface-alt" aria-labelledby="process-heading">
      <Container>
        <div className="max-w-2xl">
          <p className="eyebrow">Process</p>
          <h2
            id="process-heading"
            className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]"
          >
            From idea to production
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink/65">
            A repeatable sequence that moves a concept into a deployed system without losing the thread.
          </p>
        </div>
      </Container>

      {reduceMotion ? (
        <Container className="mt-12">
          <StaticStageList className="sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" />
        </Container>
      ) : (
        <>
          <Container className="mt-10 md:hidden">
            <StaticStageList />
          </Container>
          <ProcessStack />
        </>
      )}
    </Section>
  );
}
