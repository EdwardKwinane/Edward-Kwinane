import { Mail, MessageSquare, Zap } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { ContactForm } from "@/components/contact/ContactForm";
import { SurfaceCard, cardIconChipClass } from "@/components/ui/SurfaceCard";

const contactChannels = [
  {
    icon: Zap,
    title: "Project types",
    description: "Voice agents, RAG systems, chatbots, agents, full-stack products and automation.",
  },
  {
    icon: MessageSquare,
    title: "Response time",
    description: "Messages are typically reviewed within a couple of business days.",
  },
  {
    icon: Mail,
    title: "Prefer email?",
    description: "There is no public email address yet — use the form to get in touch.",
  },
];

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
          <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
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

            <aside className="space-y-6">
              {contactChannels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <SurfaceCard key={channel.title} className="bg-surface-pale p-6">
                    <span className={cardIconChipClass}>
                      <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-heading text-base font-semibold text-navy">
                      {channel.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink/65">
                      {channel.description}
                    </p>
                  </SurfaceCard>
                );
              })}
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}