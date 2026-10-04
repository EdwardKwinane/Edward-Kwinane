import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const mainChain = [
  { label: "USER", detail: "Human intent" },
  { label: "VOICE / CHAT", detail: "Interface layer" },
  { label: "AI ORCHESTRATION", detail: "Routing · Context · Tools" },
  { label: "LLM", detail: "Reasoning engine" },
];

const branches = [
  { label: "RAG", detail: "Retrieval" },
  { label: "TOOLS", detail: "Actions" },
  { label: "MEMORY", detail: "State" },
];

const rails = [
  { label: "DATABASE / SERVICES", detail: "Persistent systems" },
  { label: "RESPONSE", detail: "Delivered output" },
];

const systemLabels = ["MODEL", "RETRIEVAL", "MEMORY", "TOOLS", "DATABASE", "SYSTEM STATUS"];

export function HeroArchitecture({ className }: { className?: string }) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope || prefersReducedMotion()) return;

    const nodes = Array.from(scope.querySelectorAll<HTMLElement>(".arch-node"));
    const dots = Array.from(scope.querySelectorAll<HTMLElement>(".flow-dot"));
    const ctx = gsap.context(() => {
      gsap.fromTo(
        nodes,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.12,
          ease: "power2.out",
          delay: 0.4,
        }
      );

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.1, delay: 1.6 });
      nodes.forEach((node, i) => {
        tl.to(node, { duration: 0.4, backgroundColor: "#FE5900", color: "#fff" }, `>${i === 0 ? 0 : 0.05}`)
          .to(node, { duration: 0.4, backgroundColor: "", color: "" }, "+=0.15");
      });

      dots.forEach((dot, i) => {
        gsap.to(dot, {
          y: i % 2 === 0 ? 60 : -40,
          opacity: 0,
          duration: 1.6,
          repeat: -1,
          repeatDelay: 0.4,
          ease: "power1.in",
          delay: i * 0.6,
        });
      });
    }, scope);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={scopeRef} className={cn("relative", className)}>
      <div className="flex flex-col items-center gap-0">
        {mainChain.map((n, i) => (
          <div key={n.label} className="flex w-full max-w-[260px] flex-col items-center">
            <Node label={n.label} detail={n.detail} className="arch-node w-full" />
            {i < mainChain.length - 1 && <Connector />}
          </div>
        ))}

        <div className="my-2 flex w-full max-w-[280px] items-center justify-between gap-2 sm:max-w-[420px]">
          <span className="hidden h-px flex-1 bg-accent/40 sm:block" />
          <span className="flow-dot h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(254,89,0,0.6)]" />
          <span className="hidden h-px flex-1 bg-accent/40 sm:block" />
        </div>

        <div className="grid w-full max-w-[280px] grid-cols-2 gap-2 sm:max-w-[420px] sm:grid-cols-3">
          {branches.map((b) => (
            <Node key={b.label} label={b.label} detail={b.detail} className="arch-node" compact />
          ))}
        </div>

        <div className="my-2 flex w-full max-w-[260px] items-center justify-center">
          <div className="h-7 w-px bg-accent/40" />
        </div>

        <div className="flex w-full max-w-[260px] flex-col items-center gap-0">
          <Node label={rails[0].label} detail={rails[0].detail} className="arch-node w-full" />
          <Connector />
          <Node label={rails[1].label} detail={rails[1].detail} className="arch-node w-full" accent />
        </div>
      </div>

      <div className="pointer-events-none mt-6 flex flex-wrap items-center justify-center gap-2">
        {systemLabels.map((s) => (
          <span
            key={s}
            className="rounded-full border border-surface-pale4 bg-surface-alt px-3 py-1 font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/60"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function Node({
  label,
  detail,
  className,
  compact,
  accent,
}: {
  label: string;
  detail: string;
  className?: string;
  compact?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border bg-surface-pale text-center transition-colors",
        compact ? "px-2 py-2.5" : "px-4 py-3.5",
        accent ? "border-accent/40 bg-primary text-white" : "border-surface-pale4",
        className
      )}
    >
      <span
        className={cn(
          "font-technical text-[11px] font-bold uppercase tracking-tech leading-none",
          accent ? "text-white" : "text-navy"
        )}
      >
        {label}
      </span>
      {detail && (
        <span className={cn("mt-1 text-[10px] leading-tight", accent ? "text-white/70" : "text-ink/50")}>
          {detail}
        </span>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="relative flex h-7 w-full items-center justify-center">
      <div className="h-full w-px bg-accent/40" />
      <span className="flow-dot absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_6px_rgba(254,89,0,0.7)]" />
    </div>
  );
}