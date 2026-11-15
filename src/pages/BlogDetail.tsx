import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Seo from "@/components/seo/Seo";
import { Container, Section } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import NotFound from "@/pages/NotFound";
import { BlogCard } from "@/components/blog/BlogCard";
import { ArchitectureDiagram } from "@/components/architecture/ArchitectureDiagram";
import { fetchBlogPost, fetchBlogPosts, type BlogPost } from "@/data/blog";
import { PortableTextRenderer } from "@/lib/sanity/components/PortableText";
import { formatDate } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

function ContentBlock({ block }: { block: NonNullable<BlogPost["content"]>[number] }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "h2":
      return <h2 id={block.id}>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "quote":
      return <blockquote>{block.text}</blockquote>;
    case "callout":
      return (
        <div
          role="note"
          className="my-6 rounded-xl border border-accent/30 bg-surface-pale p-5"
        >
          <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-accent-dark">
            {block.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">{block.text}</p>
        </div>
      );
    case "ul":
      return (
        <ul>
          {block.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {block.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre>
          <code>{block.code}</code>
        </pre>
      );
    case "diagram": {
      const flow = (block.items ?? []).map((step, i) => ({
        step,
        detail: i === 0 ? "Entry point" : undefined,
      }));
      return (
        <div className="my-6 rounded-2xl border border-surface-pale4 bg-surface-pale p-6">
          <ArchitectureDiagram flow={flow} compact activeIndex={-1} />
        </div>
      );
    }
    default:
      return null;
  }
}

function TableOfContents({ post }: { post: BlogPost }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden rounded-2xl border border-surface-pale3 bg-surface-alt p-6 lg:block">
        <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/65">
          On this page
        </p>
        <nav className="mt-4 flex flex-col gap-1" aria-label="Table of contents">
          {(post.tableOfContents ?? []).map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-md px-3 py-2 text-sm text-ink/65 transition-colors hover:bg-surface-pale hover:text-navy"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="rounded-2xl border border-surface-pale3 bg-surface-alt lg:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-6 py-4 font-technical text-[11px] font-bold uppercase tracking-tech text-navy"
        >
          Table of contents
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-surface-pale3 p-4" aria-label="Table of contents">
            {(post.tableOfContents ?? []).map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-ink/65 transition-colors hover:bg-surface-pale hover:text-navy"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "not-found" }
  | { kind: "ready"; post: BlogPost; related: BlogPost[] };

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setPhase({ kind: "loading" });

    async function load() {
      // The post is fetched first; the list is only fetched once the detail
      // has actually resolved, so an outage never issues a second unnecessary
      // request.
      const itemResult = slug
        ? await fetchBlogPost(slug)
        : { status: "not-found" } as const;
      if (cancelled) return;

      if (itemResult.status !== "success") {
        if (itemResult.status === "not-found") {
          setPhase({ kind: "not-found" });
        } else {
          // Recoverable failure or malformed data: an ErrorState, never a
          // fake NotFound. The URL stays untouched, so valid content is never
          // deindexed because of a temporary CMS outage.
          setPhase({ kind: "error" });
        }
        return;
      }

      const post = itemResult.data;

      const listResult = await fetchBlogPosts();
      if (cancelled) return;
      const all = listResult.status === "success" ? listResult.data : [];

      const related = all
        .filter((p) => p.slug !== post.slug)
        .filter((p) => post.related.includes(p.slug) || p.category === post.category)
        .slice(0, 2);

      setPhase({ kind: "ready", post, related });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  const retry = () => setAttempt((a) => a + 1);

  if (phase.kind === "loading") {
    return (
      <>
        <Seo
          title="Article"
          description="Loading the article from the CMS."
          path={slug ? `/blog/${slug}` : "/blog"}
          noindex
        />
        <section className="bg-surface pt-32 pb-12 lg:pt-40">
          <Container>
            <LoadingState label="Loading article…" className="border-0 bg-transparent py-8" />
          </Container>
        </section>
      </>
    );
  }

  if (phase.kind === "error") {
    return (
      <>
        <Seo
          title="Temporarily unavailable"
          description="This article couldn't be loaded right now."
          path={slug ? `/blog/${slug}` : "/blog"}
          noindex
        />
        <section className="bg-surface pt-32 pb-12 lg:pt-40">
          <Container>
            <ErrorState onRetry={retry} />
          </Container>
        </section>
      </>
    );
  }

  // A successful response with no matching document is a genuine 404: render
  // NotFound in place so the URL stays honest and the page keeps noindex.
  if (phase.kind === "not-found") return <NotFound />;

  const { post, related } = phase;
  const dateLabel = formatDate(post.date);

  const articleSchema = {
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date || undefined,
    author: { "@type": "Person", name: post.author },
    publisher: { "@id": `${window.location.origin}/#person` },
    mainEntityOfPage: `${window.location.origin}/blog/${post.slug}`,
    image: `${window.location.origin}/og-image.png`,
    keywords: post.tags.join(", ") || undefined,
  };

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: window.location.origin },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${window.location.origin}/blog` },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${window.location.origin}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        type="article"
        structuredData={[articleSchema, breadcrumbSchema]}
      />
      <section className="bg-surface pt-32 pb-12 lg:pt-40">
        <Container>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 font-technical text-[11px] font-bold uppercase tracking-tech text-ink/65 transition-colors hover:text-accent focus-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>

          <div className="mt-8 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="navy">{post.category}</Badge>
              {post.placeholder && <Badge variant="orange">Placeholder content</Badge>}
            </div>
            <h1 className="mt-5 font-heading text-[28px] font-bold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px] lg:text-[48px] lg:leading-[56px]">
              {post.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink/65">{post.subtitle}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-surface-pale3 py-4 text-sm text-ink/65">
              <span className="font-medium text-navy">{post.author}</span>
              {dateLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {dateLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {post.readingTime}
              </span>
            </div>
          </div>
        </Container>
      </section>

      <Section className="pt-0 lg:pt-0">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-14">
            <aside className="order-2 lg:order-1 lg:sticky lg:top-28 lg:self-start">
              <TableOfContents post={post} />
            </aside>

            <article className="order-1 lg:order-2">
              <div className="prose-article mx-auto max-w-2xl">
                {post.body ? (
                  <PortableTextRenderer body={post.body} />
                ) : (
                  post.content?.map((block, i) => <ContentBlock key={i} block={block} />)
                )}
              </div>

              <div className="mx-auto mt-10 flex max-w-2xl flex-wrap gap-2 border-t border-surface-pale3 pt-6">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-surface-pale4 bg-surface-pale px-3 py-1 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </Container>
      </Section>

      {related.length > 0 && (
        <Section className="bg-surface pt-0 lg:pt-0">
          <Container>
            <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-navy">
              Related articles
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {related.map((r) => (
                <BlogCard key={r.slug} post={r} />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
