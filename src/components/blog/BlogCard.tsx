import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { BlogPost } from "@/data/blog";
import { Badge } from "@/components/ui/Badge";
import { SurfaceCard, CardMedia } from "@/components/ui/SurfaceCard";

/**
 * Editorial article card. One component serves all three call sites — the blog
 * grid, the detail page's related posts and the homepage preview — because the
 * contexts differ only in their parent grid, which `className` already absorbs.
 *
 * `coverImage` is optional in the Sanity schema and most posts leave it unset,
 * so the text-only form is the primary design and the media band is additive.
 * All colour, type and radius values come from the project's own tokens and
 * the shared card shell (`components/ui/SurfaceCard.tsx`).
 *
 * `border-surface-pale3` is spelled without a dash because that is the key in
 * tailwind.config.ts. The dashed `border-surface-pale-3` spelling emits no CSS
 * at all; it only appeared to work because index.css sets a global
 * `* { border-color: var(--surface-pale-3) }` fallback. The codebase now uses
 * the generated spelling throughout.
 */
export function BlogCard({ post, className }: { post: BlogPost; className?: string }) {
  const dateLabel = formatDate(post.date);

  return (
    <SurfaceCard asChild interactive className={cn("group flex h-full flex-col overflow-hidden", className)}>
      <Link to={`/blog/${post.slug}`}>
        {post.coverImage && (
          <CardMedia src={post.coverImage} alt={post.coverImageAlt} />
        )}

        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="inline-flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-4 w-0.5 shrink-0 rounded-pill bg-accent"
              />
              <Badge variant="pale">{post.category}</Badge>
            </span>
            {post.placeholder && (
              <span className="shrink-0 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65">
                Placeholder
              </span>
            )}
          </div>

          <h3 className="mt-4 font-heading text-lg font-semibold leading-snug text-navy line-clamp-2 transition-colors duration-300 motion-reduce:transition-none group-hover:text-accent-dark">
            {post.title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-ink/65 line-clamp-3">{post.excerpt}</p>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-5">
            <span className="whitespace-nowrap font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65">
              {dateLabel && (
                <>
                  {dateLabel}
                  <span aria-hidden="true" className="px-1.5">
                    ·
                  </span>
                </>
              )}
              {post.readingTime}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 font-heading text-sm font-semibold text-navy transition-colors duration-300 motion-reduce:transition-none group-hover:text-accent-dark">
              Read article
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 motion-reduce:transition-none motion-safe:group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </Link>
    </SurfaceCard>
  );
}
