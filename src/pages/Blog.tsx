import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { BlogFilter } from "@/components/blog/BlogFilter";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { blogPosts } from "@/data/blog";
import { formatDate } from "@/lib/utils";

export default function Blog() {
  const [active, setActive] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (active === "ALL") return blogPosts;
    return blogPosts.filter((post) => post.category === active);
  }, [active]);

  const featured = blogPosts.find((post) => post.featured) ?? blogPosts[0];

  return (
    <>
      <Seo
        title="Blog"
        description="Technical notes, AI experiments, engineering lessons and practical insights from Edward Kwinane building modern software."
        path="/blog"
      />
      <PageHero
        eyebrow="Thoughts · Experiments · Engineering"
        title="Building, thinking and learning in public."
        description="Technical notes, AI experiments, engineering lessons and practical insights from building modern software."
      />

      <Section className="pt-0 lg:pt-0">
        <Container>
          <Link
            to={`/blog/${featured.slug}`}
            className="group grid overflow-hidden rounded-2xl border border-surface-pale-3 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(13,13,91,0.12)] focus-ring lg:grid-cols-[1fr_380px]"
          >
            <div className="relative flex min-h-[220px] items-center justify-center bg-navy p-8">
              <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:32px_32px]" />
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
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/50">
                <span className="font-medium text-navy">{featured.author}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {formatDate(featured.date)}
                </span>
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

          <div className="mt-14">
            <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-navy">
              All articles
            </h2>
            <BlogFilter active={active} onChange={setActive} className="mt-5" />
            <div className="mt-8">
              <BlogGrid posts={filtered} />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}