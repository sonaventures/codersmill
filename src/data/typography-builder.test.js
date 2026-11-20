import assert from "node:assert/strict";
import test from "node:test";
import {
  appendIdToCss,
  createTypography,
  parseIdsFromCss,
  parseTypography,
  readThemeIdFile,
  saveThemeIdFile,
  serializeTypography,
  typographyCss,
  validateSectionId,
  validateTypographyValue,
} from "./typography-builder.js";

test("empty settings preserve existing typography", () => {
  assert.equal(typographyCss(createTypography()), "");
  assert.deepEqual(parseTypography(""), createTypography());
});

test("defaults precede section rules and only explicit properties are emitted", () => {
  const config = createTypography();
  config.defaults = {
    h1: { "font-size": "3rem", "font-weight": "700", color: "" },
    em: { "font-style": "italic" },
    strong: { "font-weight": "800" },
  };
  config.sections.about = { h1: { "font-size": "2rem" } };
  const css = typographyCss(config);
  assert.match(css, /^h1 \{\n  font-size: 3rem;\n  font-weight: 700;\n\}/);
  assert.match(css, /em \{\n  font-style: italic;/);
  assert.match(css, /strong \{\n  font-weight: 800;/);
  assert.ok(css.indexOf('section[id="about"] h1') > css.indexOf("strong {"));
  assert.match(css, /section\[id="about"\] h1 \{\n  font-size: 2rem;\n\}$/);
  assert.doesNotMatch(css, /color:/);
});

test("builder CSS round trips all settings, including empty section overrides", () => {
  const config = createTypography();
  config.defaults.p = { "line-height": "1.5" };
  config.sections["feature:one"] = {
    h6: { "font-family": "Georgia, serif", "letter-spacing": "-0.02em" },
  };
  config.sections.empty = {};
  assert.deepEqual(parseTypography(serializeTypography(config)), config);
});

test("self-hosted fonts round-trip and are emitted in preview and saved CSS", () => {
  const config = createTypography();
  config.defaults.h1 = { "font-family": "var(--font-montserrat)" };
  config.defaults.p = { "font-family": "var(--font-inter)" };
  config.defaults.h2 = {
    "font-family": "var(--font-syne)",
    "font-weight": "800",
  };
  config.sections.about = {
    h1: { "font-family": "var(--font-plus-jakarta-sans)" },
    p: { "font-family": "var(--font-dm-sans)", "font-weight": "1000" },
  };
  const saved = serializeTypography(config);
  assert.deepEqual(parseTypography(saved), config);
  assert.match(
    saved,
    /section\[id="about"\] p \{\n  font-family: var\(--font-dm-sans\);\n  font-weight: 1000;/,
  );
  assert.match(
    typographyCss(config, true),
    /\[data-typography-preview\] h2 \{\n  font-family: var\(--font-syne\);\n  font-weight: 800;/,
  );
});

test("code, citations, preformatted text, and quotations support defaults and section overrides", () => {
  const config = createTypography();
  config.sections.docs = {};
  for (const element of ["code", "cite", "pre", "blockquote"]) {
    config.defaults[element] = { "font-size": "1rem" };
    config.sections.docs[element] = {
      "font-size": "1.5rem",
      color: "var(--color-sky-600)",
    };
  }
  const output = serializeTypography(config);
  assert.deepEqual(parseTypography(output), config);
  for (const element of ["code", "cite", "pre", "blockquote"]) {
    assert.ok(output.includes(`${element} {\n  font-size: 1rem;\n}`));
    assert.ok(
      output.includes(`section[id="docs"] ${element} {\n  font-size: 1.5rem;`),
    );
    assert.ok(
      typographyCss(config, true).includes(
        `[data-typography-preview] section[data-typography-section="docs"] ${element}`,
      ),
    );
  }
});

test("Tailwind presets survive export/import with section overrides and custom values", () => {
  const config = createTypography();
  config.defaults.h1 = {
    "font-family": "var(--font-sans)",
    "font-size": "2.25rem",
    "font-weight": "700",
    "line-height": "1.25",
    "letter-spacing": "0.025em",
    color: "var(--color-sky-600)",
  };
  config.sections.about = {
    h1: { color: "var(--color-rose-500)", "font-size": "2.6rem" },
    p: { color: "currentColor" },
    em: { color: "transparent" },
  };
  const output = serializeTypography(config);
  assert.deepEqual(parseTypography(output), config);
  assert.match(output, /color: var\(--color-sky-600\);/);
  assert.match(
    output,
    /section\[id="about"\] h1 \{\n  color: var\(--color-rose-500\);\n  font-size: 2.6rem;/,
  );
});

test("section IDs are safely quoted in CSS and encoded in metadata", () => {
  const config = createTypography();
  const id = 'a"]{}/*</style>';
  config.sections[id] = { h2: { color: "#abc" } };
  const output = serializeTypography(config);
  assert.deepEqual(parseTypography(output), config);
  assert.doesNotMatch(output, /<\/style>/);
  assert.match(output, /section\[id="a\\22 /);
  assert.match(
    typographyCss(config, true),
    /\[data-typography-preview\] section\[data-typography-section=/,
  );
  for (const invalid of ["", "two words", "a\nb", "a\0b"]) {
    assert.throws(() => validateSectionId(invalid));
  }
});

test("unsupported CSS, malformed settings, and unsafe values are rejected", () => {
  for (const [property, value] of [
    ["font-size", "2rem; color:red"],
    ["font-size", "-1rem"],
    ["color", "red"],
    ["color", "var(--color-unknown-500)"],
    ["color", "var(--color-sky-500); display: none"],
    ["font-size", "text-4xl"],
    ["font-weight", "font-bold"],
    ["font-family", "url(https://example.com/font)"],
    ["line-height", "-2"],
    ["letter-spacing", "5%"],
    ["position", "fixed"],
  ]) {
    assert.throws(() => validateTypographyValue(property, value));
  }
  assert.throws(() => parseTypography("h1 {color:red}"));
  assert.throws(() => parseTypography("/* typography-builder: %broken */"));
  for (const invalid of [
    { version: 2, defaults: {}, sections: {} },
    { version: 1, defaults: { script: {} }, sections: {} },
    { version: 1, defaults: {}, sections: [] },
    { version: 1, defaults: { p: { color: 3 } }, sections: {} },
    { version: 1, defaults: { p: null }, sections: {} },
  ]) {
    assert.throws(() => serializeTypography(invalid));
  }
});

test("valid typography formats and prototype-like section IDs round trip", () => {
  for (const [property, value] of [
    ["font-size", ".875rem"],
    ["font-size", "120%"],
    ["line-height", "normal"],
    ["line-height", "24px"],
    ["letter-spacing", "0"],
    ["letter-spacing", "-.025em"],
    ["color", "#33415580"],
  ]) {
    assert.doesNotThrow(() => validateTypographyValue(property, value));
  }
  const config = JSON.parse(
    '{"version":1,"defaults":{},"sections":{"__proto__":{"p":{"font-size":"1rem"}},"constructor":{}}}',
  );
  assert.deepEqual(parseTypography(serializeTypography(config)), config);
});

test("parses IDs from CSS and appends new IDs without duplication", () => {
  const initialCss = "#hero {\n}\n\n#about {\n}\n";
  assert.deepEqual(parseIdsFromCss(initialCss), ["about", "hero"]);

  const updatedCss = appendIdToCss(initialCss, "features");
  assert.match(updatedCss, /#features \{\n\}/);
  assert.deepEqual(parseIdsFromCss(updatedCss), ["about", "features", "hero"]);

  // No duplicate if ID already exists
  const unchanged = appendIdToCss(updatedCss, "#hero");
  assert.equal(unchanged, updatedCss);

  assert.throws(
    () => appendIdToCss(initialCss, "invalid with spaces"),
    /section ID/,
  );
});

test("reads and writes theme id.css using project directory handles", async () => {
  let savedContent = "";
  const mockFile = (text) => ({
    async getFile() {
      return { text: async () => text };
    },
    async createWritable() {
      return {
        async write(content) {
          savedContent = content;
        },
        async close() {},
        async abort() {},
      };
    },
  });

  const mockProject = {
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
                          return mockFile("#hero {}");
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

  const { css } = await readThemeIdFile(mockProject);
  assert.equal(css, "#hero {}");

  await saveThemeIdFile(mockProject, "#hero {}\n\n#new-section {}\n");
  assert.equal(savedContent, "#hero {}\n\n#new-section {}\n");

  assert.deepEqual(await readThemeIdFile(null), { handle: null, css: "" });
});
