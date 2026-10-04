import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { BlogPost } from "@/data/blog";
import { Badge } from "@/components/ui/Badge";

/**
 * Editorial article card. One component serves all three call sites — the blog
 * grid, the detail page's related posts and the homepage preview — because the
 * contexts differ only in their parent grid, which `className` already absorbs.
 *
 * `coverImage` is optional in the Sanity schema and most posts leave it unset,
 * so the text-only form is the primary design and the media band is additive.
 * All colour, type and radius values are the project's own tokens.
 *
 * `border-surface-pale3` is spelled without a dash because that is the key in
 * tailwind.config.ts. The `border-surface-pale-3` spelling used elsewhere in the
 * codebase emits no CSS at all and only appears to work because index.css sets
 * `* { border-color: var(--surface-pale-3) }`. Both resolve to the same colour.
 */
export function BlogCard({ post, className }: { post: BlogPost; className?: string }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-surface-pale3 bg-surface-alt",
        "transition-[border-color,box-shadow,transform] duration-300 motion-reduce:transition-none",
        "hover:border-navy/25 hover:shadow-[0_16px_40px_rgba(13,13,91,0.1)]",
        "motion-safe:hover:-translate-y-1 focus-ring",
        className
      )}
    >
      {post.coverImage && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-primary">
          <img
            src={post.coverImage}
            alt={post.coverImageAlt ?? ""}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none motion-safe:group-hover:scale-[1.03]"
          />
        </div>
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
            <span className="shrink-0 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/40">
              Placeholder
            </span>
          )}
        </div>

        <h3 className="mt-4 font-heading text-lg font-semibold leading-snug text-navy line-clamp-2 transition-colors duration-300 motion-reduce:transition-none group-hover:text-accent-dark">
          {post.title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-ink/60 line-clamp-3">{post.excerpt}</p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-5">
          <span className="whitespace-nowrap font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/45">
            {formatDate(post.date)}
            <span aria-hidden="true" className="px-1.5">
              ·
            </span>
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
  );
}
