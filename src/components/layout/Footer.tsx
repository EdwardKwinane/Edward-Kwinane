import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useSiteSettings } from "@/data/site";

const navItems = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Capabilities", to: "/capabilities" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

export function Footer() {
  const settings = useSiteSettings();
  const socialLinks = [
    { href: settings.githubUrl, label: "GitHub", Icon: Github },
    { href: settings.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
  ].filter((link) => link.href);

  return (
    <footer className="border-t border-surface-pale-3 bg-surface-alt">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-heading text-lg font-bold text-navy">{settings.ownerName}</p>
            <p className="mt-1 font-technical text-[11px] font-semibold uppercase tracking-tech text-ink/50">
              {settings.roleLine}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/60">
              {settings.footerTagline}
            </p>
            {settings.email ? (
              <a
                href={`mailto:${settings.email}`}
                className="mt-4 inline-block text-sm text-accent hover:underline focus-ring"
              >
                {settings.email}
              </a>
            ) : null}
          </div>

          <nav className="md:col-span-4" aria-label="Footer">
            <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/50">
              Navigation
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-ink/70 transition-colors hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/50">
              Connect
            </p>
            <div className="mt-4 flex gap-3">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} profile`}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-surface-pale-4 text-ink/60 transition-colors hover:border-navy hover:text-navy focus-ring"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
            <p className="mt-6 text-xs text-ink/40">{settings.footerText}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-surface-pale-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink/40">
            © {new Date().getFullYear()} {settings.ownerName}. All rights reserved.
          </p>
          <p className="font-technical text-[10px] uppercase tracking-tech text-ink/40">
            {settings.footerSignoff}
          </p>
        </div>
      </Container>
    </footer>
  );
}