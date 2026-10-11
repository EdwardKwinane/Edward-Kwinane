import { useEffect, useMemo } from "react";
import { useSiteSettings } from "@/data/site";

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
  /** JSON-LD graph nodes for this route. Replaces the previous route's data. */
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const OG_IMAGE = "/og-image.png";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Creates the canonical link when it is absent. The previous implementation only
 * updated an existing element, so no canonical was ever emitted — index.html did
 * not ship one either.
 */
function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Writes JSON-LD into a single managed script tag. One tag is reused rather than
 * appended per route, so client-side navigation cannot leave stale schemas behind.
 */
function setStructuredData(data: Record<string, unknown> | null) {
  const ID = "structured-data";
  let el = document.getElementById(ID) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = ID;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function Seo({
  title,
  description,
  path = "/",
  type = "website",
  structuredData,
}: SeoProps) {
  const settings = useSiteSettings();
  const metaDescription = description ?? settings.siteDescription;

  // Serialising gives a stable dependency, so a parent re-render (e.g. the blog
  // category filter) does not rewrite every meta tag on the page.
  const structuredJson = useMemo(
    () => (structuredData ? JSON.stringify(structuredData) : null),
    [structuredData]
  );

  useEffect(() => {
    const fullTitle =
      title === settings.siteTitle ? title : `${title} — ${settings.ownerName}`;
    document.title = fullTitle;

    // Derived from the live origin rather than hard-coded, so this keeps working
    // if a custom domain is attached to the deployment later.
    const url = `${window.location.origin}${path}`;
    const imageUrl = `${window.location.origin}${OG_IMAGE}`;

    setCanonical(url);
    setMeta("name", "description", metaDescription);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", metaDescription);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", url);
    setMeta("property", "og:site_name", settings.ownerName);
    setMeta("property", "og:image", imageUrl);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:alt", fullTitle);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", metaDescription);
    setMeta("name", "twitter:image", imageUrl);
    setMeta("name", "twitter:image:alt", fullTitle);

    // Every route carries a Person node for the owner; route-specific nodes are
    // appended, so a page only declares what is unique to it.
    const person: Record<string, unknown> = {
      "@type": "Person",
      "@id": `${window.location.origin}/#person`,
      name: settings.ownerName,
      jobTitle: settings.roleLine,
      url: window.location.origin,
      description: settings.siteDescription,
    };
    const sameAs = [settings.linkedinUrl, settings.githubUrl, settings.twitterUrl].filter(
      Boolean
    );
    if (sameAs.length) person.sameAs = sameAs;

    const nodes: Record<string, unknown>[] = [person];
    if (structuredJson) nodes.push(...(JSON.parse(structuredJson) as Record<string, unknown>[]));
    setStructuredData({ "@context": "https://schema.org", "@graph": nodes });
  }, [
    title,
    metaDescription,
    path,
    type,
    structuredJson,
    settings.ownerName,
    settings.siteTitle,
    settings.siteDescription,
    settings.roleLine,
    settings.linkedinUrl,
    settings.githubUrl,
    settings.twitterUrl,
  ]);

  return null;
}