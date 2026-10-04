import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Seo from "@/components/seo/Seo";
import { Container, Section } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { BlogCard } from "@/components/blog/BlogCard";
import { ArchitectureDiagram } from "@/components/architecture/ArchitectureDiagram";
import { fetchBlogPost, fetchBlogPosts, type BlogPost } from "@/data/blog";
import { PortableTextRenderer } from "@/lib/sanity/components/PortableText";
import { formatDate } from "@/lib/utils";

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
        <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/40">
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

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      const item = slug ? await fetchBlogPost(slug) : undefined;
      const all = await fetchBlogPosts();
      if (cancelled) return;
      setPost(item ?? null);
      setRelated(
        item
          ? all
              .filter((p) => p.slug !== item.slug)
              .filter((p) => item.related.includes(p.slug) || p.category === item.category)
              .slice(0, 2)
          : []
      );
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <section className="bg-surface pt-32 pb-12 lg:pt-40">
        <Container>
          <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/50">
            Loading…</p>
        </Container>
      </section>
    );
  }

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        type="article"
      />
      <section className="bg-surface pt-32 pb-12 lg:pt-40">
        <Container>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 font-technical text-[11px] font-bold uppercase tracking-tech text-ink/50 transition-colors hover:text-accent focus-ring"
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
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-surface-pale3 py-4 text-sm text-ink/55">
              <span className="font-medium text-navy">{post.author}</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {formatDate(post.date)}
              </span>
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
                    className="rounded-full border border-surface-pale4 bg-surface-pale px-3 py-1 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/60"
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