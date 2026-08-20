import * as React from "react";
import { cn } from "@/lib/utils";
import { ArchitectureNode } from "./ArchitectureNode";

export interface FlowNode {
  step: string;
  detail?: string;
}

export interface ArchitectureDiagramProps {
  flow: FlowNode[];
  className?: string;
  compact?: boolean;
  activeIndex?: number;
}

export function ArchitectureDiagram({
  flow,
  className,
  compact,
  activeIndex = -1,
}: ArchitectureDiagramProps) {
  return (
    <div className={cn("flex flex-col items-stretch", className)}>
      {flow.map((node, i) => {
        const isActive = activeIndex === -1 || activeIndex === i;
        return (
          <React.Fragment key={node.step}>
            <ArchitectureNode
              label={node.step}
              detail={node.detail}
              compact={compact}
              state={isActive ? "active" : "idle"}
              className="mx-auto w-full max-w-xs"
            />
            {i < flow.length - 1 && <Connector />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function Connector({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-7 w-full items-center justify-center", className)}>
      <div className="h-full w-px bg-accent/40" />
      <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 animate-pulse rounded-full bg-accent" />
    </div>
  );
}