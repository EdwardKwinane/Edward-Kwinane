import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { useSiteSettings } from "@/data/site";

export function FinalCta() {
  const settings = useSiteSettings();

  return (
    <Section className="bg-primary">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-technical text-[13px] font-bold uppercase tracking-tech text-accent">
            {settings.availabilityText}
          </p>
          <h2 className="mt-4 font-heading text-[28px] font-semibold leading-[36px] text-white sm:text-[32px] sm:leading-[40px] lg:text-[48px] lg:leading-[56px]">
            Have an idea? Let's build it.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70">
            Whether you're exploring an AI product, automating a workflow or building something
            from scratch, let's turn the idea into a production-ready system.
          </p>
          <div className="mt-8">
            <Button asChild variant="accent" size="lg">
              <Link to="/contact">
                Start a conversation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}