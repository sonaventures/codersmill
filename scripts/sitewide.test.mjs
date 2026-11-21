import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultSitewideThemes,
  parseSitewideCss,
  sitewideCss,
} from "../src/data/sitewide.ts";

test("sitewide.css round-trips CTA colors in both themes", () => {
  const themes = createDefaultSitewideThemes();
  themes.light.ctaPrimary = "var(--color-sky-600)";
  themes.light.ctaTertiaryHover = "#ABCDEF";
  themes.dark.ctaSecondaryText = "transparent";
  const css = sitewideCss(themes);
  assert.match(css, /--cta-01: var\(--color-sky-600\);/);
  assert.doesNotMatch(css, /--cta-01-text/);
  const restored = parseSitewideCss(css);
  assert.equal(restored.light.ctaPrimary, "var(--color-sky-600)");
  assert.equal(restored.light.ctaTertiaryHover, "#abcdef");
  assert.equal(restored.dark.ctaSecondaryText, "transparent");
  assert.equal(restored.dark.ctaPrimary, "theme");
});

test("sitewide.css rules turn off while the Theme Builder previews", () => {
  const css = sitewideCss(createDefaultSitewideThemes());
  assert.match(css, /:root:not\(\[data-sitewide-preview\]\):not\(\[data-theme="dark"\]\) \{/);
  assert.match(css, /:root:not\(\[data-sitewide-preview\]\)\[data-theme="dark"\] \{/);
  assert.deepEqual(parseSitewideCss(""), createDefaultSitewideThemes());
});

test("sitewide.css rejects values the builder cannot show", () => {
  const css = sitewideCss(createDefaultSitewideThemes()).replace(
    '[data-theme="dark"] {',
    '[data-theme="dark"] {\n  --cta-02: red;',
  );
  assert.throws(() => parseSitewideCss(css), /--cta-02/);
});

test("each builder replaces only its own section of sitewide.css", async () => {
  const { readSitewideSection, writeSitewideSection } = await import(
    "../src/data/sitewide.ts"
  );
  const themes = createDefaultSitewideThemes();
  themes.light.ctaPrimary = "var(--color-sky-600)";
  const typography = "/* typography-builder: x */\n\nh1 {\n  font-weight: 700;\n}";
  let css = writeSitewideSection(sitewideCss(themes), "typography", typography);
  assert.equal(readSitewideSection(css, "typography"), typography);
  // The Theme Builder saving colors keeps the typography.
  themes.light.ctaPrimary = "var(--color-sky-700)";
  css = sitewideCss(themes, css);
  assert.equal(readSitewideSection(css, "typography"), typography);
  assert.equal(parseSitewideCss(css).light.ctaPrimary, "var(--color-sky-700)");
  // The Typography Builder saving keeps the colors.
  css = writeSitewideSection(css, "typography", "h2 {\n  font-weight: 600;\n}");
  assert.equal(parseSitewideCss(css).light.ctaPrimary, "var(--color-sky-700)");
  assert.ok(css.indexOf("sitewide: colors") < css.indexOf("sitewide: typography"));
  // A file from before the sections existed holds only colors.
  const older = "/* header */\n" + readSitewideSection(sitewideCss(themes), "colors");
  assert.equal(parseSitewideCss(older).light.ctaPrimary, "var(--color-sky-700)");
  assert.equal(readSitewideSection(older, "typography"), "");
  assert.throws(
    () => readSitewideSection("/* sitewide: typography */\nh1 {}", "typography"),
    /end marker/,
  );
});
