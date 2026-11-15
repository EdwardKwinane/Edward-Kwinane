import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { BlogCard } from "@/components/blog/BlogCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchBlogPosts, type BlogPost } from "@/data/blog";
import { revealElements } from "@/lib/gsap";

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; posts: BlogPost[] };

export function BlogPreview() {
  const scopeRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchBlogPosts().then((result) => {
      if (cancelled) return;
      if (result.status === "success") setPhase({ kind: "ready", posts: result.data });
      else setPhase({ kind: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => setAttempt((a) => a + 1);

  const posts = phase.kind === "ready" ? phase.posts : [];

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

        {phase.kind === "loading" && (
          <LoadingState
            label="Loading articles…"
            className="mt-10 border-0 bg-transparent py-8"
          />
        )}

        {phase.kind === "error" && <ErrorState onRetry={retry} className="mt-10" />}

        {phase.kind === "ready" && posts.length === 0 && (
          <EmptyState
            title="No articles yet"
            description="New writing is being prepared. Check back soon."
            className="mt-10"
          />
        )}

        {phase.kind === "ready" && posts.length > 0 && (
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
