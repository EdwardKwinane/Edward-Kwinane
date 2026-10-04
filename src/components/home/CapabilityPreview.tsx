import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mic, Database, MessageSquare, Layers } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import {
  fetchCapabilityPreview,
  type CapabilityPreviewItem,
} from "@/data/capabilities";
import { revealElements } from "@/lib/gsap";

const icons = [Mic, Database, MessageSquare, Layers];

export function CapabilityPreview() {
  const scopeRef = useRef<HTMLElement>(null);
  const [capabilities, setCapabilities] = useState<CapabilityPreviewItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCapabilityPreview().then((items) => {
      if (cancelled) return;
      setCapabilities(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((cap, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Link
                key={cap.id}
                to="/capabilities"
                className="cap-card group flex flex-col rounded-2xl border border-surface-pale3 bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-surface-pale hover:shadow-[0_16px_40px_rgba(13,13,91,0.1)] focus-ring"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-white transition-colors duration-300 group-hover:bg-accent">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </span>
                <h3 className="mt-5 font-heading text-lg font-semibold text-navy">{cap.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{cap.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {cap.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-surface-pale4 bg-surface-alt px-2.5 py-0.5 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/55"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-heading text-sm font-semibold text-navy">
                  Explore capability
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}