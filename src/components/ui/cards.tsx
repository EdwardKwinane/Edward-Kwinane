import { cn } from "@/lib/utils";

export interface CardItem {
  id: string | number;
  title: string;
  subtitle: string;
  imageUrl: string;
  /**
   * Body copy pinned to the bottom of the card, below the title. Optional so
   * the component still works for purely titled cards.
   */
  description?: string;
}

export interface HoverRevealCardsProps {
  items: CardItem[];
  className?: string;
  cardClassName?: string;
}

/**
 * Reconstruction of the `lavikatiyar/cards` Hover Reveal Cards component from
 * the specification recorded in the project notes — the original 21st.dev
 * registry item is paid-gated and was never retrieved. This is a faithful
 * re-implementation, not the vendor's source.
 *
 * Behaviour contract:
 * - responsive grid of image-background cards
 * - gradient overlay keeps the subtitle/title/description readable
 * - subtitle and title are anchored to the bottom of the card
 * - a hover/focus on the grid de-emphasises the siblings; the active card
 *   becomes prominent
 * - keyboard focus produces the same emphasis as hover
 * - smooth transitions, removed under prefers-reduced-motion
 * - touch devices keep the fully-readable layout and gain emphasis on tap
 *   via focus-within
 *
 * The cards carry no action, so they are not links or buttons and do not set
 * a pointer cursor.
 */
export default function HoverRevealCards({
  items,
  className,
  cardClassName,
}: HoverRevealCardsProps) {
  return (
    <ul
      className={cn(
        "group/cards grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6 xl:grid-cols-3",
        className
      )}
    >
      {items.map((item) => {
        const titleId = `hover-reveal-card-${item.id}-title`;
        return (
          <li
            key={item.id}
            className={cn(
              "relative motion-safe:transition-[opacity,transform,filter] motion-safe:duration-500 motion-safe:ease-out",
              // Parent-driven de-emphasis of the siblings.
              "motion-safe:group-hover/cards:scale-[0.98] group-hover/cards:opacity-60 group-hover/cards:saturate-[0.6]",
              "motion-safe:group-focus-within/cards:scale-[0.98] group-focus-within/cards:opacity-60 group-focus-within/cards:saturate-[0.6]",
              // The active card is prominent again.
              "motion-safe:hover:!scale-[1.03] hover:!opacity-100 hover:!saturate-100",
              "motion-safe:focus-within:!scale-[1.03] focus-within:!opacity-100 focus-within:!saturate-100",
              "hover:z-10 focus-within:z-10",
              // Belt and braces under prefers-reduced-motion: no transitions at all.
              "motion-reduce:!transition-none",
              cardClassName
            )}
          >
            <article
              tabIndex={0}
              aria-labelledby={titleId}
              className={cn(
                "group/card relative isolate flex h-full min-h-[280px] overflow-hidden rounded-2xl border border-navy-light/25 bg-navy-deep sm:min-h-[340px] xl:min-h-[400px]",
                "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              )}
            >
              <img
                src={item.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover/card:scale-105 motion-safe:group-focus-within/card:scale-105"
              />
              {/* Navy gradient: transparent at the top, near-solid at the bottom. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-navy-deep/95 via-navy-deep/45 to-transparent"
              />
              <div className="relative flex h-full flex-col justify-end p-5 sm:p-6 xl:p-7">
                <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-white/75">
                  {item.subtitle}
                </p>
                <h3
                  id={titleId}
                  className="mt-1.5 font-heading text-2xl font-semibold leading-tight text-white"
                >
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="mt-2 max-w-[36ch] text-[13px] leading-relaxed text-white/85 sm:text-sm">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
