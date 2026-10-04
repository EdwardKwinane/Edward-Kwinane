import { useEffect } from "react";
import { useSiteSettings } from "@/data/site";

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function Seo({ title, description, path = "/", type = "website" }: SeoProps) {
  const settings = useSiteSettings();
  const metaDescription = description ?? settings.siteDescription;

  useEffect(() => {
    const fullTitle =
      title === settings.siteTitle ? title : `${title} — ${settings.ownerName}`;
    document.title = fullTitle;

    const url = `${window.location.origin}${path}`;
    setMeta("name", "description", metaDescription);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", metaDescription);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", url);
    setMeta("property", "og:site_name", settings.ownerName);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", metaDescription);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);
  }, [title, metaDescription, path, type, settings.ownerName, settings.siteTitle]);

  return null;
}