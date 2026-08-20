import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/data/blog";
import { Badge } from "@/components/ui/Badge";

export function BlogCard({ post, className }: { post: BlogPost; className?: string }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-surface-pale-3 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(13,13,91,0.1)] focus-ring",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="pale">{post.category}</Badge>
        {post.placeholder && (
          <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/40">
            Placeholder
          </span>
        )}
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold leading-snug text-navy transition-colors group-hover:text-accent-dark">
        {post.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/60 line-clamp-3">{post.excerpt}</p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/45">
          <span>{formatDate(post.date)}</span>
          <span aria-hidden="true">·</span>
          <span>{post.readingTime}</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 font-heading text-sm font-semibold text-navy">
          Read article
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}