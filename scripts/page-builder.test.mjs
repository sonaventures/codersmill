import assert from "node:assert/strict";
import test from "node:test";
import {
  generatePage,
  inspectComponent,
  pageRoute,
  pageSlug,
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

test("generates ordered components with escaped values and a shared layout", () => {
  const intro = {
    path: "PageIntro.astro",
    properties: [{ name: "title", type: "string", optional: false }],
  };
  const card = { path: "Cards.astro", properties: [] };
  const result = generatePage('Our "Page"', "", [
    { component: intro, values: { title: "</Layout><script>" } },
    { component: card, values: {} },
    { component: intro, values: { title: "Again" } },
  ]);
  assert.match(
    result,
    /import Layout from "\.\.\/\.\.\/layouts\/layout\.astro"/,
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
  assert.equal(pageRoute("cafe-services"), "/pagebuilder/cafe-services/");
  assert.equal(pageRoute("index"), "/pagebuilder/");
  assert.throws(() => pageSlug("///"), /file name/);
  assert.throws(() => pageRoute("../other"), /Invalid/);
});

test("refuses to overwrite existing files and surfaces write failures", async () => {
  await assert.rejects(
    saveNewPage({}, "pagebuilder.astro", "content"),
    /reserved/,
  );
  let created = false;
  const existing = {
    async getFileHandle(_name, options) {
      if (options?.create) created = true;
      return {};
    },
  };
  await assert.rejects(
    saveNewPage(existing, "page.astro", "content"),
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
  const existingIndex = directory([["index.mdx", { kind: "file" }]]);
  existingIndex.kind = "directory";
  await assert.rejects(
    saveNewPage(directory([["page", existingIndex]]), "page.astro", "content"),
    /page\/index\.mdx/,
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
