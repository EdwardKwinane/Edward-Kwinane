import { cn } from "@/lib/utils";
import type { Project } from "@/data/projects";
import { ProjectCard } from "./ProjectCard";

export function ProjectGrid({
  projects,
  columns = 3,
  className,
}: {
  projects: Project[];
  columns?: 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-6 md:gap-8",
        columns === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </div>
  );
}