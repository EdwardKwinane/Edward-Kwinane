import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ProjectGrid } from "@/components/portfolio/ProjectGrid";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchFeaturedProjects, type Project } from "@/data/projects";
import { revealElements } from "@/lib/gsap";

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; projects: Project[] };

export function FeaturedPortfolio() {
  const scopeRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchFeaturedProjects().then((result) => {
      if (cancelled) return;
      if (result.status === "success") setPhase({ kind: "ready", projects: result.data });
      else setPhase({ kind: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => setAttempt((a) => a + 1);

  const projects = phase.kind === "ready" ? phase.projects : [];

  useEffect(() => {
    if (projects.length) {
      revealElements(".featured-card", scopeRef.current ?? document);
    }
  }, [projects]);

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

        {phase.kind === "loading" && (
          <LoadingState
            label="Loading selected work…"
            className="mt-10 border-0 bg-transparent py-8"
          />
        )}

        {phase.kind === "error" && <ErrorState onRetry={retry} className="mt-10" />}

        {phase.kind === "ready" && projects.length === 0 && (
          <EmptyState
            title="No projects yet"
            description="Selected work is being prepared. Check back soon."
            className="mt-10"
          />
        )}

        {phase.kind === "ready" && projects.length > 0 && (
          <ProjectGrid
            projects={projects.slice(0, 4)}
            columns={2}
            className="featured-card mt-10"
          />
        )}
      </Container>
    </Section>
  );
}
