import Seo from "@/components/seo/Seo";
import { Hero } from "@/components/home/Hero";
import { CapabilityPreview } from "@/components/home/CapabilityPreview";
import { FeaturedPortfolio } from "@/components/home/FeaturedPortfolio";
import { ToolsSection } from "@/components/home/ToolsSection";
import { ArchitectureSection } from "@/components/home/ArchitectureSection";
import { ProcessSection } from "@/components/home/ProcessSection";
import { BlogPreview } from "@/components/home/BlogPreview";
import { FinalCta } from "@/components/home/FinalCta";

export default function Home() {
  return (
    <>
      <Seo
        title="Edward Kwinane — AI Engineer & Digital Architect"
        description="Edward Kwinane builds AI-native products from concept to production — AI voice agents, RAG systems, AI chatbots, AI agents and rapid full-stack development."
        path="/"
      />
      <Hero />
      <CapabilityPreview />
      <FeaturedPortfolio />
      <ToolsSection />
      <ArchitectureSection />
      <ProcessSection />
      <BlogPreview />
      <FinalCta />
    </>
  );
}