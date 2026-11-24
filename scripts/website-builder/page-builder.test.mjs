import assert from "node:assert/strict";
import test from "node:test";
import {
  componentFolders,
  componentSavePath,
  generatePage,
  inspectComponent,
  pageRoute,
  parseGeneratedPage,
  pageSlug,
  parseIdsFromCss,
  readComponents,
  readThemeIds,
  rebaseComponentImports,
  saveComponentCopy,
  saveNewPage,
  validateSectionId,
  validateStyleClass,
} from "../../src/data/website-builder/page-builder.js";

test("discovers simple component properties and reports unsupported components", () => {
  const component = inspectComponent(
    "PageIntro.astro",
    `---
interface Props {
  title: string;
  count?: number;
  enabled: boolean;
}
const { title } = Astro.props;
---
<h1>{title}</h1>`,
  );
  assert.deepEqual(component.properties, [
    { name: "title", type: "string", optional: false },
    { name: "count", type: "number", optional: true },
    { name: "enabled", type: "boolean", optional: false },
  ]);
  assert.match(
    inspectComponent(
      "Complex.astro",
      "---\ninterface Props { items: string[] }\nAstro.props;\n---",
    ).error,
    /supported/,
  );
  assert.equal(inspectComponent("codersmill/header.astro", ""), null);
  assert.equal(inspectComponent("codersmill/header_5.astro", ""), null);
  assert.equal(inspectComponent("codersmill/footer_1.astro", ""), null);
  // Headers and footers in folders, such as the blocks, are components.
  assert.deepEqual(
    inspectComponent("blocks/flowbite/header/header.astro", ""),
    {
      path: "blocks/flowbite/header/header.astro",
      properties: [],
    },
  );
  assert.match(inspectComponent("Wrapper.astro", "<slot />").error, /slots/);
  assert.match(
    inspectComponent("Dynamic.astro", "---\nconst props = Astro['props'];\n---")
      .error,
    /interface/,
  );
});

test("discovers large components without letting oversized files stop the scan", async () => {
  const directory = (entries) => ({
    kind: "directory",
    async *entries() {
      yield* entries;
    },
  });
  const componentFile = (size, text) => ({
    kind: "file",
    async getFile() {
      return { size, text };
    },
  });
  const source = "<section>Hello</section>";
  const components = await readComponents(
    directory([
      [
        "flyonui",
        directory([
          [
            "TooLarge.astro",
            componentFile(5_000_001, () => assert.fail("Should not read file")),
          ],
          ["Error.astro", componentFile(2_750_811, () => source)],
        ]),
      ],
      ["Intro.astro", componentFile(source.length, () => source)],
    ]),
  );
  assert.deepEqual(
    components.filter(({ error }) => !error).map(({ path }) => path),
    ["flyonui/Error.astro", "Intro.astro"],
  );
  assert.match(
    components.find(({ path }) => path === "flyonui/TooLarge.astro").error,
    /exceeds the 5 MB inspection limit/,
  );
});

test("generates ordered components with escaped values and a shared layout", () => {
  const intro = {
    path: "PageIntro.astro",
    properties: [{ name: "title", type: "string", optional: false }],
  };
  const card = { path: "cards/Cards.astro", properties: [] };
  const result = generatePage('Our "Page"', "", [
    { component: intro, values: { title: "</Layout><script>" } },
    { component: card, values: {} },
    { component: intro, values: { title: "Again" } },
  ]);
  assert.match(result, /import Layout from "\.\.\/layouts\/layout\.astro"/);
  assert.match(
    result,
    /import Component1 from "\.\.\/components\/PageIntro\.astro"/,
  );
  assert.match(
    result,
    /import Component2 from "\.\.\/components\/cards\/Cards\.astro"/,
  );
  assert.equal((result.match(/import Component1/g) ?? []).length, 1);
  assert.match(
    result,
    /<Component1 title=\{"\\u003c\/Layout\\u003e\\u003cscript\\u003e"\} \/>/,
  );
  assert.ok(
    result.indexOf("<Component1 title") < result.indexOf("<Component2 />"),
  );
  assert.ok(
    result.indexOf("<Component2 />") < result.lastIndexOf("<Component1 title"),
  );
  assert.throws(
    () => generatePage("Test", "", [{ component: intro, values: {} }]),
    /Enter title/,
  );
  assert.throws(() => generatePage("Test", "", []), /at least one/);
});

test("generates typed values without dropping false or zero", () => {
  const component = {
    path: "Example.astro",
    properties: [
      { name: "count", type: "number", optional: false },
      { name: "enabled", type: "boolean", optional: false },
      { name: "note", type: "string", optional: true },
    ],
  };
  const result = generatePage("Test", "", [
    { component, values: { count: 0, enabled: false, note: "" } },
  ]);
  assert.match(result, /<Component1 count=\{0\} enabled=\{false\} \/>/);
  assert.throws(
    () =>
      generatePage("Test", "", [
        { component, values: { count: Infinity, enabled: false } },
      ]),
    /Invalid count/,
  );
});

test("normalizes and validates component save paths", () => {
  assert.equal(componentSavePath("custom/my-hero"), "custom/my-hero.astro");
  assert.equal(
    componentSavePath(" /custom/MyHero.ASTRO/ "),
    "custom/MyHero.astro",
  );
  assert.throws(() => componentSavePath(""), /Enter a component file path/);
  assert.throws(() => componentSavePath("../hack"), /letters, numbers/);
  assert.throws(() => componentSavePath("my hero"), /letters, numbers/);
  assert.throws(() => componentSavePath("codersmill/header"), /reserved/);
  assert.throws(() => componentSavePath("codersmill/footer_1"), /reserved/);
  assert.equal(componentSavePath("custom/header"), "custom/header.astro");
});

test("saves component copies without overwriting existing entries", async () => {
  const fakeDirectory = () => {
    const directories = new Map();
    const files = new Map();
    return {
      directories,
      files,
      async getDirectoryHandle(name, options) {
        if (files.has(name))
          throw new DOMException("Mismatch", "TypeMismatchError");
        if (!directories.has(name)) {
          if (!options?.create)
            throw new DOMException("Missing", "NotFoundError");
          directories.set(name, fakeDirectory());
        }
        return directories.get(name);
      },
      async getFileHandle(name, options) {
        if (directories.has(name))
          throw new DOMException("Mismatch", "TypeMismatchError");
        if (!files.has(name)) {
          if (!options?.create)
            throw new DOMException("Missing", "NotFoundError");
          files.set(name, { content: "" });
        }
        const file = files.get(name);
        return {
          async createWritable() {
            return {
              async write(content) {
                file.content = content;
              },
              async close() {},
              async abort() {},
            };
          },
        };
      },
    };
  };

  const root = fakeDirectory();
  await saveComponentCopy(root, "custom/my-hero.astro", "<section />");
  assert.equal(
    root.directories.get("custom").files.get("my-hero.astro").content,
    "<section />",
  );
  await assert.rejects(
    saveComponentCopy(root, "custom/my-hero.astro", "<section />"),
    /already exists/,
  );
  root.files.set("blocked", { content: "" });
  await assert.rejects(
    saveComponentCopy(root, "blocked/copy.astro", "<section />"),
    /already exists as a file/,
  );
  root.directories.set("taken.astro", fakeDirectory());
  await assert.rejects(
    saveComponentCopy(root, "taken.astro", "<section />"),
    /already exists as a folder/,
  );
  await assert.rejects(
    saveComponentCopy(root, "codersmill/header.astro", "<section />"),
    /Invalid component file path/,
  );
  await assert.rejects(
    saveComponentCopy(root, "empty.astro", ""),
    /no content/,
  );
});

test("page names produce safe routes, including Astro's index route", () => {
  assert.equal(pageSlug("Café & Services"), "cafe-services");
  assert.equal(pageRoute("cafe-services"), "/cafe-services/");
  assert.equal(pageRoute("index"), "/");
  assert.throws(() => pageSlug("///"), /file name/);
  assert.throws(() => pageRoute("../other"), /Invalid/);
});

test("refuses to overwrite existing files and surfaces write failures", async () => {
  let created = false;
  const existing = {
    async getFileHandle(_name, options) {
      if (options?.create) created = true;
      return {};
    },
  };
  await assert.rejects(
    saveNewPage(existing, "index.astro", "content"),
    /already exists/,
  );
  assert.equal(created, false);

  let aborted = false;
  const failed = {
    async *entries() {},
    async getFileHandle(_name, options) {
      if (!options?.create) throw new DOMException("Missing", "NotFoundError");
      return {
        async createWritable() {
          return {
            async write() {
              throw new Error("Write failed");
            },
            async abort() {
              aborted = true;
            },
          };
        },
      };
    },
  };
  await assert.rejects(
    saveNewPage(failed, "page.astro", "content"),
    /Write failed/,
  );
  assert.equal(aborted, true);
});

test("refuses a page route already used by another page or directory index", async () => {
  const directory = (entries) => ({
    async *entries() {
      yield* entries;
    },
    async getFileHandle() {
      throw new DOMException("Missing", "NotFoundError");
    },
  });
  const existingIndex = directory([["index.astro", { kind: "file" }]]);
  existingIndex.kind = "directory";
  await assert.rejects(
    saveNewPage(
      directory([["website-builder", existingIndex]]),
      "website-builder.astro",
      "content",
    ),
    /website-builder\/index\.astro/,
  );
  await assert.rejects(
    saveNewPage(
      directory([["page.md", { kind: "file" }]]),
      "page.astro",
      "content",
    ),
    /page\.md/,
  );
});

test("parses IDs from CSS while ignoring hex colors, comments, and declarations", () => {
  const css = `
    /* Comment with #commented-id */
    #hero {
      color: #fff;
      background: #1e293b;
    }
    #about, section#services {
      border: 1px solid #e2e8f0;
    }
    [id="portfolio"] {
      padding: 2rem;
    }
    @media (min-width: 768px) {
      #contact {
        display: grid;
      }
    }
  `;
  const ids = parseIdsFromCss(css);
  assert.deepEqual(ids, ["about", "contact", "hero", "portfolio", "services"]);
  assert.deepEqual(parseIdsFromCss(""), []);
  assert.deepEqual(parseIdsFromCss(null), []);
});

test("validates section IDs and prevents invalid or duplicate IDs", () => {
  validateSectionId("hero");
  validateSectionId("services-2026");
  assert.throws(() => validateSectionId(""), /section ID/);
  assert.throws(() => validateSectionId("has space"), /section ID/);
  assert.throws(() => validateSectionId("a".repeat(121)), /section ID/);

  const intro = {
    path: "PageIntro.astro",
    properties: [{ name: "title", type: "string", optional: false }],
  };
  const card = { path: "cards/Cards.astro", properties: [] };

  const result = generatePage("Home", "", [
    { component: intro, values: { title: "Welcome" }, sectionId: "hero" },
    { component: card, values: {}, sectionId: "#services" },
    { component: card, values: {} },
  ]);

  assert.match(
    result,
    /<section id="hero">\s*<Component1 title=\{"Welcome"\} \/>\s*<\/section>/,
  );
  assert.match(
    result,
    /<section id="services">\s*<Component2 \/>\s*<\/section>/,
  );
  assert.match(result, /<\/section>\s*<Component2 \/>\s*<\/Layout>/);

  assert.throws(
    () =>
      generatePage("Home", "", [
        { component: intro, values: { title: "A" }, sectionId: "hero" },
        { component: intro, values: { title: "B" }, sectionId: "hero" },
      ]),
    /Duplicate section ID "hero"/,
  );

  assert.throws(
    () =>
      generatePage("Home", "", [
        { component: intro, values: { title: "A" }, sectionId: "invalid id" },
      ]),
    /section ID/,
  );
});

test("reads theme IDs from project directory handle", async () => {
  const fakeFile = (text) => ({
    async getFile() {
      return { text: async () => text };
    },
  });
  const project = {
    async getDirectoryHandle(name) {
      if (name === "src") {
        return {
          async getDirectoryHandle(name) {
            if (name === "styles") {
              return {
                async getDirectoryHandle(name) {
                  if (name === "themes") {
                    return {
                      async getFileHandle(name) {
                        if (name === "id.css") {
                          return fakeFile("#hero { color: #000; } #about {}");
                        }
                        throw new DOMException("Missing", "NotFoundError");
                      },
                    };
                  }
                  throw new DOMException("Missing", "NotFoundError");
                },
              };
            }
            throw new DOMException("Missing", "NotFoundError");
          },
        };
      }
      throw new DOMException("Missing", "NotFoundError");
    },
  };

  const ids = await readThemeIds(project);
  assert.deepEqual(ids, ["about", "hero"]);

  const projectThemes = {
    async getDirectoryHandle(name) {
      if (name === "src") {
        return {
          async getDirectoryHandle(name) {
            if (name === "styles") {
              return {
                async getDirectoryHandle(name) {
                  if (name === "themes") {
                    return {
                      async getFileHandle(name) {
                        if (name === "id.css") {
                          return fakeFile("#cta {} #features {}");
                        }
                        throw new DOMException("Missing", "NotFoundError");
                      },
                    };
                  }
                  throw new DOMException("Missing", "NotFoundError");
                },
              };
            }
            throw new DOMException("Missing", "NotFoundError");
          },
        };
      }
      throw new DOMException("Missing", "NotFoundError");
    },
  };
  assert.deepEqual(await readThemeIds(projectThemes), ["cta", "features"]);

  assert.deepEqual(await readThemeIds(null), []);
});

test("component copies keep relative imports working from their new folder", () => {
  const source = `---
import Cards from "./ThemeSampleCards.astro";
import type { Region } from "../../data/theme-groups";
import "../styles/extra.css";
import Layout from "astro:content";
const lazy = await import("./lazy.js");
---
<p>Text that mentions from "./not-an-import" stays as written.</p>
<script>
  import "./client.js";
</script>`;
  const moved = rebaseComponentImports(
    source,
    "websitebuilder/ThemeSampleSection.astro",
    "custom/home/HomeHero.astro",
  );
  assert.match(
    moved,
    /from "\.\.\/\.\.\/websitebuilder\/ThemeSampleCards\.astro"/,
  );
  assert.match(moved, /from "\.\.\/\.\.\/\.\.\/data\/theme-groups"/);
  assert.match(moved, /import "\.\.\/\.\.\/styles\/extra\.css"/);
  assert.match(moved, /import\("\.\.\/\.\.\/websitebuilder\/lazy\.js"\)/);
  assert.match(moved, /from "astro:content"/);
  assert.match(moved, /from "\.\/not-an-import" stays/);
  assert.match(moved, /import "\.\.\/\.\.\/websitebuilder\/client\.js"/);

  const topLevel = rebaseComponentImports(
    source,
    "websitebuilder/ThemeSampleSection.astro",
    "HomeHero.astro",
  );
  assert.match(topLevel, /from "\.\/websitebuilder\/ThemeSampleCards\.astro"/);
  assert.match(topLevel, /from "\.\.\/data\/theme-groups"/);

  assert.equal(
    rebaseComponentImports(
      source,
      "websitebuilder/A.astro",
      "websitebuilder/B.astro",
    ),
    source,
  );
});

test("lists every component folder, including parents, for copy suggestions", () => {
  assert.deepEqual(
    componentFolders([
      { path: "Hero.astro" },
      { path: "custom/home/Banner.astro" },
      { path: "websitebuilder/Card.astro" },
    ]),
    ["", "custom", "custom/home", "websitebuilder"],
  );
});

test("theme group classes wrap components and the whole page", () => {
  const hero = { path: "Hero.astro", properties: [] };
  const cards = { path: "Cards.astro", properties: [] };
  const page = generatePage(
    "Classes",
    "",
    [
      {
        component: hero,
        values: {},
        sectionId: "intro",
        styleClass: "sg-coastal-calm-hero",
      },
      { component: cards, values: {}, styleClass: "sg-coastal-calm-section-2" },
      { component: cards, values: {} },
    ],
    "sg-coastal-calm-page",
  );
  assert.ok(
    page.includes(`<Layout title={"Classes"}>
  <div class="sg-coastal-calm-page">
    <section id="intro" class="sg-coastal-calm-hero">
      <Component1 />
    </section>
    <section class="sg-coastal-calm-section-2">
      <Component2 />
    </section>
    <Component2 />
  </div>
</Layout>`),
    page,
  );

  for (const bad of [
    "coastal-hero",
    "sg-x-sidebar",
    'sg-x-hero" onload="x',
    "",
  ]) {
    assert.throws(() => validateStyleClass(bad), /not a theme group class/);
  }
  assert.throws(
    () =>
      generatePage("Bad", "", [
        { component: hero, values: {}, styleClass: 'sg-a-hero" x="' },
      ]),
    /not a theme group class/,
  );
  assert.throws(
    () =>
      generatePage("Bad", "", [{ component: hero, values: {} }], "sg-a-footer"),
    /not a theme group page class/,
  );
});

test("pages created by the page builder load back exactly", () => {
  const hero = {
    path: "flowbite/hero/hero_1.astro",
    properties: [
      { name: "title", type: "string", optional: false },
      { name: "count", type: "number", optional: true },
      { name: "wide", type: "boolean", optional: true },
    ],
  };
  const cards = { path: "Cards.astro", properties: [] };
  const selected = [
    {
      component: hero,
      values: { title: 'Say "hi" </script> & {more}', count: 0, wide: false },
      sectionId: "intro",
      styleClass: "sg-sample-hero",
    },
    { component: cards, values: {}, styleClass: "sg-sample-section-2" },
    { component: cards, values: {} },
    { component: hero, values: { title: "Again", count: 2.5, wide: true } },
  ];
  const page = generatePage(
    "Our Services",
    'A description with "quotes"',
    selected,
    "sg-sample-page",
  );
  assert.match(
    page,
    /<Layout title=\{"Our Services"\} description=\{"A description with \\"quotes\\""\}>/,
  );
  assert.deepEqual(parseGeneratedPage(page), {
    name: "Our Services",
    description: 'A description with "quotes"',
    pageClass: "sg-sample-page",
    header: "",
    footer: "",
    items: [
      {
        path: "flowbite/hero/hero_1.astro",
        values: Object.assign(Object.create(null), {
          title: 'Say "hi" </script> & {more}',
          count: 0,
          wide: false,
        }),
        sectionId: "intro",
        styleClass: "sg-sample-hero",
      },
      {
        path: "Cards.astro",
        values: Object.create(null),
        sectionId: undefined,
        styleClass: "sg-sample-section-2",
      },
      {
        path: "Cards.astro",
        values: Object.create(null),
        sectionId: undefined,
        styleClass: undefined,
      },
      {
        path: "flowbite/hero/hero_1.astro",
        values: Object.assign(Object.create(null), {
          title: "Again",
          count: 2.5,
          wide: true,
        }),
        sectionId: undefined,
        styleClass: undefined,
      },
    ],
  });
  const plain = parseGeneratedPage(
    generatePage("Plain", "", [{ component: cards, values: {} }]),
  );
  assert.equal(plain.description, "");
  assert.equal(plain.pageClass, "");
  assert.equal(plain.header, "");
  assert.equal(plain.footer, "");
});

test("pages not made by the page builder are refused with a reason", () => {
  for (const [source, reason] of [
    ["<h1>Hello</h1>", /shared layout/],
    [
      '---\nimport Layout from "../layouts/layout.astro";\nconst x = 1;\n---\n<Layout title={"A"}></Layout>',
      /unexpected code/,
    ],
    [
      '---\nimport Layout from "../layouts/layout.astro";\n---\n<Layout title={"A"}><p>hi</p></Layout>',
      /unexpected markup/,
    ],
  ])
    assert.throws(() => parseGeneratedPage(source), reason);
});

test("simple hand-written pages load too", () => {
  const page = parseGeneratedPage(`---
import Hero from "../components/flyonui/hero/hero_14.astro";
import Layout from "../layouts/layout.astro";
---

<Layout title="Test">
  <Hero heading="Hello" />
</Layout>`);
  assert.equal(page.name, "Test");
  assert.deepEqual(
    page.items.map(({ path }) => path),
    ["flyonui/hero/hero_14.astro"],
  );
  assert.equal(page.items[0].values.heading, "Hello");
});

test("pages can use a header or footer component, or none, and load again", () => {
  const hero = { path: "test/fp_hero.astro", properties: [] };
  const header = { path: "flowbite/header/header_1.astro", properties: [] };
  const footer = {
    path: "flowbite/footer/footer_4.astro",
    properties: [{ name: "year", optional: true, type: "number" }],
  };
  const source = generatePage(
    "Front",
    "",
    [{ component: hero, values: {} }],
    "sg-fp-page",
    { header, footer },
  );
  assert.match(
    source,
    /import PageHeader from "\.\.\/components\/flowbite\/header\/header_1\.astro";/,
  );
  // Headers and footers are styled sitewide, in sw-header / sw-footer.
  assert.match(
    source,
    /<div slot="header" class="sw-header">\n {4}<PageHeader \/>\n {2}<\/div>/,
  );
  assert.match(source, /<div slot="footer" class="sw-footer">/);
  const page = parseGeneratedPage(source);
  assert.equal(page.header, header.path);
  assert.equal(page.footer, footer.path);
  assert.equal(page.pageClass, "sg-fp-page");
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].path, hero.path);

  const hidden = generatePage(
    "Plain",
    "",
    [{ component: hero, values: {} }],
    "",
    {
      header: "none",
    },
  );
  assert.match(hidden, /<Layout title=\{"Plain"\} showHeader=\{false\}>/);
  assert.equal(parseGeneratedPage(hidden).header, "none");
  assert.equal(parseGeneratedPage(hidden).footer, "");

  // Pages saved with theme group header / footer classes still load.
  const older = source
    .replace('class="sw-header"', 'class="sg-fp-header"')
    .replace(
      '<Layout title={"Front"}>',
      '<Layout title={"Front"} footerClass={"sg-fp-footer"}>',
    );
  assert.equal(parseGeneratedPage(older).header, header.path);
  assert.equal(parseGeneratedPage(older).headerClass, undefined);

  assert.throws(
    () =>
      generatePage("Bad", "", [{ component: hero, values: {} }], "", {
        header: {
          path: "flowbite/header/header_2.astro",
          properties: [{ name: "title", optional: false, type: "string" }],
        },
      }),
    /required properties/,
  );
});
