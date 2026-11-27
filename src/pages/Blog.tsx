import { useEffect, useState } from "react";
import Seo from "@/components/seo/Seo";
import { BlogListing } from "@/components/ui/shadcn-studio-blog-component-15";
import { fetchBlogPosts, type BlogPost } from "@/data/blog";

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; posts: BlogPost[] };

/**
 * Blog index.
 *
 * The page owns the data layer (one Sanity query per visit, retry on failure)
 * and the page-level copy; the listing component owns the editorial header,
 * category filters, search and card grid. Loading, error and genuinely-empty
 * states are distinct — an outage is never rendered as an empty blog.
 */
export default function Blog() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchBlogPosts()
      .then((result) => {
        if (cancelled) return;
        if (result.status === "success") setPhase({ kind: "ready", posts: result.data });
        else setPhase({ kind: "error" });
      })
      .catch(() => {
        // The data layer reports failures as values; this guard only exists so
        // an unexpected rejection can never strand the page on "loading".
        if (!cancelled) setPhase({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => setAttempt((a) => a + 1);

  // Loading and error states must not be indexed as if they were content.
  // A successful (even legitimately empty) listing stays indexable.
  const indexable = phase.kind === "ready";

  return (
    <>
      <Seo
        title="AI Implementation Insights | Edward Kwinane"
        description="Notes on AI implementation, architecture, integration, reliability and responsible adoption."
        path="/blog"
        noindex={!indexable}
      />
      <BlogListing
        status={phase.kind}
        posts={phase.kind === "ready" ? phase.posts : []}
        onRetry={retry}
        eyebrow="Blog"
        title="Building, thinking and learning in public."
        description="Technical notes, AI experiments, engineering lessons and practical insights from building modern software."
      />
    </>
  );
}
