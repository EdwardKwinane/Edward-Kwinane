/**
 * The six stages of the delivery process shown on the homepage.
 *
 * This copy is owner-approved and must stay verbatim — the Process section
 * states the method once, in the same words, everywhere it is referenced.
 * Presentation (icons, layout, motion) lives in
 * `src/components/ui/process-grid.tsx`; keep this module free of styling.
 */
export interface ProcessStage {
  /** Two-digit stage number. Doubles as the React key and the tile label. */
  index: string;
  /** Stage name, e.g. "DISCOVER". */
  name: string;
  /** One-sentence description of the stage. */
  detail: string;
}

export const processStages: readonly ProcessStage[] = [
  {
    index: "01",
    name: "DISCOVER",
    detail: "Understand the problem, users and constraints before anything else.",
  },
  {
    index: "02",
    name: "ARCHITECT",
    detail: "Design the system boundaries and contracts before writing code.",
  },
  {
    index: "03",
    name: "BUILD",
    detail: "Implement with AI where it creates leverage, from interface to infrastructure.",
  },
  {
    index: "04",
    name: "VALIDATE",
    detail: "Measure against the outcome — retrieval quality, reliability, real usage.",
  },
  {
    index: "05",
    name: "DEPLOY",
    detail: "Ship to production with clean infrastructure and observability.",
  },
  {
    index: "06",
    name: "EVOLVE",
    detail: "Improve based on evidence, not guesswork.",
  },
];
