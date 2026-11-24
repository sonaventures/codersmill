import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPosts, postPath } from "../../../data/blog";
import { host, siteName } from "../../../data/site";

// The blog's RSS feed, at /resources/blog/rss.xml.
export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: `${siteName} Blog`,
    description: `News and articles from ${host.name}.`,
    site: context.site ?? host.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      author: post.data.author,
      categories: post.data.tags,
      link: postPath(post),
    })),
    customData: "<language>en-us</language>",
    stylesheet: false,
  });
}
