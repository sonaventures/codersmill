import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), "utf8");

test("all approved page routes exist", async () => {
  const routes = [
    "src/pages/index.astro",
    "src/pages/us/who-we-are.astro",
    "src/pages/website-builder/custom-colors.astro",
    "src/pages/website-builder/theme-builder.astro",
    "src/pages/website-builder/page-builder.astro",
    "src/pages/website-builder/typography-builder.astro",
  ];

  for (const route of routes) {
    await assert.doesNotReject(readProjectFile(route), `${route} should exist`);
  }
});

test("the site is CodersMill, hosted by Coders Mill", async () => {
  const site = await readProjectFile("src/data/site.ts");
  assert.match(site, /siteName = "CodersMill"/);
  assert.match(site, /name: "Coders Mill"/);
  assert.match(site, /url: "https:\/\/codersmill\.com"/);
});

test("codersmill.com is the site URL and the package's home", async () => {
  const [config, pkg] = await Promise.all([
    readProjectFile("astro.config.mjs"),
    readProjectFile("package.json").then(JSON.parse),
  ]);
  assert.match(config, /site: "https:\/\/codersmill\.com"/);
  assert.equal(pkg.homepage, "https://codersmill.com");
  assert.equal(pkg.author.url, "https://codersmill.com");
  assert.match(
    pkg.repository.url,
    /github\.com\/sonaventures\/codersmill\.git$/,
  );
});

test("the layout, header, and footer use the shared site details", async () => {
  const [layout, header, footer] = await Promise.all([
    readProjectFile("src/layouts/layout.astro"),
    readProjectFile("src/components/codersmill/header_5.astro"),
    readProjectFile("src/components/codersmill/footer_1.astro"),
  ]);
  // The layout's header and footer are the CodersMill ones, with the menu.
  assert.match(layout, /codersmill\/header_5\.astro/);
  assert.match(layout, /codersmill\/footer_1\.astro/);
  for (const file of [header, footer]) assert.match(file, /navigation\.map/);

  for (const file of [layout, header, footer])
    assert.match(file, /from "(?:\.\.\/)+data\/site"/);
  assert.match(layout, /og:site_name/);
  assert.match(layout, /rel="canonical"/);
  assert.match(
    layout,
    /"@type": "Organization", name: host\.name, url: host\.url/,
  );
  assert.match(footer, /© \{new Date\(\)\.getFullYear\(\)\}/);
  assert.match(footer, /<a href=\{host\.url\}[^>]*>\s*\{host\.name\}/);
  for (const file of [layout, header, footer])
    assert.doesNotMatch(file, /Exclusive Group|LocalBusiness|telephone/);
});

test("every page in the menu exists", async () => {
  const { navigation } = await import("../src/data/site.ts");
  // A page is src/pages/<path>.astro or <path>/index.astro, except /docs/,
  // which Starlight serves from src/content/docs/docs/.
  const page = (href) =>
    href === "/docs/"
      ? readProjectFile("src/content/docs/docs/index.mdx")
      : readProjectFile(`src/pages${href.replace(/\/$/, "")}.astro`).catch(() =>
          readProjectFile(`src/pages${href}index.astro`),
        );
  for (const section of navigation) {
    assert.ok(section.items.length, `${section.label} has pages`);
    for (const { href, external } of [section, ...section.items]) {
      if (external) {
        assert.match(href, /^https:\/\//);
        continue;
      }
      await assert.doesNotReject(page(href), `${href}`);
    }
  }
});
