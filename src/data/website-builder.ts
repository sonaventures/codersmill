// Header navigation for the builder pages, in workflow order: colors, then
// style groups in the theme builder, then pages that use those groups.
export const builderPages = [
  {
    label: "Home",
    href: "/website-builder/",
    description: "Explore the website builder tools.",
  },
  {
    label: "Color Editor",
    href: "/website-builder/custom-colors/",
    description: "Add, edit, and organize your color families.",
  },
  {
    label: "Theme Builder",
    href: "/website-builder/theme-builder/",
    description:
      "Create style groups and save them as classes for the page builder.",
  },
  {
    label: "Page Builder",
    href: "/website-builder/page-builder/",
    description:
      "Create a page from the project's Astro components and assign style groups.",
  },
  {
    label: "Site Nav Builder",
    href: "/website-builder/sitenav-builder/",
    description: "Build a website menu with a live header preview.",
  },
  {
    label: "Typography Builder",
    href: "/website-builder/typography-builder/",
    description: "Set site-wide typography and section-specific overrides.",
  },
  {
    label: "Form Builder",
    href: "/website-builder/form-builder/",
    description: "Style common form elements in a live sample form.",
  },
];
