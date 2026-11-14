export const navigation = [
  { label: "Home", href: "/" },
  { label: "Companies", href: "/companies/" },
  { label: "Projects", href: "/projects/" },
  { label: "Partners", href: "/partners/" },
  { label: "About", href: "/about/" },
] as const;

export const companies = [
  { name: "Exclusive House Cleaning", websiteUrl: null },
  { name: "Exclusive Home Remodeling", websiteUrl: null },
  { name: "Exclusive Recycling", websiteUrl: null },
  { name: "Exclusive Carpet Cleaning", websiteUrl: null },
] as const;

export interface Project {
  title: string;
  summary: string;
  imageUrl?: string;
}

export interface Partner {
  name: string;
  summary: string;
  websiteUrl?: string;
}

export const projects: Project[] = [];
export const partners: Partner[] = [];

export const pageDescriptions = {
  home: "A central directory for Exclusive Group.",
  companies: "The companies currently listed in the Exclusive Group directory.",
  projects:
    "Project details and images will be added when verified content is available.",
  partners:
    "Partner information will be added when verified content is available.",
  about:
    "A brief overview of Exclusive Group based on information currently provided.",
} as const;
