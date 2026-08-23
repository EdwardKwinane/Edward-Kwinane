import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { CapabilityCard } from "@/components/capabilities/CapabilityCard";
import { capabilities } from "@/data/capabilities";
import { revealElements } from "@/lib/gsap";

export default function Capabilities() {
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    revealElements(".capability-block", scopeRef.current ?? document, { stagger: 0.08 });
  }, []);

  return (
    <>
      <Seo
        title="Capabilities"
        description="What Edward Kwinane builds: AI voice agents, RAG systems, AI chatbots, AI agents and full-stack products designed around real-world problems."
        path="/capabilities"
      />
      <PageHero
        eyebrow="Capabilities"
        title="What I build"
        description="AI systems and full-stack products designed around real-world problems."
      />

      <div ref={scopeRef}>
        <Section className="pt-0 lg:pt-0">
          <Container className="space-y-14 sm:space-y-20 lg:space-y-32">
            {capabilities.map((capability, i) => (
              <div key={capability.id} className="capability-block">
                <CapabilityCard capability={capability} flip={i % 2 === 1} />
              </div>
            ))}
          </Container>
        </Section>

        <Section className="bg-navy pt-0 lg:pt-0">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-technical text-[13px] font-bold uppercase tracking-tech text-accent">
                Next step
              </p>
              <h2 className="mt-4 font-heading text-[28px] font-semibold leading-[36px] text-white sm:text-[32px] sm:leading-[40px]">
                Have a system in mind?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/70">
                Voice, knowledge, conversation, automation or a full product — let's discuss the
                architecture before we write a line of code.
              </p>
              <div className="mt-8">
                <Button asChild variant="accent" size="lg">
                  <Link to="/contact">
                    Let's discuss it
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Container>
        </Section>
      </div>
    </>
  );
}