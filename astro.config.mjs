import { defineConfig } from "astro/config";
import alpine from "@astrojs/alpinejs";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  redirects: {
    "/pagebuilder/pagebuilder/": "/website-builder/pagebuilder/",
    "/themebuilder/colors/": "/website-builder/colors/",
    "/themebuilder/themebuilder/": "/website-builder/themebuilder/",
    "/typographybuilder/typograhybuilding/":
      "/website-builder/typographybuilder/",
    "/website-builder/typograhybuilding/":
      "/website-builder/typographybuilder/",
  },
  integrations: [alpine({ entrypoint: "/src/entrypoint" })],
  vite: {
    plugins: [tailwindcss()],
  },
});
