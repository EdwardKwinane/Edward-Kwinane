import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ProjectGrid } from "@/components/portfolio/ProjectGrid";
import { projects } from "@/data/projects";
import { revealElements } from "@/lib/gsap";

export function FeaturedPortfolio() {
  const scopeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    revealElements(".featured-card", scopeRef.current ?? document);
  }, []);

  return (
    <Section ref={scopeRef} className="bg-surface">
      <Container>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">Portfolio</p>
            <h2 className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]">
              Selected work
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink/65">
              A selection of AI systems and digital products built from architecture to production.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/portfolio">
              View all projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <ProjectGrid
          projects={projects.slice(0, 4)}
          columns={2}
          className="featured-card mt-10"
        />
      </Container>
    </Section>
  );
}