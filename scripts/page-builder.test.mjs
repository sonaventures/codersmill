import assert from "node:assert/strict";
import test from "node:test";
import {
  generatePage,
  inspectComponent,
  pageRoute,
  pageSlug,
  readComponents,
  saveNewPage,
} from "../src/data/page-builder.js";

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
  assert.equal(inspectComponent("SiteHeader.astro", ""), null);
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
