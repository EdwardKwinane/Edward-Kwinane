import { Mail, MessageSquare, Zap } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { ContactForm } from "@/components/contact/ContactForm";

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
    description: "Connect the form below to a real endpoint, or reach out through the channels in the footer.",
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
            <div className="rounded-2xl border border-surface-pale-3 bg-white p-6 lg:p-10">
              <h2 className="font-heading text-xl font-semibold text-navy lg:text-2xl">
                Tell me about the system
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                The more context you share about the problem, the sharper the first conversation.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>

            <aside className="space-y-6">
              {contactChannels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <div key={channel.title} className="rounded-2xl border border-surface-pale-3 bg-surface-pale p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-navy text-white">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <h3 className="mt-4 font-heading text-base font-semibold text-navy">
                      {channel.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink/60">
                      {channel.description}
                    </p>
                  </div>
                );
              })}
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}