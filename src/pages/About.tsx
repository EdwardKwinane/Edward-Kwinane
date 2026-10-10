import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Cpu,
  Github,
  Linkedin,
  Network,
  Package,
  Sparkles,
} from "lucide-react";
import Seo from "@/components/seo/Seo";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { revealElements } from "@/lib/gsap";
import { useSiteSettings } from "@/data/site";

const profileFields = [
  { label: "Name", value: "Edward Kwinane" },
  { label: "Role", value: "AI Engineer & Digital Architect" },
  { label: "Focus", value: "AI Engineering" },
  { label: "Specialization", value: "Voice · RAG · Agents · Full-Stack" },
  { label: "Workflow", value: "AI-native development" },
];

const philosophy = [
  { index: "01", text: "Start with the problem." },
  { index: "02", text: "Design the system before writing the code." },
  { index: "03", text: "Use AI where it creates leverage." },
  { index: "04", text: "Keep architecture understandable." },
  { index: "05", text: "Ship, measure, improve." },
];

const expertise = [
  {
    icon: Cpu,
    title: "AI Engineering",
    description: "Voice systems, RAG pipelines, chatbots and agents built with modern AI architectures and evaluated against real outcomes.",
    labels: ["VOICE", "RAG", "AGENTS", "LLMs"],
  },
  {
    icon: Network,
    title: "System Architecture",
    description: "Clear boundaries across experience, orchestration, intelligence, knowledge and systems — so products stay maintainable and replaceable.",
    labels: ["BOUNDARIES", "CONTRACTS", "SCALE"],
  },
  {
    icon: Package,
    title: "Product Engineering",
    description: "Full-stack products built from interface to infrastructure with production reliability as the default, not an afterthought.",
    labels: ["FULL-STACK", "APIs", "DEPLOYMENT"],
  },
  {
    icon: Sparkles,
    title: "AI-Native Development",
    description: "Using AI inside the build workflow itself — accelerating implementation without skipping design or verification.",
    labels: ["WORKFLOW", "SPEED", "QUALITY"],
  },
];

export default function About() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const settings = useSiteSettings();

  useEffect(() => {
    revealElements(".about-reveal", scopeRef.current ?? document, { stagger: 0.1 });
  }, []);

  /* Derived from the CMS owner name rather than hard-coded, and falls back to a
     neutral monogram so the tile is never empty. */
  const initials =
    settings.ownerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "EK";

  /* Same CMS fields the footer renders, and the same "hide when unset" rule,
     so no placeholder handle is ever displayed. */
  const socialLinks = [
    { href: settings.githubUrl, label: "GitHub", Icon: Github },
    { href: settings.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
  ].filter((link) => Boolean(link.href));

  return (
    <>
      <Seo
        title="About"
        description="Edward Kwinane is an AI Engineer & Digital Architect building AI-native products with a focus on system design, AI engineering and full-stack development."
        path="/about"
      />
      <PageHero
        eyebrow="About Edward Kwinane"
        title="Building with an AI-native mindset."
        description="I specialize in turning ambitious ideas into working software by combining AI engineering, system architecture and modern full-stack development."
      />

      <div ref={scopeRef} className="glass-field">
        <Section className="pt-0 lg:pt-0">
          <Container>
            <div className="glass-panel about-reveal p-6 sm:p-8 lg:p-12">
              <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
                <div className="max-w-xl">
                  <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]">
                    From architecture to production
                  </h2>
                  <div className="mt-5 space-y-4 text-base leading-relaxed text-ink/70">
                    <p>
                      I work at the intersection of AI engineering and product development. My
                      focus is building systems that are intelligent on the inside and clear on
                      the outside — voice agents that hold real conversations, RAG pipelines
                      that answer from real knowledge, and full-stack products that ship.
                    </p>
                    <p>
                      I believe the highest-leverage skill is not writing more code faster,
                      but designing the right system before the first line is written. AI makes
                      implementation cheap; architecture makes it safe.
                    </p>
                    <p>
                      Every project I take on follows the same path: understand the problem,
                      design the boundaries, build with AI where it creates leverage, and ship
                      something that can be measured and improved.
                    </p>
                  </div>
                </div>

                <div className="about-reveal">
                  <div className="glass-card p-6 sm:p-8">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <span
                        aria-hidden="true"
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-heading text-lg font-bold tracking-wide text-white shadow-[0_10px_30px_rgba(13,13,91,0.25)] sm:h-16 sm:w-16 sm:text-xl"
                      >
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="font-heading text-lg font-semibold text-navy">
                          {settings.ownerName}
                        </p>
                        <p className="mt-0.5 font-technical text-[11px] font-semibold uppercase tracking-tech text-ink/50">
                          {settings.roleLine}
                        </p>
                      </div>
                    </div>

                    <p className="mt-7 font-technical text-[11px] font-bold uppercase tracking-tech text-ink/40">
                      Technical profile
                    </p>
                    <dl className="mt-3 divide-y divide-surface-pale3">
                      {profileFields.map((field) => (
                        <div
                          key={field.label}
                          className="flex flex-col gap-1 py-3.5 sm:grid sm:grid-cols-[120px_1fr] sm:gap-4 sm:gap-y-0"
                        >
                          <dt className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/40 pt-0.5">
                            {field.label}
                          </dt>
                          <dd className="text-sm font-medium text-navy min-w-0 break-words">
                            {field.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>

              {socialLinks.length > 0 && (
                <div className="glass-card mt-8 p-2">
                  <ul className="grid gap-1 sm:grid-cols-2 sm:gap-2">
                    {socialLinks.map(({ href, label, Icon }) => (
                      <li key={label}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${label} profile`}
                          className="group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-surface-pale focus-ring"
                        >
                          <Icon className="h-5 w-5 shrink-0 text-ink/50 transition-colors group-hover:text-navy" />
                          <span className="text-sm font-medium text-ink/75 transition-colors group-hover:text-navy">
                            {label}
                          </span>
                          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-ink/30 transition-colors group-hover:text-accent" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Container>
        </Section>

        <Section className="pt-0 lg:pt-0">
          <Container>
            <div className="max-w-2xl">
              <p className="eyebrow">Philosophy</p>
              <h2 className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]">
                How I approach engineering
              </h2>
            </div>
            <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5 lg:gap-6">
              {philosophy.map((item) => (
                <li
                  key={item.index}
                  className="about-reveal glass-card p-4 sm:p-6"
                >
                  <span className="font-heading text-3xl font-bold text-surface-pale4">
                    {item.index}
                  </span>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-navy">{item.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </Section>

        <Section className="pt-0 lg:pt-0">
          <Container>
            <div className="max-w-2xl">
              <p className="eyebrow">Expertise</p>
              <h2 className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]">
                Areas of depth
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink/65">
                Qualitative capability areas — not percentage bars. The work speaks for itself.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {expertise.map((area) => {
                const Icon = area.icon;
                return (
                  <div
                    key={area.title}
                    className="about-reveal glass-card flex flex-col p-5 sm:p-8"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-white">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </span>
                    <h3 className="mt-5 font-heading text-xl font-semibold text-navy">{area.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/65">{area.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {area.labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-surface-pale4 bg-surface-pale px-3 py-1 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/60"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="about-reveal glass-panel mt-14 p-8 lg:p-10">
              <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-navy lg:text-2xl">
                    Have a system in mind?
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink/65">
                    From a voice agent to a full product, I take ideas from architecture to
                    production.
                  </p>
                </div>
                <Button asChild variant="accent" size="lg">
                  <Link to="/contact">
                    Let's talk
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Container>
        </Section>
      </div>
    </>
  );
}