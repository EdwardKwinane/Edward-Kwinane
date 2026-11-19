import { useEffect, useRef } from "react";
import { Container, Section } from "@/components/ui/Container";
import { ProcessGrid } from "@/components/ui/process-grid";
import { processStages } from "@/data/process";
import { revealElements } from "@/lib/gsap";

/**
 * Process — the six-stage delivery method, presented as a card grid so each
 * stage reads as a deliberate step rather than a caption. Copy lives in
 * `src/data/process.ts` and is owner-approved verbatim.
 */
export function ProcessSection() {
  const scopeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    revealElements(".process-card", scopeRef.current ?? document, { stagger: 0.1 });
  }, []);

  return (
    <Section ref={scopeRef} className="bg-surface-alt" aria-labelledby="process-heading">
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
        <ProcessGrid stages={processStages} />
      </Container>
    </Section>
  );
}
