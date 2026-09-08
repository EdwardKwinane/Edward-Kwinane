import type { PortableTextBlock } from "@portabletext/types";

/** Raw Sanity image field (reference + optional alt). */
export interface SanityImage {
  _type: "image";
  asset?: { _ref?: string };
  alt?: string;
  caption?: string;
}

/** Raw technology document as stored in the Content Lake. */
export interface SanityTechnology {
  _id: string;
  _type: "technology";
  name: string;
  slug?: { current?: string };
  category?: string;
  description?: string;
  website?: string;
  displayOrder?: number;
}

/** Raw project document. */
export interface SanityProject {
  _id: string;
  _type: "project";
  title: string;
  slug?: { current?: string };
  shortDescription?: string;
  fullDescription?: string;
  /** Resolved by GROQ as coalesce(shortDescription, fullDescription, ""). */
  description?: string;
  coverImage?: SanityImage;
  category?: string;
  categories?: string[];
  status?: string;
  featured?: boolean;
  technologies?: Array<{ name?: string }>;
  related?: SanityProject[];
  problem?: string;
  requirements?: string;
  solution?: string;
  architecture?: string;
  implementation?: string;
  challenges?: string;
  results?: string;
  lessonsLearned?: string;
  githubUrl?: string;
  liveUrl?: string;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: SanityImage;
}

/** Raw blog post document. */
export interface SanityPost {
  _id: string;
  _type: "post";
  title: string;
  slug?: { current?: string };
  subtitle?: string;
  excerpt?: string;
  coverImage?: SanityImage;
  author?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  estimatedReadingTime?: number;
  body?: PortableTextBlock[];
  related?: SanityPost[];
  publishedAt?: string;
  updatedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: SanityImage;
}

/** Raw capability document. */
export interface SanityCapability {
  _id: string;
  _type: "capability";
  name: string;
  slug?: { current?: string };
  index?: string;
  eyebrow?: string;
  headline?: string;
  shortDescription?: string;
  description?: string;
  labels?: string[];
  flow?: { step?: string; detail?: string }[];
  icon?: string;
  category?: string;
  featured?: boolean;
  displayOrder?: number;
  ctaLabel?: string;
  ctaDestination?: string;
}

/** Raw experience / education / certification document. */
export interface SanityExperience {
  _id: string;
  _type: "experience";
  title: string;
  organization: string;
  type?: "work" | "education" | "certification";
  startDate?: string;
  endDate?: string;
  currentlyActive?: boolean;
  description?: string;
  credentialUrl?: string;
  organizationUrl?: string;
  skills?: string[];
  displayOrder?: number;
}

/** Raw testimonial document. */
export interface SanityTestimonial {
  _id: string;
  _type: "testimonial";
  clientName: string;
  company?: string;
  role?: string;
  quote: string;
  avatar?: SanityImage;
  featured?: boolean;
  displayOrder?: number;
}

/** Raw site settings singleton. */
export interface SanitySiteSettings {
  _id: string;
  _type: "siteSettings";
  siteTitle?: string;
  siteDescription?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  availabilityText?: string;
  email?: string;
  location?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  resumeUrl?: string;
  footerText?: string;
}