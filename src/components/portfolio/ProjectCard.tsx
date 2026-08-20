import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/data/projects";
import { Badge } from "@/components/ui/Badge";

export function ProjectCard({ project, className }: { project: Project; className?: string }) {
  return (
    <Link
      to={`/portfolio/${project.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-surface-pale-3 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(13,13,91,0.12)] focus-ring",
        className
      )}
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-navy">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex flex-col items-center gap-1 text-center transition-transform duration-500 group-hover:scale-105">
          <span className="font-technical text-xs font-bold uppercase tracking-tech text-accent">
            {project.visual.label}
          </span>
          <span className="font-technical text-[10px] uppercase tracking-tech text-white/60">
            {project.visual.sublabel}
          </span>
        </div>
        {project.placeholder && (
          <Badge variant="orange" className="absolute right-3 top-3">
            Placeholder
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="navy">{project.category}</Badge>
          <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/40">
            {project.status}
          </span>
        </div>
        <div>
          <h3 className="font-heading text-xl font-semibold text-navy transition-colors group-hover:text-accent-dark">
            {project.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/65 line-clamp-3">{project.description}</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {project.technologies.slice(0, 5).map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-surface-pale-4 bg-surface-pale px-2.5 py-0.5 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/60"
            >
              {tech}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-navy">
          View project
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}