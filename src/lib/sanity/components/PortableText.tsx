import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { urlFor } from "@/lib/sanity/image";

/**
 * Renders Sanity Portable Text using the site's existing prose-article
 * typography, spacing and colors (see .prose-article in index.css).
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => {
      const id = headingId(children);
      return children ? <h2 id={id || undefined}>{children}</h2> : <></>;
    },
    h3: ({ children }) => (children ? <h3>{children}</h3> : <></>),
    blockquote: ({ children }) => (children ? <blockquote>{children}</blockquote> : <></>),
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => <code>{children}</code>,
    link: ({ value, children }) => {
      const href = typeof value?.href === "string" ? value.href : "#";
      const rel = href.startsWith("http") ? "noopener noreferrer" : undefined;
      return (
        <a href={href} target={rel ? "_blank" : undefined} rel={rel}>
          {children}
        </a>
      );
    },
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      const src = urlFor(value).width(1000).auto("format").url();
      const alt = typeof value?.alt === "string" ? value.alt : "";
      const caption = typeof value?.caption === "string" ? value.caption : "";
      return (
        <figure className="my-6">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full rounded-2xl border border-surface-pale-3"
          />
          {caption ? (
            <figcaption className="mt-2 text-center font-technical text-[11px] uppercase tracking-tech text-ink/45">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
    codeBlock: ({ value }) => {
      if (!value?.code) return null;
      return (
        <pre>
          <code>{value.code}</code>
        </pre>
      );
    },
  },
};

function headingId(children: unknown): string {
  const text = Array.isArray(children)
    ? children.map((child) => (typeof child === "string" ? child : "")).join(" ")
    : typeof children === "string"
      ? children
      : "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function PortableTextRenderer({ body }: { body?: PortableTextBlock[] }) {
  if (!body || body.length === 0) return null;
  return <PortableText value={body} components={components} />;
}