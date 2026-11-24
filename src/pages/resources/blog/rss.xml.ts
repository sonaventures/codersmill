import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPosts, postPath } from "../../../data/blog";
import { host, siteName } from "../../../data/site";

// The blog's RSS feed, at /resources/blog/rss.xml, read from EmDash.
export const prerender = false;

export async function GET(context: APIContext) {
  const posts = (await getPosts(20)).filter((post) => post.data.publishedAt);
  return rss({
    title: `${siteName} Blog`,
    description: `News and articles from ${host.name}.`,
    site: context.site ?? host.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt ?? "",
      pubDate: post.data.publishedAt!,
      categories: (post.data.terms?.tag ?? []).map((tag) => tag.label),
      link: postPath(post),
    })),
    customData: "<language>en-us</language>",
    stylesheet: false,
  });
}
