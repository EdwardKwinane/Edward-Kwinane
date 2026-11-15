import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { CapabilityCard } from "@/components/capabilities/CapabilityCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCapabilities } from "@/data/capabilities";
import type { Capability } from "@/data/technologies";
import { revealElements } from "@/lib/gsap";

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; capabilities: Capability[] };

export default function Capabilities() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchCapabilities().then((result) => {
      if (cancelled) return;
      if (result.status === "success") setPhase({ kind: "ready", capabilities: result.data });
      else setPhase({ kind: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => setAttempt((a) => a + 1);

  const capabilities = phase.kind === "ready" ? phase.capabilities : [];

  useEffect(() => {
    if (capabilities.length) {
      revealElements(".capability-block", scopeRef.current ?? document, { stagger: 0.08 });
    }
  }, [capabilities]);

  return (
    <>
      <Seo
        title="Capabilities"
        description="What Edward Kwinane builds: AI voice agents, RAG systems, AI chatbots, AI agents and full-stack products designed around real-world problems."
        path="/capabilities"
        noindex={phase.kind !== "ready"}
      />
      <PageHero
        eyebrow="Capabilities"
        title="What I build"
        description="AI systems and full-stack products designed around real-world problems."
      />

      <div ref={scopeRef}>
        <Section className="pt-0 lg:pt-0">
          <Container className="space-y-14 sm:space-y-20 lg:space-y-32">
            {phase.kind === "loading" && (
              <LoadingState label="Loading capabilities…" className="border-0 bg-transparent py-8" />
            )}

            {phase.kind === "error" && <ErrorState onRetry={retry} />}

            {phase.kind === "ready" && capabilities.length === 0 && (
              <EmptyState
                title="Capabilities coming soon"
                description="There are no published capabilities right now. Check back soon."
              />
            )}

            {phase.kind === "ready" &&
              capabilities.map((capability, i) => (
                <div key={capability.id} className="capability-block">
                  <CapabilityCard capability={capability} flip={i % 2 === 1} />
                </div>
              ))}
          </Container>
        </Section>

        <Section className="bg-primary pt-0 lg:pt-0">
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
