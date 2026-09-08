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

/** Smaller variant used for cards and previews. */
export function cardImageUrl(source: SanityImageSource | undefined | null) {
  return imageUrl(source, 640);
}

/** Alt text helper — reads the store/editor-friendly alt field when present. */
export function altText(source: { alt?: string } | undefined | null, fallback = ""): string {
  return source?.alt?.trim() || fallback;
}