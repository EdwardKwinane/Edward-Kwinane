import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { ContactForm } from "@/components/contact/ContactForm";
import { ContactWithGlobe } from "@/components/ui/contact-with-globe";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export default function Contact() {
  return (
    <>
      <Seo
        title="Contact"
        description="Start a project with Edward Kwinane — AI voice agents, RAG systems, AI chatbots, AI agents and full-stack products built from concept to production."
        path="/contact"
      />
      <PageHero
        eyebrow="Start a Project"
        title="Let's build something intelligent."
        description="Have an AI product idea, automation challenge or full-stack project? Let's turn it into a production-ready system."
      />

      <Section className="pt-0 lg:pt-0">
        <Container>
          {/* Left column: context + static globe. Right column: the real form. */}
          <ContactWithGlobe>
            <SurfaceCard className="p-6 lg:p-10">
              <h2 className="font-heading text-xl font-semibold text-navy lg:text-2xl">
                Tell me about the system
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                The more context you share about the problem, the sharper the first conversation.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </SurfaceCard>
          </ContactWithGlobe>
        </Container>
      </Section>
    </>
  );
}
