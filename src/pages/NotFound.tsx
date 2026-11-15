import { Link } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/Button";

/**
 * Unknown routes must not be indexed. The HTTP 404 served by Vercel for these
 * paths carries a `noindex` meta in its <head> (see scripts/build-404.mjs);
 * this covers the client-side case, when a stale in-app link renders this
 * page inside the already-loaded bundle. The `noindex` flag is owned by
 * `Seo.tsx`, which also restores whatever robots state existed on unmount.
 */
export default function NotFound() {
  return (
    <>
      <Seo
        title="Page not found"
        description="The page you're looking for doesn't exist."
        path="/404"
        noindex
      />
      <section className="flex min-h-[60vh] flex-col items-center justify-center bg-surface px-4 pt-24 text-center">
        <p className="font-heading text-7xl font-bold text-ink/50">404</p>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-navy">
          This page doesn't exist
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/65">
          The route you're looking for isn't part of the system.
        </p>
        <div className="mt-8">
          <Button asChild variant="accent">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
