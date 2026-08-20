export interface Technology {
  label: string;
  description?: string;
}

export interface Capability {
  id: string;
  index: string;
  eyebrow: string;
  headline: string;
  description: string;
  labels: string[];
  flow: { step: string; detail: string }[];
}

export interface ArchitectureLayer {
  name: string;
  detail: string;
}