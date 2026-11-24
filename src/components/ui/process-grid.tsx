import type { LucideIcon } from "lucide-react";
import {
  CheckCheck,
  CloudUpload,
  Network,
  Search,
  SquareTerminal,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cardIconChipClass, SurfaceCard, surfaceCardClass } from "./SurfaceCard";
import type { ProcessStage } from "@/data/process";

/**
 * ProcessGrid — the homepage “From idea to production” six-stage grid.
 *
 * Three columns × two rows on desktop, two × three on tablet, one × six on
 * mobile. Each card is a non-interactive panel built on the shared
 * `SurfaceCard` shell (same radius, hairline border and surface as every
 * other card on the site) with the standard `cardIconChipClass` icon tile,
 * so the section belongs to the existing card language rather than
 * introducing a second one.
 *
 * Cards are informational: no links, no tab stops, no pointer cursor and no
 * hover affordance that would imply they can be clicked. The shared icon
 * chip's `group-hover` accent is intentionally not activated here because
 * the cards are not in a `group`.
 *
 * Entrance animation is the site-wide GSAP scroll reveal
 * (`revealElements(".process-card")`, called by the section), which itself
 * disables under reduced motion.
 */

const stageIcons: Record<string, LucideIcon> = {
  "01": Search,
  "02": Network,
  "03": SquareTerminal,
  "04": CheckCheck,
  "05": CloudUpload,
  "06": TrendingUp,
};

const cardClass = cn(
  surfaceCardClass,
  "flex h-full min-h-[220px] flex-col p-6 sm:min-h-[232px] sm:p-7 lg:min-h-[248px] lg:p-8"
);

export interface ProcessGridProps {
  stages: readonly ProcessStage[];
  className?: string;
}

export function ProcessGrid({ stages, className }: ProcessGridProps) {
  return (
    <ul
      className={cn(
        "grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3",
        className
      )}
    >
      {stages.map((stage) => {
        const Icon = stageIcons[stage.index];
        return (
          <li key={stage.index} className="process-card h-full">
            <SurfaceCard className={cardClass}>
              <div className="flex items-center justify-between gap-4">
                <span className={cardIconChipClass}>
                  <Icon
                    aria-hidden="true"
                    focusable="false"
                    className="h-5 w-5"
                    strokeWidth={1.75}
                  />
                </span>
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-px w-8 bg-navy/15" />
                  <span className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/70">
                    Stage {stage.index}
                  </span>
                </span>
              </div>

              <div className="pt-7 sm:pt-8">
                <h3 className="font-heading text-xl font-semibold leading-snug text-navy lg:text-[22px]">
                  {stage.name}
                </h3>
                <p className="mt-2.5 text-pretty text-[15px] leading-relaxed text-ink/65 sm:max-md:text-balance">
                  {stage.detail}
                </p>
              </div>
            </SurfaceCard>
          </li>
        );
      })}
    </ul>
  );
}

export default ProcessGrid;
