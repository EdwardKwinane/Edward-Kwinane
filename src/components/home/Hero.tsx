import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HeroArchitecture } from "./HeroArchitecture";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

export function Hero() {
  const scopeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-reveal",
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", delay: 0.15 }
      );
    }, scope);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={scopeRef} className="relative overflow-hidden bg-surface pt-32 pb-16 lg:pt-40 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(13,13,91,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(13,13,91,0.4)_1px,transparent_1px)] [background-size:48px_48px]" />
      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <p className="eyebrow hero-reveal">AI Engineer · Digital Architect</p>
            <h1 className="hero-reveal mt-4 font-heading text-[28px] font-bold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px] lg:text-[48px] lg:leading-[56px]">
              I build AI-native products from concept to production.
            </h1>
            <p className="hero-reveal mt-6 text-base leading-relaxed text-ink/70 lg:text-lg">
              I design and build intelligent software systems across voice agents, RAG pipelines,
              AI chatbots and full-stack applications — turning complex ideas into production-ready
              products.
            </p>
            <div className="hero-reveal mt-8 flex items-center gap-4">
              <Button asChild variant="accent" size="lg">
                <Link to="/portfolio">
                  View my portfolio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">
                  Let's build something
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="hero-reveal mt-10 flex flex-wrap gap-x-6 gap-y-2">
              {["Voice Agents", "RAG Systems", "AI Chatbots", "AI Agents", "Full-Stack"].map((t) => (
                <span
                  key={t}
                  className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/40"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-reveal">
            <div className="rounded-2xl border border-surface-pale-4 bg-white p-6 shadow-[0_24px_60px_rgba(13,13,91,0.1)] lg:p-8">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/40">
                  System status
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-emerald-700">
                    Operational
                  </span>
                </span>
              </div>
              <HeroArchitecture />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}