import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { ProjectFilter } from "@/components/portfolio/ProjectFilter";
import { ProjectGrid } from "@/components/portfolio/ProjectGrid";
import { projects, type ProjectCategory } from "@/data/projects";

type FilterValue = "ALL" | ProjectCategory;

export default function Portfolio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawFilter = searchParams.get("category");
  const active: FilterValue = (["ALL", "AI", "VOICE", "RAG", "CHATBOTS", "AGENTS", "FULL-STACK"] as const).includes(
    rawFilter as FilterValue
  )
    ? (rawFilter as FilterValue)
    : "ALL";

  const filtered = useMemo(
    () => (active === "ALL" ? projects : projects.filter((p) => p.categories.includes(active))),
    [active]
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
            {filtered.length} {filtered.length === 1 ? "project" : "projects"}
            {active !== "ALL" ? ` in ${active}` : ""}
          </p>

          <ProjectGrid projects={filtered} className="mt-8" />

          <p className="mt-12 rounded-2xl border border-dashed border-surface-pale-4 bg-surface-pale p-6 text-sm leading-relaxed text-ink/55">
            Project data lives in <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs">src/data/projects.ts</code> —
            add or replace entries there and the pages update automatically. Current entries are
            clearly labeled placeholders ready to be replaced with real work.
          </p>
        </Container>
      </Section>
    </>
  );
}