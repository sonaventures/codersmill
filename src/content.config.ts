import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  // Starlight's documentation pages, in src/content/docs/ (served at /docs/).
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
