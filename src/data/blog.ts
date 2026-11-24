// The CodersMill blog, from EmDash: posts are written in the EmDash admin
// (/_emdash) and read here on request. Drafts and scheduled posts only show
// once they are published.
import { getEmDashCollection } from "emdash";

export const blogPath = "/resources/blog/";

/** The published posts, newest first. */
export async function getPosts(limit = 50) {
  const { entries } = await getEmDashCollection("posts", {
    orderBy: { published_at: "desc" },
    limit,
  });
  return entries;
}

export type Post = Awaited<ReturnType<typeof getPosts>>[number];

export const postPath = (post: { id: string }) => `${blogPath}${post.id}/`;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
export const formatDate = (date: Date) => dateFormat.format(date);
