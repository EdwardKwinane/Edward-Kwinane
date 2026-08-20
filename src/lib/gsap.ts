import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface RevealOptions {
  y?: number;
  duration?: number;
  stagger?: number;
  start?: string;
  ease?: string;
}

export function revealElements(
  selector: string | Element[],
  scope: Element | Document = document,
  options: RevealOptions = {}
) {
  if (prefersReducedMotion()) return;

  const targets =
    typeof selector === "string" ? Array.from(scope.querySelectorAll(selector)) : selector;

  gsap.fromTo(
    targets,
    { opacity: 0, y: options.y ?? 32 },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? 0.7,
      stagger: options.stagger ?? 0.12,
      ease: options.ease ?? "power3.out",
      scrollTrigger: {
        trigger: targets[0] ?? scope,
        start: options.start ?? "top 85%",
        toggleActions: "play none none none",
      },
    }
  );
}

export function dataFlowAnimation(scope: Element, selector = ".flow-node") {
  if (prefersReducedMotion()) return;

  const nodes = Array.from(scope.querySelectorAll<HTMLElement>(selector));
  if (!nodes.length) return;

  const tl = gsap.timeline({
    repeat: -1,
    repeatDelay: 0.8,
    scrollTrigger: { trigger: scope, start: "top 75%" },
  });

  nodes.forEach((node) => {
    tl.fromTo(
      node,
      { opacity: 0.35, scale: 0.96 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.45,
        ease: "power2.out",
        onStart: () => node.classList.add("is-active"),
        onComplete: () => node.classList.remove("is-active"),
      }
    ).to(node, { opacity: 1, duration: 0.5 }, ">-0.1");
  });

  return tl;
}

export function particleLineAnimation(scope: Element, duration = 2.4) {
  if (prefersReducedMotion()) return;

  const lines = Array.from(scope.querySelectorAll<SVGLineElement>("line.flow-line"));
  if (!lines.length) return;

  lines.forEach((line) => {
    const len = line.getTotalLength();
    gsap.fromTo(
      line,
      { strokeDasharray: `${len} ${len}`, strokeDashoffset: len, opacity: 1 },
      {
        strokeDashoffset: 0,
        opacity: 1,
        duration,
        ease: "power1.inOut",
        scrollTrigger: { trigger: scope, start: "top 80%" },
        onComplete: () => {
          gsap.fromTo(
            line,
            { strokeDashoffset: len },
            {
              strokeDashoffset: 0,
              duration,
              ease: "none",
              repeat: -1,
              repeatDelay: 0.5,
            }
          );
        },
      }
    );
  });
}

export function killScrollTriggers(scope?: Element) {
  if (scope) {
    ScrollTrigger.getAll()
      .filter((st) => st.trigger && scope.contains(st.trigger as Element))
      .forEach((st) => st.kill());
  }
}

export { gsap, ScrollTrigger };