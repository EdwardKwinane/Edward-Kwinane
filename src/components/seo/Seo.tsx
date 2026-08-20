import { useEffect } from "react";

const SITE_NAME = "Edward Kwinane — AI Engineer & Digital Architect";
const DEFAULT_DESCRIPTION =
  "Edward Kwinane is an AI Engineer & Digital Architect specializing in AI voice agents, RAG systems, AI chatbots, AI agents and rapid full-stack product development.";

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

export default function Seo({ title, description = DEFAULT_DESCRIPTION, path = "/", type = "website" }: SeoProps) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} — Edward Kwinane`;
    document.title = fullTitle;

    const url = `${window.location.origin}${path}`;
    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", url);
    setMeta("property", "og:site_name", "Edward Kwinane");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);
  }, [title, description, path, type]);

  return null;
}