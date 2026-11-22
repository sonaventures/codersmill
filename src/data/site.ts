// The CodersMill site: its name, host, navigation, and page descriptions,
// shared by the layout, header, footer, and pages.
export const siteName = "CodersMill";

// The company that hosts CodersMill, at codersmill.com (also the `site` in
// astro.config.mjs).
export const host = {
  name: "Coders Mill",
  url: "https://codersmill.com",
} as const;

// The builder tools CodersMill is the home of, at /website-builder/.
export const builderName = "Website Builder";

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Tools", href: "/tools/" },
  { label: "Blocks", href: "/blocks/" },
  { label: "About", href: "/about/" },
  { label: "Open the builder", href: "/website-builder/" },
] as const;

export const pageDescriptions = {
  home: `Build and style Astro websites with ${builderName}, on ${siteName}.`,
  tools: `The ${siteName} tools, in the order you use them.`,
  blocks: `The ready-made HTML blocks ${siteName} builds pages from.`,
  about: `About ${siteName}, the home of ${builderName}, and how its tools work.`,
} as const;
