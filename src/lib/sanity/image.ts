import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";
import { client } from "./client";

const builder = imageUrlBuilder(client);

/**
 * Build a responsive Sanity image URL.
 * Source is anything an image reference resolves to (a document's image field).
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/** Full image URL for a specific width (keeps payloads proportional to layout). */
export function imageUrl(source: SanityImageSource | undefined | null, width = 1200) {
  if (!source) return undefined;
  return urlFor(source).width(width).auto("format").url();
}

/**
 * `imageUrl` for data that arrives from the CMS untyped.
 *
 * `@sanity/image-url` throws on a malformed asset `_ref` (for example a
 * reference copied into the dataset by hand). One bad image must not take a
 * whole listing down with it, so callers get `undefined` — which every card
 * already treats as "no cover" — instead of an exception.
 */
export function safeImageUrl(source: SanityImageSource | undefined | null, width = 1200) {
  try {
    return imageUrl(source, width);
  } catch {
    return undefined;
  }
}

/** Smaller variant used for cards and previews. */
export function cardImageUrl(source: SanityImageSource | undefined | null) {
  return imageUrl(source, 640);
}

/** Alt text helper — reads the store/editor-friendly alt field when present. */
export function altText(source: { alt?: string } | undefined | null, fallback = ""): string {
  return source?.alt?.trim() || fallback;
}