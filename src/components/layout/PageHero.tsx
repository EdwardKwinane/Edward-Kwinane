import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <section className={cn("bg-surface pt-32 pb-14 lg:pt-40 lg:pb-20", className)}>
      <div className="container-site">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-heading text-[28px] font-bold leading-[36px] text-navy sm:text-[32px] sm:leading-[40px] lg:text-[48px] lg:leading-[56px]">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/70 lg:text-lg">
              {description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}