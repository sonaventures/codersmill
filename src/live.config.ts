// EmDash's live content collection: the blog posts and anything else made in
// the EmDash admin, read with getEmDashCollection() and getEmDashEntry().
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
