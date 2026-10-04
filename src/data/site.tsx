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
  siteTitle: "Edward Kwinane — AI Engineer & Digital Architect",
  siteDescription:
    "Edward Kwinane is an AI Engineer & Digital Architect specializing in AI voice agents, RAG systems, AI chatbots, AI agents and rapid full-stack product development.",
  ownerName: "Edward Kwinane",
  roleLine: "AI Engineer · Digital Architect",
  heroHeadline: "I build AI-native products from concept to production.",
  heroSubheadline:
    "I design and build intelligent software systems across voice agents, RAG pipelines, AI chatbots and full-stack applications — turning complex ideas into production-ready products.",
  heroTags: ["Voice Agents", "RAG Systems", "AI Chatbots", "AI Agents", "Full-Stack"],
  availabilityText: "Available for select projects",
  footerTagline:
    "I build AI-native products from concept to production — voice agents, RAG systems, AI chatbots and full-stack applications.",
  footerText: "Designed & engineered with an AI-native workflow.",
  footerSignoff: "Concept → Architecture → Build → Ship",
  email: "",
  location: "",
  linkedinUrl: "https://linkedin.com/in/edwardkwinane",
  githubUrl: "https://github.com/edwardkwinane",
  twitterUrl: "",
};

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Merges the CMS document over the defaults. */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const doc = await getSanitySiteSettings();
  if (!doc) return siteDefaults;

  const tags = doc.heroTags?.filter((tag) => tag.trim().length > 0) ?? [];

  return {
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
  };
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