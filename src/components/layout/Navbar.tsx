import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
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

/** Scroll distance past which the pill collapses while scrolling down. */
const COLLAPSE_AFTER = 150;
/** Upward scroll needed to re-expand, measured from where it collapsed. */
const REEXPAND_AFTER = 80;
/** Distance from the top where the pill is always expanded. */
const ALWAYS_EXPANDED = 40;
/** Diameter of the collapsed circular menu button (also the tap target). */
const COLLAPSED_SIZE = 48;
/** Matches Tailwind's `lg` breakpoint, where the inline links appear. */
const DESKTOP_QUERY = "(min-width: 1024px)";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export function Navbar() {
  const settings = useSiteSettings();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Natural width of the expanded row, so `auto` never has to be measured mid-animation. */
  const [expandedWidth, setExpandedWidth] = useState<number | null>(null);

  const pillRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const circleRef = useRef<HTMLButtonElement>(null);
  // Mirrors of `collapsed` / `sheetOpen` for the scroll callback, which runs
  // outside React's render cycle and must not read stale props.
  const collapsedRef = useRef(false);
  const sheetOpenRef = useRef(false);
  const lastY = useRef(0);
  const collapseY = useRef(0);
  // Scroll position at the last manual re-expand, so a deliberate click is not
  // undone by the next downward nudge.
  const rearmY = useRef(0);
  // Which control should receive focus once the next render commits.
  const pendingFocus = useRef<"circle" | "brand" | null>(null);

  const setCollapsedState = useCallback((next: boolean) => {
    if (collapsedRef.current === next) return;

    // Record the intent now: hiding the focused control drops focus to <body>
    // as soon as React commits, so the hand-off has to be planned in advance.
    const active = document.activeElement;
    if (active instanceof HTMLElement && pillRef.current?.contains(active)) {
      pendingFocus.current = !next && active === circleRef.current ? "brand" : next ? "circle" : null;
    }

    collapsedRef.current = next;
    setCollapsed(next);
  }, []);

  // The expanded row becomes `visibility: hidden` when collapsed, and the menu
  // button is hidden when expanded, so focus is moved to whichever survives.
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "circle") circleRef.current?.focus();
    else if (target === "brand") brandRef.current?.focus();
  }, [collapsed]);

  /** User-initiated re-expand: give them COLLAPSE_AFTER px before it can hide again. */
  const expand = useCallback(() => {
    collapseY.current = 0;
    rearmY.current = window.scrollY;
    setCollapsedState(false);
  }, [setCollapsedState]);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = lastY.current;
    lastY.current = y;

    // Never fight the user while a dialog owns the screen.
    if (sheetOpenRef.current) return;

    if (y <= ALWAYS_EXPANDED) {
      collapseY.current = 0;
      rearmY.current = 0;
      setCollapsedState(false);
      return;
    }

    if (collapsedRef.current) {
      if (y < collapseY.current - REEXPAND_AFTER) setCollapsedState(false);
      return;
    }

    if (y > previous && y >= COLLAPSE_AFTER && y >= rearmY.current + COLLAPSE_AFTER) {
      collapseY.current = y;
      setCollapsedState(true);
    }
  });

  // A route change scrolls to the top; reset so the pill is never left collapsed.
  useEffect(() => {
    lastY.current = 0;
    collapseY.current = 0;
    rearmY.current = 0;
    setCollapsedState(false);
  }, [location.pathname, setCollapsedState]);

  // Track the expanded row's natural border-box width, which is what the pill
  // animates to. The row is `w-max`, so its size does not depend on the pill's
  // current width and the measurement cannot feed back into it. `contentRect`
  // would exclude the row's own padding and squeeze its children.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      const next = row.getBoundingClientRect().width;
      setExpandedWidth((prev) => (prev === null || Math.abs(prev - next) > 0.5 ? next : prev));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(row);
    // Web fonts land after first layout and change the measured width, so take
    // one more reading once they are ready rather than trusting the fallback.
    document.fonts?.ready.then(measure, () => {});

    return () => observer.disconnect();
  }, []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      sheetOpenRef.current = open;
      setSheetOpen(open);
      if (open) expand();
    },
    [expand]
  );

  const handleCollapsedClick = useCallback(() => {
    if (isDesktop) {
      // Desktop already shows every link inline, so re-open the pill.
      expand();
    } else {
      // Small screens have no inline links, so open the menu sheet instead.
      handleSheetOpenChange(true);
    }
  }, [isDesktop, expand, handleSheetOpenChange]);

  const widthTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 30, mass: 1 };
  const fadeTransition = { duration: reduceMotion ? 0 : 0.16, ease: "easeOut" as const };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative whitespace-nowrap rounded-pill px-2.5 py-2 text-sm font-medium transition-colors focus-ring hover:text-accent",
      isActive ? "text-accent-dark" : "text-ink/75"
    );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 sm:pt-5">
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <motion.div
          ref={pillRef}
          initial={false}
          animate={expandedWidth === null ? undefined : { width: collapsed ? COLLAPSED_SIZE : expandedWidth }}
          transition={widthTransition}
          style={{ maxWidth: "calc(100vw - 2rem)" }}
          className={cn(
            "pointer-events-auto relative flex h-14 items-center overflow-hidden rounded-pill",
            "border border-surface-pale3 bg-surface-alt/80 shadow-[0_10px_30px_-12px_rgba(11,28,48,0.28)] backdrop-blur-xl"
          )}
        >
          {/* Expanded row. `invisible` (not `hidden`) keeps its measured width
              stable while removing it from the tab order and hit testing, and
              `shrink-0` stops the pill's max-width clamp from squeezing it —
              otherwise the clamp and the measurement would feed back on each
              other and lock the pill at the clamp. The brand absorbs any
              squeeze instead, so navigation links are never clipped. */}
          <motion.div
            ref={rowRef}
            initial={false}
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={fadeTransition}
            aria-hidden={collapsed || undefined}
            className={cn(
              "flex w-max shrink-0 items-center gap-3 px-2 sm:gap-4 xl:gap-6",
              collapsed ? "invisible pointer-events-none" : "visible"
            )}
          >
            <Link
              ref={brandRef}
              to="/"
              className="group flex min-w-0 shrink flex-col overflow-hidden leading-none focus-ring rounded-sm"
              aria-label={`${settings.ownerName} home`}
            >
              <span className="whitespace-nowrap font-heading text-[15px] font-bold uppercase tracking-wide text-navy transition-colors group-hover:text-accent-dark">
                {settings.ownerName}
              </span>
              <span className="mt-0.5 hidden whitespace-nowrap font-technical text-[9px] font-semibold uppercase tracking-tech text-ink/50 sm:block">
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
                          "absolute inset-x-2.5 bottom-1 h-0.5 rounded-pill bg-accent transition-opacity duration-200",
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
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="whitespace-nowrap font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/60">
                {settings.availabilityText}
              </span>
            </span>

            <ThemeToggle className="shrink-0" />

            <Button asChild variant="accent" size="sm" className="hidden h-10 shrink-0 lg:inline-flex">
              <Link to="/contact">
                Let&rsquo;s talk
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>

            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 shrink-0 rounded-pill lg:hidden"
                aria-label={sheetOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={sheetOpen}
                aria-controls={MOBILE_NAV_ID}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
          </motion.div>

          {/* Collapsed circular menu button */}
          <motion.button
            ref={circleRef}
            type="button"
            onClick={handleCollapsedClick}
            initial={false}
            animate={{ opacity: collapsed ? 1 : 0, scale: collapsed ? 1 : 0.6 }}
            transition={widthTransition}
            whileHover={collapsed && !reduceMotion ? { scale: 1.07 } : undefined}
            whileTap={collapsed && !reduceMotion ? { scale: 0.96 } : undefined}
            style={{ x: "-50%", y: "-50%" }}
            tabIndex={collapsed ? 0 : -1}
            aria-hidden={!collapsed || undefined}
            aria-haspopup={!isDesktop ? "dialog" : undefined}
            aria-expanded={!isDesktop && collapsed ? sheetOpen : undefined}
            aria-controls={!isDesktop && collapsed ? MOBILE_NAV_ID : undefined}
            aria-label={isDesktop ? "Expand navigation menu" : "Open navigation menu"}
            className={cn(
              "absolute left-1/2 top-1/2 flex h-12 w-12 items-center justify-center rounded-pill text-navy focus-ring",
              collapsed ? "pointer-events-auto visible" : "pointer-events-none invisible"
            )}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </motion.button>
        </motion.div>

        <SheetContent id={MOBILE_NAV_ID}>
          <SheetTitle className="font-heading text-lg font-bold text-navy">
            {settings.ownerName}
          </SheetTitle>
          <SheetDescription className="font-technical text-[11px] font-semibold uppercase tracking-tech text-ink/50">
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
                      "rounded-md px-3 py-3 font-heading text-base font-semibold transition-colors",
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
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/60">
                  {settings.availabilityText}
                </span>
              </span>
              <ThemeToggle />
            </div>
            <SheetClose asChild>
              <Button asChild variant="accent">
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