import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { BlogCard } from "@/components/blog/BlogCard";
import { fetchBlogPosts, type BlogPost } from "@/data/blog";
import { revealElements } from "@/lib/gsap";

export function BlogPreview() {
  const scopeRef = useRef<HTMLElement>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchBlogPosts().then((items) => {
      if (cancelled) return;
      setPosts(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (posts.length) {
      revealElements(".blog-preview-card", scopeRef.current ?? document);
    }
  }, [posts]);

  return (
    <Section ref={scopeRef} className="bg-surface">
      <Container>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Blog</p>
            <h2 className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]">
              From the lab
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink/65">
              Ideas, technical notes and lessons from building with AI.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/blog">
              View all articles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {posts.length > 0 && (
          <div className="blog-preview-card mt-10 grid gap-6 md:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}