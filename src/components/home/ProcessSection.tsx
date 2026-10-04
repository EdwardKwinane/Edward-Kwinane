import { useEffect, useRef } from "react";
import { Container, Section } from "@/components/ui/Container";
import { revealElements } from "@/lib/gsap";

const stages = [
  { index: "01", name: "DISCOVER", detail: "Understand the problem, users and constraints before anything else." },
  { index: "02", name: "ARCHITECT", detail: "Design the system boundaries and contracts before writing code." },
  { index: "03", name: "BUILD", detail: "Implement with AI where it creates leverage, from interface to infrastructure." },
  { index: "04", name: "VALIDATE", detail: "Measure against the outcome — retrieval quality, reliability, real usage." },
  { index: "05", name: "DEPLOY", detail: "Ship to production with clean infrastructure and observability." },
  { index: "06", name: "EVOLVE", detail: "Improve based on evidence, not guesswork." },
];

export function ProcessSection() {
  const scopeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    revealElements(".process-stage", scopeRef.current ?? document, { stagger: 0.1 });
  }, []);

  return (
    <Section ref={scopeRef} className="bg-surface-alt">
      <Container>
        <div className="max-w-2xl">
          <p className="eyebrow">Process</p>
          <h2 className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]">
            From idea to production
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink/65">
            A repeatable sequence that moves a concept into a deployed system without losing the thread.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {stages.map((stage) => (
            <li key={stage.index} className="process-stage relative rounded-2xl border border-surface-pale3 bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="font-heading text-4xl font-bold text-surface-pale4">{stage.index}</span>
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-technical text-[13px] font-bold uppercase tracking-tech text-navy">
                {stage.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{stage.detail}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}