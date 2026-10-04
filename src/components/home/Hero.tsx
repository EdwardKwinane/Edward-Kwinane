import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HeroArchitecture } from "./HeroArchitecture";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useSiteSettings } from "@/data/site";

export function Hero() {
  const scopeRef = useRef<HTMLElement>(null);
  const settings = useSiteSettings();

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
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-[0.05]" />
      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <p className="eyebrow hero-reveal">{settings.roleLine}</p>
            <h1 className="hero-reveal mt-4 font-heading text-[28px] font-bold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px] lg:text-[48px] lg:leading-[56px]">
              {settings.heroHeadline}
            </h1>
            <p className="hero-reveal mt-6 text-base leading-relaxed text-ink/70 lg:text-lg">
              {settings.heroSubheadline}
            </p>
            <div className="hero-reveal mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
              {settings.heroTags.map((t) => (
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
            <div className="rounded-2xl border border-surface-pale-4 bg-surface-alt p-4 shadow-[0_24px_60px_rgba(13,13,91,0.1)] sm:p-6 lg:p-8">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/40">
                  System status
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-success">
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