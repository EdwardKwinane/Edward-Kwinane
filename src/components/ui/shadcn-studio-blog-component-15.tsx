import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Container, Section } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { CardMedia, SurfaceCard } from "@/components/ui/SurfaceCard";
import { blogCategories, type BlogPost } from "@/data/blog";

/**
 * Blog listing — the editorial index for `/blog`.
 *
 * Adapted from the supplied Shadcn Studio “Blog Component 15” reference: the
 * reference's header → category filters → search → card grid composition is
 * kept, but everything is rebuilt on this project's own primitives
 * (`SurfaceCard`/`CardMedia`, `Badge`, `Input`, `Button`, Container/Section
 * tokens, React Router) instead of shadcn UI. The reference's demo posts,
 * categories and authors were discarded — this component renders only the
 * posts handed to it by the page, which fetches them from Sanity. Nothing
 * here fetches, caches or invents content.
 *
 * Filtering is presentation state (category + free-text search) and runs on
 * the already-loaded posts. Search matches title, subtitle, excerpt, category,
 * author and tags; both filters combine.
 *
 * Accessibility: the filters are a real ARIA tablist with roving tab index and
 * Arrow/Home/End keys controlling the grid panel; the search field has a
 * visually hidden label and an announced result count; the empty result state
 * is a `role="status"` message with a clear-filters action. Cards are single
 * links (one tab stop each) and animate only under `motion-safe`.
 */

export type BlogListingStatus = "loading" | "error" | "ready";

export interface BlogListingProps {
  /** Load state owned by the page's data layer. */
  status: BlogListingStatus;
  /** Published posts from the CMS. Ignored unless `status === "ready"`. */
  posts: BlogPost[];
  /** Retry handler for the error state. */
  onRetry?: () => void;
  /** Section eyebrow. Defaults to the brief's "Blog" label. */
  eyebrow?: string;
  /** Page-level headline (`h1`). Copy stays with the page owner. */
  title: string;
  /** Supporting description under the headline. */
  description?: string;
  className?: string;
}

/** Lower-case, accent-folded form used for free-text matching. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Everything a visitor can reasonably type to find this post. */
function searchableText(post: BlogPost): string {
  return normalize(
    [post.title, post.subtitle, post.excerpt, post.category, post.author, ...post.tags]
      .filter(Boolean)
      .join(" ")
  );
}

function authorInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/**
 * Cover band. Always occupies the same box so cards align whether or not the
 * CMS supplied an image, and so images cannot shift the layout while loading.
 * Without a cover the band becomes a navy technical panel labelled with the
 * post's real category — deliberate, not a stock photograph pretending to be
 * the article's artwork.
 */
function BlogCover({ post }: { post: BlogPost }) {
  return (
    <CardMedia src={post.coverImage} alt={post.coverImageAlt ?? ""}>
      {!post.coverImage && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(rgb(255 255 255 / 0.4) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.4) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center px-6">
            <span className="rounded-full border border-white/25 bg-white/5 px-3.5 py-1.5 text-center font-technical text-[10px] font-bold uppercase tracking-tech text-white/85">
              {post.category}
            </span>
          </span>
        </>
      )}
    </CardMedia>
  );
}

function BlogPostCard({ post }: { post: BlogPost }) {
  const dateLabel = formatDate(post.date);
  const meta = [dateLabel, post.readingTime].filter(Boolean).join(" · ");

  return (
    <li className="h-full">
      <SurfaceCard
        asChild
        interactive
        className="group h-full overflow-hidden bg-surface-alt"
      >
        <Link to={`/blog/${post.slug}`} className="flex h-full flex-col">
          <BlogCover post={post} />

          <div className="flex flex-1 flex-col p-5 sm:p-6 lg:p-5 xl:p-6">
            <div className="flex items-start justify-between gap-3">
              <Badge variant="pale">{post.category}</Badge>
              {post.featured && (
                <span className="shrink-0 pt-1 text-right font-technical text-[9px] font-bold uppercase tracking-tech text-accent-dark">
                  Featured article
                </span>
              )}
            </div>

            {meta && (
              <p className="mt-3 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/55">
                {meta}
                {post.placeholder && (
                  <>
                    <span aria-hidden="true" className="px-1.5">
                      ·
                    </span>
                    Placeholder
                  </>
                )}
              </p>
            )}

            <h2 className="mt-1.5 font-heading text-lg font-semibold leading-snug text-navy line-clamp-2 transition-colors duration-300 motion-reduce:transition-none group-hover:text-accent-dark lg:text-xl">
              {post.title}
            </h2>

            {post.excerpt && (
              <p className="mt-2 text-sm leading-relaxed text-ink/65 line-clamp-3">
                {post.excerpt}
              </p>
            )}

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-surface-pale3 pt-4 text-xs xl:text-[13px]">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary font-technical text-[9px] font-bold text-white"
                >
                  {authorInitials(post.author)}
                </span>
                <span className="min-w-0 truncate font-medium text-navy">{post.author}</span>
              </span>

              <span className="inline-flex shrink-0 items-center gap-1 font-heading font-semibold text-navy transition-colors duration-300 motion-reduce:transition-none group-hover:text-accent-dark">
                Read article
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-300 motion-reduce:transition-none motion-safe:group-hover:translate-x-1"
                />
              </span>
            </div>
          </div>
        </Link>
      </SurfaceCard>
    </li>
  );
}

export function BlogListing({
  status,
  posts,
  onRetry,
  eyebrow = "Blog",
  title,
  description,
  className,
}: BlogListingProps) {
  const baseId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const panelId = `${baseId}-panel`;
  const searchId = `${baseId}-search`;

  const [activeCategory, setActiveCategory] = React.useState("ALL");
  const [query, setQuery] = React.useState("");
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * Categories come from the published posts, ordered by the site's editorial
   * category list so tabs never reshuffle between renders. "All" is always
   * present and always first.
   */
  const categories = React.useMemo(() => {
    const order = new Map(blogCategories.map((category, index) => [category, index]));
    const present = Array.from(new Set(posts.map((post) => post.category).filter(Boolean)));
    return present.sort(
      (a, b) =>
        (order.get(a as (typeof blogCategories)[number]) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b as (typeof blogCategories)[number]) ?? Number.MAX_SAFE_INTEGER) ||
        a.localeCompare(b)
    );
  }, [posts]);

  const tabs = React.useMemo(() => ["ALL", ...categories], [categories]);
  /** A tab can vanish if the CMS reloads without that category. */
  const selectedTab = tabs.includes(activeCategory) ? activeCategory : "ALL";

  const normalizedQuery = normalize(query.trim());

  const visible = React.useMemo(
    () =>
      posts.filter((post) => {
        if (selectedTab !== "ALL" && post.category !== selectedTab) return false;
        if (!normalizedQuery) return true;
        return searchableText(post).includes(normalizedQuery);
      }),
    [posts, selectedTab, normalizedQuery]
  );

  function resetFilters() {
    setActiveCategory("ALL");
    setQuery("");
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.indexOf(selectedTab);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    setActiveCategory(nextTab);
    tabRefs.current[nextIndex]?.focus();
  }

  const countLabel =
    visible.length === posts.length
      ? `${visible.length} ${visible.length === 1 ? "article" : "articles"}`
      : `Showing ${visible.length} of ${posts.length} articles`;

  return (
    <div className={className}>
      {/* Editorial header — the site's PageHero treatment, owned here so the
          listing reads as one block. */}
      <header className="bg-surface pt-32 pb-10 lg:pt-40 lg:pb-14">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1
              id={`${baseId}-heading`}
              className="mt-4 font-heading text-[28px] font-bold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px] lg:text-[48px] lg:leading-[56px]"
            >
              {title}
            </h1>
            {description && (
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/70 lg:text-lg">
                {description}
              </p>
            )}
          </div>
        </Container>
      </header>

      <Section aria-label="Blog articles" className="pt-0 lg:pt-0">
        <Container>
          {status === "loading" && (
            <LoadingState label="Loading articles…" className="border-0 bg-transparent py-8" />
          )}

          {status === "error" && <ErrorState onRetry={onRetry} />}

          {status === "ready" && posts.length === 0 && (
            <EmptyState
              title="No articles yet"
              description="There are no published articles right now. Check back soon — new writing lands here first."
            />
          )}

          {status === "ready" && posts.length > 0 && (
            <>
              <div className="flex flex-col gap-4 border-b border-surface-pale3 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <div
                  role="tablist"
                  aria-label="Filter articles by category"
                  onKeyDown={handleTabKeyDown}
                  className="flex gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {tabs.map((tab, index) => {
                    const selected = tab === selectedTab;
                    return (
                      <button
                        key={tab}
                        ref={(element) => {
                          tabRefs.current[index] = element;
                        }}
                        type="button"
                        role="tab"
                        id={`${baseId}-tab-${index}`}
                        aria-selected={selected}
                        aria-controls={panelId}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => setActiveCategory(tab)}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 font-technical text-[11px] font-bold uppercase tracking-tech transition-colors duration-200 focus-ring motion-reduce:transition-none",
                          selected
                            ? "border-primary bg-primary text-white shadow-[0_4px_16px_rgba(13,13,91,0.22)]"
                            : "border-surface-pale4 bg-surface-alt text-ink/65 hover:border-navy/40 hover:text-navy"
                        )}
                      >
                        {tab === "ALL" ? "All" : tab}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full lg:max-w-xs">
                  <label htmlFor={searchId} className="sr-only">
                    Search articles
                  </label>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50"
                  />
                  <Input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search articles, topics, authors"
                    autoComplete="off"
                    className="h-11 pl-11 pr-11 [&::-webkit-search-cancel-button]:appearance-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink/55 transition-colors hover:text-navy focus-ring motion-reduce:transition-none"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <p
                aria-live="polite"
                className="mt-4 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/55"
              >
                {countLabel}
              </p>

              <div
                role="tabpanel"
                id={panelId}
                aria-labelledby={`${baseId}-tab-${tabs.indexOf(selectedTab)}`}
                className="mt-6"
              >
                {visible.length === 0 ? (
                  <div
                    role="status"
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-pale4 bg-surface-alt px-6 py-14 text-center"
                  >
                    <Search aria-hidden="true" className="h-7 w-7 text-ink/45" />
                    <h2 className="font-heading text-xl font-semibold text-navy">
                      No articles match your search
                    </h2>
                    <p className="max-w-md text-sm leading-relaxed text-ink/65">
                      Try a different keyword, or choose another category.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <ul
                    role="list"
                    className="grid auto-rows-fr gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3"
                  >
                    {visible.map((post) => (
                      <BlogPostCard key={post.slug} post={post} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </Container>
      </Section>
    </div>
  );
}

export default BlogListing;
