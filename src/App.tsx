import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { SiteSettingsProvider } from "@/data/site";

const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Portfolio = lazy(() => import("@/pages/Portfolio"));
const PortfolioDetail = lazy(() => import("@/pages/PortfolioDetail"));
const Capabilities = lazy(() => import("@/pages/Capabilities"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogDetail = lazy(() => import("@/pages/BlogDetail"));
const Contact = lazy(() => import("@/pages/Contact"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

/**
 * First tab stop on every page. Without it a keyboard user traverses the whole
 * navigation before reaching page content.
 */
function SkipToContent() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:inline-flex focus:h-11 focus:items-center focus:rounded-md focus:bg-accent-fill focus:px-4 focus:font-heading focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
    >
      Skip to content
    </a>
  );
}

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteSettingsProvider>
        <MetaPixel />
        <ScrollToTop />
        <SkipToContent />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          {/*
            The footer shares this Suspense boundary with the lazy route so it
            is never painted against the 50vh loading fallback. Without this,
            the footer sits in the first viewport and then moves off-screen as
            soon as the real page height arrives — a site-wide layout shift.
          */}
          <Suspense
            fallback={
              <main id="main" tabIndex={-1} className="flex-1">
                <PageFallback />
              </main>
            }
          >
            <main id="main" tabIndex={-1} className="flex-1">
              <Routes>
                <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
                <Route path="/about" element={<ErrorBoundary><About /></ErrorBoundary>} />
                <Route path="/portfolio" element={<ErrorBoundary><Portfolio /></ErrorBoundary>} />
                <Route path="/portfolio/:slug" element={<ErrorBoundary><PortfolioDetail /></ErrorBoundary>} />
                <Route path="/capabilities" element={<ErrorBoundary><Capabilities /></ErrorBoundary>} />
                <Route path="/blog" element={<ErrorBoundary><Blog /></ErrorBoundary>} />
                <Route path="/blog/:slug" element={<ErrorBoundary><BlogDetail /></ErrorBoundary>} />
                <Route path="/contact" element={<ErrorBoundary><Contact /></ErrorBoundary>} />
                <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
              </Routes>
            </main>
            <Footer />
          </Suspense>
        </div>
      </SiteSettingsProvider>
    </BrowserRouter>
  );
}