import { defineConfig } from "astro/config";
import alpine from "@astrojs/alpinejs";
import tailwindcss from "@tailwindcss/vite";

import partytown from "@astrojs/partytown";
import starlight from "@astrojs/starlight";

export default defineConfig({
  // CodersMill is hosted by Coders Mill at codersmill.com.
  site: "https://codersmill.com",
  output: "static",
  // No Astro dev toolbar on any page.
  devToolbar: { enabled: false },
  redirects: {
    "/about/": "/us/who-we-are/",
    "/blocks/": "/website-builder/display-blocks/",
    "/tools/": "/website-builder/",
    "/resources/docs/": "/docs/",
    "/pagebuilder/pagebuilder/": "/website-builder/page-builder/",
    "/themebuilder/colors/": "/website-builder/custom-colors/",
    "/website-builder/colors/": "/website-builder/custom-colors/",
    "/themebuilder/themebuilder/": "/website-builder/theme-builder/",
    "/typographybuilder/typograhybuilding/":
      "/website-builder/typography-builder/",
    "/website-builder/typograhybuilding/":
      "/website-builder/typography-builder/",
    "/website-builder/formbuilder/": "/website-builder/form-builder/",
    "/website-builder/pagebuilder/": "/website-builder/page-builder/",
    "/website-builder/sitenavbuilder/": "/website-builder/sitenav-builder/",
    "/website-builder/themebuilder/": "/website-builder/theme-builder/",
    "/website-builder/typographybuilder/":
      "/website-builder/typography-builder/",
  },
  integrations: [
    alpine({ entrypoint: "/src/entrypoint" }),
    partytown(),
    // Documentation at /docs/, from src/content/docs/docs/.
    starlight({
      title: "CodersMill Docs",
      logo: {
        light: "./src/assets/logos/codersmill-logo.svg",
        dark: "./src/assets/logos/codersmill-logo-dark.svg",
        alt: "CodersMill",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/sonaventures",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/docs/" },
        {
          label: "Website Builder",
          items: [{ autogenerate: { directory: "docs/website-builder" } }],
        },
      ],
      // The rest of the site keeps its own 404 page.
      disable404Route: true,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
