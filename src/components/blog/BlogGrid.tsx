import { cn } from "@/lib/utils";
import type { BlogPost } from "@/data/blog";
import { BlogCard } from "./BlogCard";

export function BlogGrid({ posts, className }: { posts: BlogPost[]; className?: string }) {
  if (!posts.length) {
    return (
      <p className="rounded-2xl border border-dashed border-surface-pale-4 bg-white p-10 text-center text-sm text-ink/50">
        No articles in this category yet.
      </p>
    );
  }
  return (
    <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:gap-8", className)}>
      {posts.map((post) => (
        <BlogCard key={post.slug} post={post} />
      ))}
    </div>
  );
}