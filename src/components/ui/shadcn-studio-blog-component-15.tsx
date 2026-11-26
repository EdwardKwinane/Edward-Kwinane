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
 * here fetches or invents content; the only local memory is an in-memory
 * last-known post count used to size the loading skeleton.
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

/**
 * Cold-start skeleton fallback. This is the published-post count observed in
 * the read-only 2026-11 Sanity audit, not a query limit or a guarantee: the
 * live query has no upper bound and the CMS can change independently of a
 * deployment. Warm visits use the last successfully rendered count instead.
 */
const COLD_START_SKELETON_CARD_COUNT = 7;

/** Blog-only in-memory count. Updated in an effect, never during render. */
let lastKnownPostCount = COLD_START_SKELETON_CARD_COUNT;

/** Lower-case, accent-folded, whitespace- and dash-normalised form for matching. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\u2010-\u2015]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
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

/** Skeleton pill widths mirror the real tab labels without inventing categories. */
const SKELETON_PILL_WIDTHS = ["w-7", "w-20", "w-16", "w-12", "w-24", "w-20", "w-28"] as const;

/**
 * Structural loading card. It mirrors `BlogPostCard`'s box model — media band,
 * badge/meta/title/excerpt rows and the author footer — so the skeleton grid
 * reserves the same geometry as the ready grid. All nodes are aria-hidden by
 * the parent skeleton and contain no focusable elements.
 */
function BlogSkeletonCard() {
  return (
    <li className="h-full" data-skeleton-card="">
      <SurfaceCard className="flex h-full flex-col overflow-hidden bg-surface-alt motion-safe:animate-pulse">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-pale">
          <div className="absolute inset-0 grid place-items-center">
            <span className="h-6 w-20 rounded-full bg-surface-pale4" />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6 lg:p-5 xl:p-6">
          <div className="flex h-[34px] items-start justify-between gap-3">
            <span className="inline-flex h-[26px] w-24 rounded-full bg-surface-pale" />
          </div>

          <span className="mt-3 block h-6 w-28 rounded-full bg-surface-pale" />

          <span className="mt-1.5 block h-[25px] w-full rounded bg-surface-pale lg:h-7" />
          <span className="mt-0 block h-[25px] w-4/5 rounded bg-surface-pale lg:h-7" />

          <div className="mt-2 flex h-[68px] flex-col justify-between">
            <span className="block h-[22px] w-full rounded bg-surface-pale" />
            <span className="block h-[22px] w-full rounded bg-surface-pale" />
            <span className="block h-[22px] w-3/5 rounded bg-surface-pale" />
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-surface-pale3 pt-4">
            <span className="flex items-center gap-2">
              <span className="h-7 w-7 shrink-0 rounded-full bg-surface-pale" />
              <span className="h-3 w-24 rounded-full bg-surface-pale" />
            </span>
            <span className="h-3 w-20 rounded-full bg-surface-pale" />
          </div>
        </div>
      </SurfaceCard>
    </li>
  );
}

/**
 * Zero-post warm cache still needs geometry matching the ready empty state.
 * It carries the same box model as `EmptyState`, with a screen-reader-only
 * loading label and no focusable elements.
 */
function BlogEmptyLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-blog-skeleton=""
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-surface-pale4 bg-surface-alt px-6 py-14 text-center"
    >
      <span className="sr-only">Loading articles…</span>
      <span aria-hidden="true" className="h-8 w-8 rounded-full bg-surface-pale" />
      <h2 aria-hidden="true" className="font-heading text-2xl font-semibold text-transparent">
        <span className="rounded bg-surface-pale">No articles yet</span>
      </h2>
      <p aria-hidden="true" className="max-w-md text-sm leading-relaxed text-transparent">
        <span className="rounded bg-surface-pale">
          There are no published articles right now. Check back soon — new writing lands here first.
        </span>
      </p>
    </div>
  );
}

/** Loading layout with the ready state's toolbar, count line and grid geometry. */
function BlogLoadingSkeleton({ cardCount }: { cardCount: number }) {
  const safeCardCount = Math.max(0, cardCount);

  if (safeCardCount === 0) return <BlogEmptyLoadingSkeleton />;

  return (
    <div data-blog-skeleton="">
      <div className="flex flex-col gap-4 border-b border-surface-pale3 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex gap-2 overflow-x-auto px-0.5 py-1"
          aria-hidden="true"
          data-skeleton-tablist=""
        >
          {SKELETON_PILL_WIDTHS.map((width, index) => (
            <span
              key={index}
              className="flex shrink-0 items-center rounded-full border border-surface-pale4 bg-surface-alt px-4 py-2"
              data-skeleton-pill=""
            >
              <span className={cn("block h-6 rounded-full bg-surface-pale4", width)} />
            </span>
          ))}
        </div>

        <div className="relative w-full lg:max-w-xs" aria-hidden="true">
          <div className="flex h-11 w-full items-center rounded-md border border-slate-border bg-surface-alt px-4">
            <span className="block h-3 w-2/3 rounded-full bg-surface-pale4" />
          </div>
        </div>
      </div>

      <p
        role="status"
        aria-busy="true"
        aria-live="polite"
        className="mt-4 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/55"
      >
        Loading articles…
      </p>

      <div aria-hidden="true" className="mt-6">
        <ul
          role="list"
          className="grid auto-rows-fr gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3"
        >
          {Array.from({ length: safeCardCount }, (_, index) => (
            <BlogSkeletonCard key={index} />
          ))}
        </ul>
      </div>
    </div>
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
  const tablistRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = React.useRef(false);

  /** Cache only successful ready results; effects never mutate during render. */
  React.useEffect(() => {
    if (status === "ready") lastKnownPostCount = posts.length;
  }, [status, posts.length]);

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

  /** Mouse/pen drag-to-scroll; touch scrolling stays native. */
  function handleTabPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.pointerType !== "mouse" && event.pointerType !== "pen")) return;
    const strip = tablistRef.current;
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: strip.scrollLeft,
      moved: false,
    };
    strip.setPointerCapture(event.pointerId);
  }

  function handleTabPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const strip = tablistRef.current;
    if (!drag || !strip || event.pointerId !== drag.pointerId) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 3) drag.moved = true;
    strip.scrollLeft = drag.startScroll - delta;
  }

  function handleTabPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const strip = tablistRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved) suppressClickRef.current = true;
    if (strip?.hasPointerCapture(event.pointerId)) strip.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  function handleTabClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
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
            <BlogLoadingSkeleton cardCount={lastKnownPostCount} />
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
                  ref={tablistRef}
                  role="tablist"
                  aria-label="Filter articles by category"
                  onKeyDown={handleTabKeyDown}
                  onPointerDown={handleTabPointerDown}
                  onPointerMove={handleTabPointerMove}
                  onPointerUp={handleTabPointerEnd}
                  onPointerCancel={handleTabPointerEnd}
                  onClickCapture={handleTabClickCapture}
                  className="flex cursor-grab gap-2 overflow-x-auto px-0.5 py-1 select-none active:cursor-grabbing"
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
