import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mic, Database, MessageSquare, Layers } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchCapabilityPreview,
  type CapabilityPreviewItem,
} from "@/data/capabilities";
import { SurfaceCard, cardChipClass, cardIconChipClass } from "@/components/ui/SurfaceCard";
import { revealElements } from "@/lib/gsap";

const icons = [Mic, Database, MessageSquare, Layers];

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; capabilities: CapabilityPreviewItem[] };

export function CapabilityPreview() {
  const scopeRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchCapabilityPreview().then((result) => {
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
      revealElements(".cap-card", scopeRef.current ?? document);
    }
  }, [capabilities]);

  return (
    <Section ref={scopeRef} className="bg-surface-alt">
      <Container>
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Capabilities</p>
          <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]">
            What I build
          </h2>
        </div>

        {phase.kind === "loading" && (
          <LoadingState
            label="Loading capabilities…"
            className="mt-10 border-0 bg-transparent py-8"
          />
        )}

        {phase.kind === "error" && <ErrorState onRetry={retry} className="mt-10" />}

        {phase.kind === "ready" && capabilities.length === 0 && (
          <EmptyState
            title="No capabilities yet"
            description="Capability content is being prepared. Check back soon."
            className="mt-10"
          />
        )}

        {phase.kind === "ready" && capabilities.length > 0 && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((cap, i) => {
              const Icon = icons[i % icons.length];
              return (
                <SurfaceCard
                  key={cap.id}
                  asChild
                  interactive
                  className="cap-card group flex h-full flex-col bg-surface p-6 hover:bg-surface-pale"
                >
                  <Link to="/capabilities">
                    <span className={cardIconChipClass}>
                      <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-heading text-lg font-semibold text-navy">{cap.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/65">{cap.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {cap.labels.map((label) => (
                        <span key={label} className={cardChipClass}>
                          {label}
                        </span>
                      ))}
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-heading text-sm font-semibold text-navy">
                      Explore capability
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </Container>
    </Section>
  );
}
