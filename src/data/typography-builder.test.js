import assert from "node:assert/strict";
import test from "node:test";
import {
  createTypography,
  parseTypography,
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
