import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { revealElements } from "@/lib/gsap";

const layers = [
  { name: "EXPERIENCE", chips: ["FRONTEND", "INTERFACE", "CONVERSATION"] },
  { name: "ORCHESTRATION", chips: ["API", "ROUTING", "CONTEXT"] },
  { name: "INTELLIGENCE", chips: ["AGENTS", "LLMs", "PROMPTS"] },
  { name: "KNOWLEDGE", chips: ["RAG", "MEMORY", "EMBEDDINGS"] },
  { name: "SYSTEMS", chips: ["TOOLS", "DATABASES", "EXTERNAL APIS", "INFRASTRUCTURE"] },
];

export function ArchitectureSection() {
  const scopeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    revealElements(".arch-section-layer", scopeRef.current ?? document, { stagger: 0.14 });
  }, []);

  return (
    <Section ref={scopeRef} className="bg-navy text-white">
      <Container>
        <div className="max-w-2xl">
          <p className="font-technical text-[13px] font-bold uppercase tracking-tech text-accent">
            Architecture
          </p>
          <h2 className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-white sm:text-[32px] sm:leading-[40px]">
            I design systems, not just interfaces.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Every product I build sits on a deliberate architecture — experience, orchestration,
            intelligence, knowledge and systems — so the intelligence layer stays clean and
            replaceable.
          </p>
        </div>

        <div className="mt-12">
          {layers.map((layer, i) => (
            <div key={layer.name} className="arch-section-layer">
              <div className="grid items-center gap-4 md:grid-cols-[240px_1fr]">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  <span className="font-technical text-[13px] font-bold uppercase tracking-tech text-white">
                    {layer.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {layer.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-technical text-[11px] font-semibold uppercase tracking-tech text-white/75"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              {i < layers.length - 1 && (
                <div className="ml-[5px] mt-4 mb-4 h-6 w-px bg-gradient-to-b from-accent to-white/20 md:ml-[7px]" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Button asChild variant="accent" size="lg">
            <Link to="/about">
              Explore my approach
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}