import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { ProjectFilter } from "@/components/portfolio/ProjectFilter";
import { ProjectGrid } from "@/components/portfolio/ProjectGrid";
import { fetchProjects, type Project, type ProjectCategory } from "@/data/projects";

type FilterValue = "ALL" | ProjectCategory;

export default function Portfolio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const rawFilter = searchParams.get("category");
  const active: FilterValue = (["ALL", "AI", "VOICE", "RAG", "CHATBOTS", "AGENTS", "FULL-STACK"] as const).includes(
    rawFilter as FilterValue
  )
    ? (rawFilter as FilterValue)
    : "ALL";

  useEffect(() => {
    let cancelled = false;
    fetchProjects().then((items) => {
      if (cancelled) return;
      setProjects(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      />
      <PageHero
        eyebrow="Selected Work"
        title="AI systems. Digital products. Real engineering."
        description="A collection of products and experiments built across AI engineering, system architecture and full-stack development."
      />

      <Section className="pt-0 lg:pt-0">
        <Container>
          <ProjectFilter active={active} onChange={onChange} />

          <p className="mt-6 text-sm text-ink/50" aria-live="polite">
            {loading
              ? "Loading projects…"
              : `${filtered.length} ${filtered.length === 1 ? "project" : "projects"}${
                  active !== "ALL" ? ` in ${active}` : ""
                }`}
          </p>

          <ProjectGrid projects={filtered} className="mt-8" />

          <p className="mt-12 rounded-2xl border border-dashed border-surface-pale-4 bg-surface-pale p-6 text-sm leading-relaxed text-ink/55">
            Project content is managed in Sanity Studio (<code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs">npm run studio</code>)
            and falls back to the placeholder entries in <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs">src/data/projects.ts</code>{" "}
            when Sanity isn't configured.
          </p>
        </Container>
      </Section>
    </>
  );
}