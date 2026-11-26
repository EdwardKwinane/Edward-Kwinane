import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useSiteSettings } from "@/data/site";
import { openCookiePreferences } from "@/lib/consent/cookieConsent";

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
  const [contactFocused, setContactFocused] = useState(false);
  const [emailHref, setEmailHref] = useState<string | null>(null);
  const socialLinks = [
    { href: settings.githubUrl, label: "GitHub", Icon: Github },
    { href: settings.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
  ].filter((link) => link.href);

  // The CMS email arrives after first paint. Keep the contact affordance in
  // this slot from the very first render so the async value can only change
  // its label/href, never the footer's height. If the link currently has focus,
  // defer the swap until blur so its destination and accessible name do not
  // change underneath keyboard or assistive-technology users.
  useEffect(() => {
    if (contactFocused) return;
    setEmailHref(settings.email || null);
  }, [settings.email, contactFocused]);

  const emailDeferred = Boolean(settings.email && contactFocused && !emailHref);
  const contactClass =
    "mt-4 inline-flex min-h-[24px] items-center text-sm text-accent-dark hover:underline focus-ring";
  const contactFocusProps = {
    onFocus: () => setContactFocused(true),
    onBlur: () => setContactFocused(false),
  };

  return (
    <footer className="border-t border-surface-pale3 bg-surface-alt">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-heading text-lg font-bold text-navy">{settings.ownerName}</p>
            <p className="mt-1 font-technical text-[11px] font-semibold uppercase tracking-tech text-ink/65">
              {settings.roleLine}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/65">
              {settings.footerTagline}
            </p>
            {emailHref ? (
              <a href={`mailto:${emailHref}`} className={contactClass} {...contactFocusProps}>
                {emailHref}
              </a>
            ) : (
              <Link to="/contact" className={contactClass} {...contactFocusProps}>
                Contact me
              </Link>
            )}
            {/* A plain aria-live region announces the deferred swap without
                claiming the form's `role="status"` loading region. */}
            <span
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
              data-contact-status
            >
              {emailDeferred
                ? "Email contact option is now available; it will replace the contact link after this link loses focus."
                : ""}
            </span>
          </div>

          <nav className="md:col-span-4" aria-label="Footer">
            <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/65">
              Navigation
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  {/* inline-flex + min-h keeps each target 24px+ tall, the WCAG
                      2.5.8 (AA) minimum. As a bare inline text link these
                      measured 17px tall on mobile. */}
                  <Link
                    to={item.to}
                    className="inline-flex min-h-[24px] items-center rounded-sm text-sm text-ink/70 transition-colors hover:text-accent focus-ring"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="font-technical text-[11px] font-bold uppercase tracking-tech text-ink/65">
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
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-surface-pale4 text-ink/65 transition-colors hover:border-navy hover:text-navy focus-ring"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
            <p className="mt-6 text-xs text-ink/65">{settings.footerText}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-surface-pale3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink/65">
            © {new Date().getFullYear()} {settings.ownerName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex min-h-[24px] min-w-[24px] items-center rounded-sm text-xs text-ink/65 underline-offset-2 transition-colors hover:text-accent focus-ring"
            >
              Cookie settings
            </button>
            <p className="font-technical text-[10px] uppercase tracking-tech text-ink/65">
              {settings.footerSignoff}
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}