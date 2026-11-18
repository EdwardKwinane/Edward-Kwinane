import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/data/projects";
import { Badge } from "@/components/ui/Badge";
import { SurfaceCard, CardMedia, cardChipClass } from "@/components/ui/SurfaceCard";

export function ProjectCard({ project, className }: { project: Project; className?: string }) {
  const cover = project.coverImage;

  return (
    <SurfaceCard asChild interactive className={cn("group flex h-full flex-col overflow-hidden", className)}>
      <Link to={`/portfolio/${project.slug}`}>
        <CardMedia src={cover} alt={project.coverImageAlt}>
          {!cover && (
            <>
              {/* Blueprint grid over the navy-deep placeholder surface. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:32px_32px]"
              />
              <div
                aria-hidden="true"
                className="relative flex h-full flex-col items-center justify-center gap-1 text-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-105"
              >
                <span className="font-technical text-xs font-bold uppercase tracking-tech text-accent">
                  {project.visual.label}
                </span>
                <span className="font-technical text-[10px] uppercase tracking-tech text-white/60">
                  {project.visual.sublabel}
                </span>
              </div>
            </>
          )}
          {/* This badge sits on the navy-deep band, which is dark in both
              themes. accent-dark measures 3.22:1 there, so the label is forced
              to white (16.1:1 light / 13.9:1 dark). */}
          {project.placeholder && (
            <Badge variant="orange" className="absolute right-3 top-3 text-white">
              Placeholder
            </Badge>
          )}
        </CardMedia>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="navy">{project.category}</Badge>
            <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65">
              {project.status}
            </span>
          </div>
          <div>
            <h3 className="font-heading text-xl font-semibold text-navy transition-colors duration-300 motion-reduce:transition-none group-hover:text-accent-dark">
              {project.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/65 line-clamp-3">{project.description}</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            {project.technologies.slice(0, 5).map((tech) => (
              <span key={tech} className={cardChipClass}>
                {tech}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-navy">
            View project
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1"
            />
          </span>
        </div>
      </Link>
    </SurfaceCard>
  );
}
