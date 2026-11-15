import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { BlogFilter } from "@/components/blog/BlogFilter";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchBlogPosts, type BlogPost } from "@/data/blog";
import { formatDate } from "@/lib/utils";

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; posts: BlogPost[] };

export default function Blog() {
  const [active, setActive] = useState<string>("ALL");
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchBlogPosts().then((result) => {
      if (cancelled) return;
      if (result.status === "success") setPhase({ kind: "ready", posts: result.data });
      else setPhase({ kind: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => setAttempt((a) => a + 1);

  const posts = phase.kind === "ready" ? phase.posts : [];

  const filtered = useMemo(() => {
    if (active === "ALL") return posts;
    return posts.filter((post) => post.category === active);
  }, [active, posts]);

  const featured = posts.find((post) => post.featured) ?? posts[0];
  const featuredDate = featured ? formatDate(featured.date) : "";

  // Loading and error states must not be indexed as if they were content.
  // A successful (even legitimately empty) listing stays indexable.
  const indexable = phase.kind === "ready";

  return (
    <>
      <Seo
        title="Blog"
        description="Technical notes, AI experiments, engineering lessons and practical insights from Edward Kwinane building modern software."
        path="/blog"
        noindex={!indexable}
      />
      <PageHero
        eyebrow="Thoughts · Experiments · Engineering"
        title="Building, thinking and learning in public."
        description="Technical notes, AI experiments, engineering lessons and practical insights from building modern software."
      />

      <Section className="pt-0 lg:pt-0">
        <Container>
          {phase.kind === "loading" && (
            <LoadingState label="Loading articles…" className="border-0 bg-transparent py-8" />
          )}

          {phase.kind === "error" && <ErrorState onRetry={retry} />}

          {phase.kind === "ready" && posts.length === 0 && (
            <EmptyState
              title="No articles yet"
              description="There are no published articles right now. Check back soon — new writing lands here first."
            />
          )}

          {phase.kind === "ready" && posts.length > 0 && (
            <>
              {featured && (
                <Link
                  to={`/blog/${featured.slug}`}
                  className="group grid overflow-hidden rounded-2xl border border-surface-pale3 bg-surface-alt transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(13,13,91,0.12)] focus-ring lg:grid-cols-[1fr_380px]"
                >
                  <div className="relative flex min-h-[140px] items-center justify-center bg-primary p-6 sm:min-h-[220px] sm:p-8">
                    {featured.coverImage ? (
                      <img
                        src={featured.coverImage}
                        alt={featured.coverImageAlt ?? ""}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:32px_32px]" />
                    )}
                    <span className="relative font-technical text-sm font-bold uppercase tracking-tech text-accent">
                      Featured article
                    </span>
                  </div>
                  <div className="flex flex-col p-8 lg:p-10">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="navy">{featured.category}</Badge>
                      {featured.placeholder && <Badge variant="orange">Placeholder</Badge>}
                    </div>
                    <h2 className="mt-4 font-heading text-2xl font-semibold leading-tight text-navy transition-colors group-hover:text-accent-dark lg:text-[32px] lg:leading-[40px]">
                      {featured.title}
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-ink/65">{featured.subtitle}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/65">
                      <span className="font-medium text-navy">{featured.author}</span>
                      {featuredDate && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" aria-hidden="true" />
                          {featuredDate}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {featured.readingTime}
                      </span>
                    </div>
                    <span className="mt-6 inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-navy">
                      Read article
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              )}

              <div className="mt-14">
                <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-navy">
                  All articles
                </h2>
                <BlogFilter active={active} onChange={setActive} className="mt-5" />
                <div className="mt-8">
                  <BlogGrid posts={filtered} />
                </div>
              </div>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
