import { Container, Section } from "@/components/ui/Container";
import { LogoMarquee } from "@/components/ui/LogoMarquee";
import { tools, type Tool } from "@/data/tool-stack";

function ToolLogo({ tool }: { tool: Tool }) {
  return (
    <span className="flex shrink-0 items-center gap-3 text-ink/55 transition-colors duration-300 hover:text-ink">
      <svg
        viewBox="0 0 24 24"
        /* Decorative: the name beside it is the accessible label. */
        aria-hidden="true"
        focusable="false"
        className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
        fill="currentColor"
      >
        <path d={tool.path} />
      </svg>
      <span className="font-heading text-sm font-semibold tracking-tight text-current sm:text-base">
        {tool.name}
      </span>
    </span>
  );
}

/**
 * Tools & Technologies — a quiet, horizontal statement of the stack behind the
 * work. Sits between the projects showcase and the architecture section so it
 * reads as a transition rather than a standalone feature block.
 */
export function ToolsSection() {
  return (
    <Section className="bg-surface-alt">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Tools &amp; Technologies</p>
          <h2 className="mt-3 font-heading text-[28px] font-semibold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px]">
            The stack I build with
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/65">
            A modern, typed, CMS-driven stack — chosen so the products I ship stay fast to
            build and easy to maintain long after launch.
          </p>
        </div>
      </Container>

      <div className="mt-12 lg:mt-14">
        <LogoMarquee aria-label="Technologies used to build this portfolio">
          {tools.map((tool) => (
            <ToolLogo key={tool.id} tool={tool} />
          ))}
        </LogoMarquee>
      </div>
    </Section>
  );
}