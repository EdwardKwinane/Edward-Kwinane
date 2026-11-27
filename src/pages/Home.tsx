import Seo from "@/components/seo/Seo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Hero } from "@/components/home/Hero";
import { CapabilityPreview } from "@/components/home/CapabilityPreview";
import { FeaturedPortfolio } from "@/components/home/FeaturedPortfolio";
import { IntegrationHero } from "@/components/ui/integration-hero";
import { ArchitectureSection } from "@/components/home/ArchitectureSection";
import { ProcessSection } from "@/components/home/ProcessSection";
import { BlogPreview } from "@/components/home/BlogPreview";
import { FinalCta } from "@/components/home/FinalCta";

export default function Home() {
  return (
    <>
      <Seo
        title="Edward Kwinane | AI Implementation Specialist"
        description="Explore Edward Kwinane's approach to AI implementation, connecting business opportunities with AI strategy, engineering, integration and practical solutions."
        path="/"
      />
      {/* Each section owns its boundary, so one failing section can never
          blank the page or take the others with it. */}
      <ErrorBoundary>
        <Hero />
      </ErrorBoundary>
      <ErrorBoundary>
        <CapabilityPreview />
      </ErrorBoundary>
      <ErrorBoundary>
        <FeaturedPortfolio />
      </ErrorBoundary>
      <ErrorBoundary>
        <IntegrationHero />
      </ErrorBoundary>
      <ErrorBoundary>
        <ArchitectureSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <ProcessSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <BlogPreview />
      </ErrorBoundary>
      <ErrorBoundary>
        <FinalCta />
      </ErrorBoundary>
    </>
  );
}
