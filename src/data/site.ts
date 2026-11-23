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

export interface NavItem {
  label: string;
  href: string;
  /** Shown on the section page, and on the page until it is written. */
  description: string;
  /** Another site, opened in a new tab. */
  external?: boolean;
}

export interface NavSection {
  label: string;
  /** The section's own page, which lists its items. */
  href: string;
  description: string;
  items: NavItem[];
}

// The main menu: each section has its own page and a submenu. Pages that are
// not written yet show a placeholder (src/components/codersmill/placeholder-page.astro).
export const navigation: NavSection[] = [
  {
    label: "Services",
    href: "/services/",
    description: "How Coders Mill helps, from the first conversation on.",
    items: [
      {
        label: "Consultation",
        href: "/services/consultation/",
        description: "Talk through your goals and plan the right next step.",
      },
      {
        label: "Design",
        href: "/services/design/",
        description: "Shape how your website and systems look and work.",
      },
      {
        label: "Implementation",
        href: "/services/implementation/",
        description: "Build and set up what was planned and designed.",
      },
      {
        label: "Training",
        href: "/services/training/",
        description: "Learn to run and update what was built.",
      },
      {
        label: "Support",
        href: "/services/support/",
        description: "Help when you need it, after launch.",
      },
    ],
  },
  {
    label: "Projects",
    href: "/projects/",
    description: "The kinds of projects Coders Mill takes on.",
    items: [
      {
        label: "Websites",
        href: "/projects/websites/",
        description: "Websites built to be easy to run and update.",
      },
      {
        label: "Networking",
        href: "/projects/networking/",
        description: "Networks that keep your people and devices connected.",
      },
      {
        label: "Back office",
        href: "/projects/backoffice/",
        description: "The systems behind the day-to-day running of a business.",
      },
      {
        label: "IoT",
        href: "/projects/iot/",
        description: "Connected devices and the data they collect.",
      },
      {
        label: "Automation",
        href: "/projects/automation/",
        description: "Repetitive work, handled automatically.",
      },
    ],
  },
  {
    label: "Tools",
    // The website builder's own home lists its tools.
    href: "/website-builder/",
    description: "The tools Coders Mill builds.",
    items: [
      {
        label: "Website builder",
        href: "/website-builder/",
        description: "Build and style Astro websites from ready-made blocks.",
      },
    ],
  },
  {
    label: "Resources",
    href: "/resources/",
    description: "Reading, documentation, and code.",
    items: [
      {
        label: "Blog",
        href: "/resources/blog/",
        description: "News and articles from Coders Mill.",
      },
      {
        label: "Docs",
        href: "/resources/docs/",
        description: "Documentation for the Coders Mill tools.",
      },
      {
        label: "Public GitHub",
        href: "https://github.com/sonaventures",
        description: "Coders Mill's public code on GitHub.",
        external: true,
      },
    ],
  },
  {
    label: "Us",
    href: "/us/",
    description: "Who Coders Mill is and how it works.",
    items: [
      {
        label: "Who we are",
        href: "/us/who-we-are/",
        description: "The people and the story behind Coders Mill.",
      },
      {
        label: "Mission & philosophy",
        href: "/us/mission/",
        description: "What Coders Mill sets out to do, and why.",
      },
      {
        label: "Our approach",
        href: "/us/our-approach/",
        description: "How a project runs, from start to finish.",
      },
      {
        label: "The squad",
        href: "/us/the-squad/",
        description: "Meet the team.",
      },
      {
        label: "Join us",
        href: "/us/join-us/",
        description: "Work with Coders Mill.",
      },
      {
        label: "Contact us",
        href: "/us/contact/",
        description: "Get in touch.",
      },
    ],
  },
];

// The call to action beside the menu.
export const builderLink = {
  label: "Open the builder",
  href: "/website-builder/",
} as const;

/** The section and item for a path, e.g. "/services/design/". */
export function findNavItem(path: string) {
  for (const section of navigation)
    for (const item of section.items)
      if (item.href === path) return { section, item };
  return null;
}

export const pageDescriptions = {
  home: `Build and style Astro websites with ${builderName}, on ${siteName}.`,
  about: `About ${siteName}, the home of ${builderName}, and how its tools work.`,
} as const;
