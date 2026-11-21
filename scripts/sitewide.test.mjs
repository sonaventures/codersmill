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

test("the header and footer are styled sitewide in sw-header / sw-footer", async () => {
  const {
    createDefaultSitewideAreas,
    parseSitewideAreas,
    sitewideAreasCss,
    writeSitewideSection,
    readSitewideSection,
  } = await import("../src/data/sitewide.ts");
  const styles = createDefaultSitewideAreas();
  styles.colors.light.header.background = "var(--color-sky-900)";
  styles.colors.dark.footer.text = "#abcdef";
  styles.colors.light.header.svgFill1 = "var(--color-sky-500)";
  styles.colors.light.footer.selectionBackground = "var(--color-yellow-200)";
  styles.typography.footer = { h2: { "text-transform": "uppercase" } };
  const section = sitewideAreasCss(styles);
  const light =
    ':root:not([data-sitewide-preview]):not([data-theme="dark"]) .sw-header {';
  const header = section.slice(section.indexOf(light), section.indexOf("}", section.indexOf(light)));
  assert.match(header, /--canvas-header: var\(--color-sky-900\);/);
  // Like a theme group class, it maps onto the shared 01 variables too.
  assert.match(header, /--canvas-01: var\(--color-sky-900\);/);
  assert.match(header, /--ink-01-svg-01: var\(--color-sky-500\);/);
  assert.match(header, /background-color: var\(--canvas-header\);/);
  assert.match(section, /\[data-theme="dark"\] \.sw-footer \{[^}]*--ink-footer: #abcdef;/);
  assert.match(section, /\.sw-footer ::selection,/);
  assert.match(section, /\.sw-footer h2 \{\n {2}text-transform: uppercase;\n\}/);

  const css = writeSitewideSection(sitewideCss(createDefaultSitewideThemes()), "areas", section);
  assert.ok(css.indexOf("sitewide: colors") < css.indexOf("sitewide: areas"));
  const restored = parseSitewideAreas(css);
  assert.equal(restored.colors.light.header.background, "var(--color-sky-900)");
  assert.equal(restored.colors.dark.footer.text, "#abcdef");
  assert.equal(restored.colors.dark.header.background, "theme");
  assert.deepEqual(restored.typography.footer, styles.typography.footer);
  // The other sections are kept when the areas change.
  assert.ok(readSitewideSection(css, "colors"));
  assert.deepEqual(parseSitewideAreas(""), createDefaultSitewideAreas());
  assert.throws(
    () =>
      parseSitewideAreas(
        css.replace("var(--color-sky-900)", "red").replace(
          encodeURIComponent("var(--color-sky-900)"),
          "red",
        ),
      ),
    /invalid background/,
  );
});
