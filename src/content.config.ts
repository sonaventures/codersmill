import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  // Starlight's documentation pages, in src/content/docs/ (served at /docs/).
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // The CodersMill blog: a Markdown or MDX file per post in
  // src/content/blog/, served at /resources/blog/<file name>/. Posts with
  // draft: true are left out of the site and the feed.
  blog: defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().default("Coders Mill"),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
  }),
};
