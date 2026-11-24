import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/**
 * The blog's posts, newest first. Drafts (draft: true) show while running the
 * dev server, so they can be previewed, and are left out of the built site.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection(
    "blog",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

export const blogPath = "/resources/blog/";
export const postPath = (post: Post) => `${blogPath}${post.id}/`;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
export const formatDate = (date: Date) => dateFormat.format(date);
