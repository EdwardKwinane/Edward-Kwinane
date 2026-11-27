import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getSanitySiteSettings } from "@/lib/sanity/queries";

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  ownerName: string;
  roleLine: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroTags: string[];
  availabilityText: string;
  footerTagline: string;
  footerText: string;
  footerSignoff: string;
  email: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
}

/**
 * Baseline copy. The seed script writes these values into the siteSettings
 * document, and the runtime uses them whenever a field is missing from the
 * CMS, so a partially filled document can never blank the site.
 */
export const siteDefaults: SiteSettings = {
  siteTitle: "Edward Kwinane | AI Implementation Specialist",
  siteDescription:
    "Explore Edward Kwinane's approach to AI implementation, connecting business opportunities with AI strategy, engineering, integration and practical solutions.",
  ownerName: "Edward Kwinane",
  roleLine: "AI Implementation Specialist",
  heroHeadline: "Turning AI opportunities into practical solutions.",
  heroSubheadline:
    "I explore how artificial intelligence can solve real problems, improve workflows and support better ways of working. My approach brings together strategic thinking and technical execution — from identifying opportunities and designing solutions to building, integrating and validating them.",
  heroTags: ["Voice Agents", "RAG Systems", "AI Chatbots", "AI Agents", "Full-Stack"],
  availabilityText: "Available for select projects",
  footerTagline: "AI strategy, engineering and integration from opportunity to implementation.",
  footerText: "Designed & engineered with an AI-native workflow.",
  footerSignoff: "Concept → Architecture → Build → Ship",
  email: "",
  location: "",
  linkedinUrl: "https://www.linkedin.com/in/edward-kwinane",
  githubUrl: "https://github.com/edwardkwinane",
  twitterUrl: "",
};

/**
 * Approved Phase 1 identity. These fields are owned by the codebase, so a
 * stale CMS document cannot put the previous role or product-builder copy
 * back on the public site. Other siteSettings fields still come from Sanity.
 */
const IDENTITY_OVERRIDES: Pick<
  SiteSettings,
  | "siteTitle"
  | "siteDescription"
  | "roleLine"
  | "heroHeadline"
  | "heroSubheadline"
  | "footerTagline"
> = {
  siteTitle: siteDefaults.siteTitle,
  siteDescription: siteDefaults.siteDescription,
  roleLine: siteDefaults.roleLine,
  heroHeadline: siteDefaults.heroHeadline,
  heroSubheadline: siteDefaults.heroSubheadline,
  footerTagline: siteDefaults.footerTagline,
};

function applyIdentityOverride(settings: SiteSettings): SiteSettings {
  return { ...settings, ...IDENTITY_OVERRIDES };
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Merges the CMS document over the defaults.
 *
 * The siteSettings singleton is identity/copy chrome, not content: when the
 * read fails for any reason (unconfigured, outage, malformed, legitimately
 * missing document) the site must still render, so it falls back to the
 * built-in defaults and says why in the console. The failure is never
 * reported as "empty site".
 */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const result = await getSanitySiteSettings();
  if (result.status !== "success") {
    if (result.status !== "not-found") {
      console.warn(
        `[sanity] site settings unavailable (${result.status}); using built-in defaults`
      );
    }
    return applyIdentityOverride(siteDefaults);
  }
  const doc = result.data;
  if (!doc) return applyIdentityOverride(siteDefaults);

  const tags = doc.heroTags?.filter((tag) => typeof tag === "string" && tag.trim().length > 0) ?? [];

  return applyIdentityOverride({
    siteTitle: nonEmpty(doc.siteTitle) ?? siteDefaults.siteTitle,
    siteDescription: nonEmpty(doc.siteDescription) ?? siteDefaults.siteDescription,
    ownerName: nonEmpty(doc.ownerName) ?? siteDefaults.ownerName,
    roleLine: nonEmpty(doc.roleLine) ?? siteDefaults.roleLine,
    heroHeadline: nonEmpty(doc.heroHeadline) ?? siteDefaults.heroHeadline,
    heroSubheadline: nonEmpty(doc.heroSubheadline) ?? siteDefaults.heroSubheadline,
    heroTags: tags.length ? tags : siteDefaults.heroTags,
    availabilityText: nonEmpty(doc.availabilityText) ?? siteDefaults.availabilityText,
    footerTagline: nonEmpty(doc.footerTagline) ?? siteDefaults.footerTagline,
    footerText: nonEmpty(doc.footerText) ?? siteDefaults.footerText,
    footerSignoff: nonEmpty(doc.footerSignoff) ?? siteDefaults.footerSignoff,
    email: nonEmpty(doc.email) ?? "",
    location: nonEmpty(doc.location) ?? "",
    linkedinUrl: nonEmpty(doc.linkedinUrl) ?? "",
    githubUrl: nonEmpty(doc.githubUrl) ?? "",
    twitterUrl: nonEmpty(doc.twitterUrl) ?? "",
  });
}

const SiteSettingsContext = createContext<SiteSettings>(siteDefaults);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(siteDefaults);

  useEffect(() => {
    let active = true;
    fetchSiteSettings().then((next) => {
      if (active) setSettings(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => settings, [settings]);
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

/** Site-wide copy. Starts at the defaults and updates once the CMS responds. */
export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}