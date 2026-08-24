import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Container, Section } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { getProject } from "@/data/projects";

export default function PortfolioDetail() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProject(slug) : undefined;

  if (!project) return <Navigate to="/portfolio" replace />;

  const related = project.related
    .map((s) => getProject(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .filter((p) => p.slug !== project.slug)
    .slice(0, 2);

  return (
    <>
      <Seo
        title={project.title}
        description={project.description}
        path={`/portfolio/${project.slug}`}
        type="article"
      />
      <section className="bg-surface pt-32 pb-14 lg:pt-40 lg:pb-20">
        <Container>
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 font-technical text-[11px] font-bold uppercase tracking-tech text-ink/50 transition-colors hover:text-accent focus-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to portfolio
          </Link>

          <div className="mt-8 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="navy">{project.category}</Badge>
              <span className="font-technical text-[11px] font-semibold uppercase tracking-tech text-ink/40">
                {project.status}
              </span>
              {project.placeholder && <Badge variant="orange">Placeholder content</Badge>}
            </div>
            <h1 className="mt-5 font-heading text-[28px] font-bold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px] lg:text-[48px] lg:leading-[56px]">
              {project.title}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-ink/70 lg:text-lg">
              {project.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-surface-pale-4 bg-surface-alt px-3 py-1 font-technical text-[11px] font-semibold uppercase tracking-tech text-ink/60"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <Section className="pt-0 lg:pt-0">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:gap-14">
            <article className="max-w-2xl">
              {project.sections.map((section, i) => (
                <div key={section.heading} className="border-t border-surface-pale-3 py-8 first:border-t-0">
                  <h2 className="font-technical text-[13px] font-bold uppercase tracking-tech text-accent">
                    {String(i + 1).padStart(2, "0")} — {section.heading}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {section.body.map((paragraph, j) => (
                      <p key={j} className="text-base leading-relaxed text-ink/70">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </article>

            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-2xl border border-surface-pale-3 bg-surface-pale p-6">
                <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/40">
                  Case study
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/50">Category</dt>
                    <dd className="font-medium text-navy">{project.category}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/50">Status</dt>
                    <dd className="font-medium text-navy">{project.status}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/50">Systems</dt>
                    <dd className="text-right font-medium text-navy">
                      {project.categories.join(" · ")}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl bg-primary p-6 text-white">
                <p className="font-heading text-lg font-semibold">Have a similar problem?</p>
                <p className="mt-2 text-sm text-white/70">Let's design and build the system together.</p>
                <Button asChild variant="accent" size="sm" className="mt-5">
                  <Link to="/contact">
                    Let's talk
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {related.length > 0 && (
        <Section className="bg-surface pt-0 lg:pt-0">
          <Container>
            <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-navy">
              Related work
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {related.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}