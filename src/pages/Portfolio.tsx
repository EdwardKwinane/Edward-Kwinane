import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { ProjectFilter } from "@/components/portfolio/ProjectFilter";
import { ProjectGrid } from "@/components/portfolio/ProjectGrid";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchProjects, type Project, type ProjectCategory } from "@/data/projects";

type FilterValue = "ALL" | ProjectCategory;

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; projects: Project[] };

export default function Portfolio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const rawFilter = searchParams.get("category");
  const active: FilterValue = (["ALL", "AI", "VOICE", "RAG", "CHATBOTS", "AGENTS", "FULL-STACK"] as const).includes(
    rawFilter as FilterValue
  )
    ? (rawFilter as FilterValue)
    : "ALL";

  useEffect(() => {
    let cancelled = false;
    fetchProjects().then((result) => {
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

  const filtered = useMemo(
    () => (active === "ALL" ? projects : projects.filter((p) => p.categories.includes(active))),
    [active, projects]
  );

  function onChange(value: FilterValue) {
    if (value === "ALL") setSearchParams({});
    else setSearchParams({ category: value });
  }

  return (
    <>
      <Seo
        title="Portfolio"
        description="AI systems, digital products and real engineering by Edward Kwinane — voice agents, RAG systems, AI chatbots and full-stack products built from architecture to production."
        path="/portfolio"
        noindex={phase.kind !== "ready"}
      />
      <PageHero
        eyebrow="Selected Work"
        title="AI systems. Digital products. Real engineering."
        description="A collection of products and experiments built across AI engineering, system architecture and full-stack development."
      />

      <Section className="pt-0 lg:pt-0">
        <Container>
          {/* Introduces the grid for screen readers and heading navigation.
              Without it the page runs h1 -> h3, skipping h2 entirely. */}
          <h2 className="sr-only">Projects</h2>
          <ProjectFilter active={active} onChange={onChange} />

          {phase.kind === "loading" && <LoadingState label="Loading projects…" className="mt-6" />}

          {phase.kind === "error" && <ErrorState onRetry={retry} className="mt-6" />}

          {phase.kind === "ready" && (
            <>
              <p className="mt-6 text-sm text-ink/65" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? "project" : "projects"}
                {active !== "ALL" ? ` in ${active}` : ""}
              </p>

              {filtered.length > 0 ? (
                <ProjectGrid projects={filtered} className="mt-8" />
              ) : (
                <EmptyState
                  title={
                    projects.length === 0 ? "No projects yet" : `No projects in ${active} yet`
                  }
                  description={
                    projects.length === 0
                      ? "There are no published projects right now. Check back soon."
                      : "Try a different category to see more of the work."
                  }
                  className="mt-8"
                />
              )}
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
