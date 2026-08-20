import { cn } from "@/lib/utils";
import type { Capability } from "@/data/technologies";
import { ArchitectureDiagram } from "@/components/architecture/ArchitectureDiagram";
import { Badge } from "@/components/ui/Badge";

export function CapabilityCard({
  capability,
  flip = false,
  className,
}: {
  capability: Capability;
  flip?: boolean;
  className?: string;
}) {
  return (
    <div
      id={capability.id}
      className={cn(
        "grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16",
        flip && "lg:[&>*:first-child]:order-2",
        className
      )}
    >
      <div>
        <span className="font-heading text-5xl font-bold text-surface-pale-4">{capability.index}</span>
        <p className="eyebrow mt-4">{capability.eyebrow}</p>
        <h2 className="mt-3 font-heading text-[28px] font-semibold leading-tight text-navy lg:text-[32px] lg:leading-[40px]">
          {capability.headline}
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-ink/70">{capability.description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {capability.labels.map((label) => (
            <Badge key={label} variant="pale">
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-surface-pale-3 bg-white p-6 lg:p-8">
        <p className="mb-5 font-technical text-[11px] font-bold uppercase tracking-tech text-ink/40">
          System flow
        </p>
        <ArchitectureDiagram flow={capability.flow} compact activeIndex={-1} className="[&_*]:!transition-none" />
      </div>
    </div>
  );
}