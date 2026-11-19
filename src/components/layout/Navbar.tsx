import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetDescription,
} from "@/components/ui/Sheet";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useSiteSettings } from "@/data/site";

const navItems = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Capabilities", to: "/capabilities" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

const MOBILE_NAV_ID = "mobile-navigation";

/**
 * Fixed top navigation bar.
 *
 * Deliberately static: the bar keeps one size, one position and one layout at
 * every scroll offset, and nothing in it moves, scales or animates. Links show
 * state through colour and the active underline only, and the mobile menu opens
 * without a transition.
 */
export function Navbar() {
  const settings = useSiteSettings();
  const [sheetOpen, setSheetOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative whitespace-nowrap rounded-pill px-2.5 py-2 text-sm font-medium focus-ring hover:text-accent",
      isActive ? "text-accent-dark" : "text-ink/75"
    );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 sm:pt-5">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <div
          className={cn(
            "pointer-events-auto relative flex h-14 w-max max-w-[calc(100vw-2rem)] items-center overflow-hidden rounded-pill",
            "border border-surface-pale3 bg-surface-alt/80 shadow-[0_10px_30px_-12px_rgba(11,28,48,0.28)] backdrop-blur-xl"
          )}
        >
          {/* The row is `w-max` so the pill always takes its natural width: no
              measurement, no resize, and the `max-w` clamp only ever applies on
              screens narrower than the row itself. The brand absorbs a squeeze
              so the navigation links are never clipped. */}
          <div className="flex w-max shrink-0 items-center gap-3 px-2 sm:gap-4 xl:gap-6">
            <Link
              to="/"
              className="group flex min-h-[24px] min-w-0 shrink flex-col justify-center overflow-hidden rounded-sm leading-none focus-ring"
              aria-label={`${settings.ownerName} home`}
            >
              <span className="whitespace-nowrap font-heading text-[15px] font-bold uppercase tracking-wide text-navy group-hover:text-accent-dark">
                {settings.ownerName}
              </span>
              <span className="mt-0.5 hidden whitespace-nowrap font-technical text-[9px] font-semibold uppercase tracking-tech text-ink/65 sm:block">
                {settings.roleLine}
              </span>
            </Link>

            <nav className="hidden items-center gap-5 lg:flex xl:gap-7" aria-label="Primary">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={navLinkClass}
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-2.5 bottom-1 h-0.5 rounded-pill bg-accent",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <span className="hidden shrink-0 items-center gap-2 2xl:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="whitespace-nowrap font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65">
                {settings.availabilityText}
              </span>
            </span>

            <ThemeToggle className="shrink-0" />

            <Button
              asChild
              variant="accent"
              size="sm"
              className="hidden h-10 shrink-0 transition-none duration-0 hover:translate-y-0 lg:inline-flex"
            >
              <Link to="/contact">
                Let&rsquo;s talk
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>

            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 shrink-0 rounded-pill transition-none duration-0 hover:translate-y-0 lg:hidden"
                aria-label={sheetOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={sheetOpen}
                aria-controls={MOBILE_NAV_ID}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
          </div>
        </div>

        <SheetContent id={MOBILE_NAV_ID}>
          <SheetTitle className="font-heading text-lg font-bold text-navy">
            {settings.ownerName}
          </SheetTitle>
          <SheetDescription className="font-technical text-[11px] font-semibold uppercase tracking-tech text-ink/65">
            {settings.roleLine}
          </SheetDescription>

          <nav className="mt-2 flex flex-col gap-1" aria-label="Mobile">
            {navItems.map((item) => (
              <SheetClose asChild key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-3 font-heading text-base font-semibold",
                      isActive ? "bg-surface-pale text-accent-dark" : "text-navy hover:bg-surface-pale"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </SheetClose>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-4 border-t border-surface-pale3 pt-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/65">
                  {settings.availabilityText}
                </span>
              </span>
              <ThemeToggle />
            </div>
            <SheetClose asChild>
              <Button
                asChild
                variant="accent"
                className="transition-none duration-0 hover:translate-y-0"
              >
                <Link to="/contact">
                  Let&rsquo;s talk
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
