export interface Technology {
  label: string;
  description?: string;
}

export interface Capability {
  id: string;
  name?: string;
  index: string;
  eyebrow: string;
  headline: string;
  shortDescription?: string;
  description: string;
  labels: string[];
  previewLabels?: string[];
  featured?: boolean;
  flow: { step: string; detail: string }[];
}

export interface ArchitectureLayer {
  name: string;
  detail: string;
}