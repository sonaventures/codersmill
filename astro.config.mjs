import { defineConfig } from "astro/config";
import alpine from "@astrojs/alpinejs";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  redirects: {
    "/pagebuilder/pagebuilder/": "/website-builder/page-builder/",
    "/themebuilder/colors/": "/website-builder/colors/",
    "/themebuilder/themebuilder/": "/website-builder/theme-builder/",
    "/typographybuilder/typograhybuilding/":
      "/website-builder/typography-builder/",
    "/website-builder/typograhybuilding/":
      "/website-builder/typography-builder/",
    "/website-builder/formbuilder/": "/website-builder/form-builder/",
    "/website-builder/pagebuilder/": "/website-builder/page-builder/",
    "/website-builder/sitenavbuilder/": "/website-builder/sitenav-builder/",
    "/website-builder/themebuilder/": "/website-builder/theme-builder/",
    "/website-builder/typographybuilder/": "/website-builder/typography-builder/",
  },
  integrations: [alpine({ entrypoint: "/src/entrypoint" })],
  vite: {
    plugins: [tailwindcss()],
  },
});
