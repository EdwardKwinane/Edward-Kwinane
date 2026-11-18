import { Container, Section } from "@/components/ui/Container";
import HoverRevealCards, { type CardItem } from "@/components/ui/cards";

const stages = [
  { index: "01", name: "DISCOVER", detail: "Understand the problem, users and constraints before anything else." },
  { index: "02", name: "ARCHITECT", detail: "Design the system boundaries and contracts before writing code." },
  { index: "03", name: "BUILD", detail: "Implement with AI where it creates leverage, from interface to infrastructure." },
  { index: "04", name: "VALIDATE", detail: "Measure against the outcome — retrieval quality, reliability, real usage." },
  { index: "05", name: "DEPLOY", detail: "Ship to production with clean infrastructure and observability." },
  { index: "06", name: "EVOLVE", detail: "Improve based on evidence, not guesswork." },
] as const;

/**
 * One verified Unsplash photograph per stage (all HTTP 200, landscape). Kept
 * in a cohesive moody register so the grid reads as a single collection.
 */
const stageImages: Record<(typeof stages)[number]["index"], string> = {
  "01": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
  "02": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
  "03": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
  "04": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
  "05": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80",
  "06": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80",
};

const stageCards: CardItem[] = stages.map((stage) => ({
  id: stage.index,
  subtitle: `Stage ${stage.index}`,
  title: stage.name,
  description: stage.detail,
  imageUrl: stageImages[stage.index],
}));

export function ProcessSection() {
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

      <Container className="mt-12">
        <HoverRevealCards items={stageCards} />
      </Container>
    </Section>
  );
}
