import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetDescription,
} from "@/components/ui/Sheet";
import { Container } from "@/components/ui/Container";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const navItems = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Capabilities", to: "/capabilities" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(header, {
        height: scrolled ? 64 : 84,
        duration: 0.35,
        ease: "power2.out",
      });
    }, header);
    return () => ctx.revert();
  }, [scrolled]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-sm font-medium transition-colors hover:text-accent",
      isActive ? "text-accent" : "text-ink/75"
    );

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled
          ? "border-b border-surface-pale-3 bg-surface-alt/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <Container className="flex h-full items-center justify-between gap-4">
        <Link to="/" className="group flex flex-col leading-none" aria-label="Edward Kwinane home">
          <span className="font-heading text-[15px] font-bold tracking-wide text-navy group-hover:text-accent-dark transition-colors">
            EDWARD KWINANE
          </span>
          <span className="mt-0.5 font-technical text-[9px] font-semibold uppercase tracking-tech text-ink/50">
            AI Engineer · Digital Architect
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <span className="hidden xl:inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/60">
              Available for select projects
            </span>
          </span>
          <ThemeToggle />
          <Button asChild variant="accent" size="sm" className="h-10">
            <Link to="/contact">
              Let's talk
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <MobileNav />
      </Container>
    </header>
  );
}

function MobileNav() {
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="font-heading text-lg font-bold text-navy">
          Edward Kwinane
        </SheetTitle>
        <SheetDescription className="font-technical text-[11px] font-semibold uppercase tracking-tech text-ink/50">
          AI Engineer · Digital Architect
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
                    isActive ? "bg-surface-pale text-accent" : "text-navy hover:bg-surface-pale"
                  )
                }
              >
                {item.label}
              </NavLink>
            </SheetClose>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 border-t border-surface-pale-3 pt-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-technical text-[10px] font-semibold uppercase tracking-tech text-ink/60">
                Available for select projects
              </span>
            </span>
            <ThemeToggle />
          </div>
          <SheetClose asChild>
            <Button asChild variant="accent">
              <Link to="/contact">
                Let's talk
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}