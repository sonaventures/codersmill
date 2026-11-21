import assert from "node:assert/strict";
import test from "node:test";
import {
  generateGroupCss,
  groupClassSlug,
  groupsCssHeader,
  isGroupClassName,
  parseGroupClasses,
  removeGroupCss,
  upsertGroupCss,
} from "../src/data/group-classes.ts";
import { createDefaultColors, defaultRadii } from "../src/data/theme-groups.ts";

const group = (name = "Coastal calm") => ({
  id: "coastal",
  name,
  themes: { light: createDefaultColors(), dark: createDefaultColors() },
  radii: { ...defaultRadii },
  sectionIds: {},
  typography: {},
});

const ruleFor = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing rule ${selector}`);
  return css.slice(start, css.indexOf("}", start) + 1);
};

test("class names come from the theme group name", () => {
  assert.equal(groupClassSlug("Coastal Calm!"), "coastal-calm");
  assert.equal(groupClassSlug("Café  Crème"), "cafe-creme");
  assert.throws(() => groupClassSlug("***"), /at least one letter/);
  assert.ok(isGroupClassName("sg-coastal-calm-hero"));
  assert.ok(isGroupClassName("sg-coastal-calm-section-3"));
  assert.ok(isGroupClassName("sg-coastal-calm-header"));
  assert.ok(isGroupClassName("sg-coastal-calm-footer"));
  assert.ok(!isGroupClassName("sg-coastal-calm-sidebar"));
  assert.ok(!isGroupClassName("coastal-calm-hero"));
});

test("each area maps its colors onto its own and the shared section 01 variables", () => {
  const saved = group();
  saved.themes.light.hero.background = "var(--color-sky-900)";
  saved.themes.light.hero.muted = "#aabbcc";
  saved.themes.dark.hero.background = "var(--color-slate-950)";
  saved.themes.light.global.contrastCanvas = "var(--color-orange-500)";
  saved.themes.light.global.contrastText = "var(--color-orange-50)";
  saved.themes.light.section3.highlight = "var(--color-yellow-400)";
  const css = generateGroupCss(saved);

  const heroLight = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-hero',
  );
  assert.match(heroLight, /--canvas-hero: var\(--color-sky-900\);/);
  assert.match(heroLight, /--canvas-01: var\(--color-sky-900\);/);
  assert.match(heroLight, /--ink-hero-muted: #aabbcc;/);
  assert.match(heroLight, /--ink-01-muted: #aabbcc;/);
  // Theme defaults in the hero still point components at the hero colors.
  assert.match(heroLight, /--ink-01: var\(--ink-hero\);/);
  assert.doesNotMatch(heroLight, /--canvas-contrast/);

  const heroDark = ruleFor(
    css,
    ':root[data-theme="dark"] .sg-coastal-calm-hero',
  );
  assert.match(heroDark, /--canvas-01: var\(--color-slate-950\);/);
  assert.doesNotMatch(heroDark, /#aabbcc/);

  const page = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-page',
  );
  assert.match(page, /--canvas-contrast: var\(--color-orange-500\);/);
  assert.match(page, /--ink-contrast: var\(--color-orange-50\);/);
  assert.match(page, /background-color: var\(--canvas-page\);/);

  const section3 = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-section-3',
  );
  assert.match(section3, /--ink-03-highlight: var\(--color-yellow-400\);/);
  assert.match(section3, /--ink-01-highlight: var\(--color-yellow-400\);/);

  // Section 01 on theme defaults sets nothing, so it inherits its surroundings.
  const section1 = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-section-1',
  );
  assert.doesNotMatch(section1, /--/);
});

test("header and footer colors become their own classes", () => {
  const saved = group();
  saved.themes.light.header.background = "var(--color-sky-900)";
  saved.themes.dark.footer.text = "var(--color-slate-100)";
  const css = generateGroupCss(saved);
  const header = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-header',
  );
  assert.match(header, /--canvas-header: var\(--color-sky-900\);/);
  assert.match(header, /--canvas-01: var\(--color-sky-900\);/);
  const footer = ruleFor(css, ':root[data-theme="dark"] .sg-coastal-calm-footer');
  assert.match(footer, /--ink-footer: var\(--color-slate-100\);/);
});

test("SVG fills map onto section 01 and fall back to the text color", () => {
  const saved = group();
  saved.themes.light.header.svgFill1 = "var(--color-sky-500)";
  const css = generateGroupCss(saved);
  const header = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-header',
  );
  assert.match(header, /--ink-header-svg-01: var\(--color-sky-500\);/);
  assert.match(header, /--ink-01-svg-01: var\(--color-sky-500\);/);
  assert.match(
    header,
    /--ink-01-svg-02: var\(--ink-header-svg-02, var\(--canvas-01\)\);/,
  );
});

test("saving a group again replaces its block and keeps everything else", () => {
  const first = upsertGroupCss("", group());
  assert.ok(first.startsWith(groupsCssHeader));
  const withOther = upsertGroupCss(
    `${first}\n.hand-written { color: red; }\n`,
    group("Night shift"),
  );
  const changed = group();
  changed.themes.light.hero.background = "#123456";
  const updated = upsertGroupCss(withOther, changed);
  assert.equal(updated.match(/theme-group: coastal-calm \(/g).length, 1);
  assert.match(updated, /--canvas-hero: #123456;/);
  assert.match(updated, /\.hand-written \{ color: red; \}/);
  assert.match(updated, /theme-group: night-shift \(Night shift\)/);
});

test("the page builder reads every group class with its area", () => {
  const css = upsertGroupCss(upsertGroupCss("", group()), group("Night shift"));
  const classes = parseGroupClasses(`${css}\n.sg-fake-hero { color: red; }`);
  assert.equal(classes.length, 20);
  assert.deepEqual(classes[2], {
    className: "sg-coastal-calm-hero",
    group: "coastal-calm",
    groupName: "Coastal calm",
    area: "hero",
    areaLabel: "Hero",
  });
  assert.deepEqual(
    classes.slice(0, 10).map(({ area }) => area),
    [
      "page",
      "header",
      "hero",
      "section-1",
      "section-2",
      "section-3",
      "section-4",
      "section-5",
      "section-6",
      "footer",
    ],
  );
  assert.ok(!classes.some(({ className }) => className === "sg-fake-hero"));
  assert.deepEqual(parseGroupClasses(""), []);
});

test("text formatting colors carry into group classes", () => {
  const saved = group();
  saved.themes.light.section2.strong = "var(--color-rose-600)";
  saved.themes.dark.section2.codeBackground = "var(--color-slate-800)";
  const css = generateGroupCss(saved);
  const light = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-section-2',
  );
  assert.match(light, /--ink-02-strong: var\(--color-rose-600\);/);
  assert.match(light, /--ink-01-strong: var\(--color-rose-600\);/);
  assert.match(light, /--canvas-01-code: var\(--canvas-02-code\);/);
  const dark = ruleFor(
    css,
    ':root[data-theme="dark"] .sg-coastal-calm-section-2',
  );
  assert.match(dark, /--canvas-01-code: var\(--color-slate-800\);/);
});

test("form colors map onto section 01 and selection becomes a ::selection rule", () => {
  const saved = group();
  saved.themes.light.hero.inputBorder = "var(--color-sky-400)";
  saved.themes.light.hero.selectionBackground = "var(--color-yellow-200)";
  const css = generateGroupCss(saved);
  const hero = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-hero',
  );
  assert.match(hero, /--canvas-hero-input-border: var\(--color-sky-400\);/);
  assert.match(hero, /--canvas-01-input-border: var\(--color-sky-400\);/);
  // Unset form colors point at the hero's, which fall back in the component.
  assert.match(hero, /--ink-01-label: var\(--ink-hero-label\);/);
  assert.doesNotMatch(hero, /selection/);
  assert.ok(
    css.includes(
      ':root:not([data-theme="dark"]) .sg-coastal-calm-hero ::selection,\n:root:not([data-theme="dark"]) .sg-coastal-calm-hero::selection {\n  background-color: var(--color-yellow-200);\n}',
    ),
  );
  assert.ok(
    !css.includes(':root[data-theme="dark"] .sg-coastal-calm-hero ::selection'),
  );
  assert.equal(parseGroupClasses(upsertGroupCss("", saved)).length, 10);
});

test("CTA text, border, and hover colors go into the page class", () => {
  const saved = group();
  saved.themes.light.global.ctaPrimaryHover = "var(--color-orange-600)";
  saved.themes.light.global.ctaSecondaryBorder = "#112233";
  const css = generateGroupCss(saved);
  const page = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-page',
  );
  assert.match(page, /--cta-01-hover: var\(--color-orange-600\);/);
  assert.match(page, /--cta-02-border: #112233;/);
  assert.doesNotMatch(page, /--cta-01-text/);
});

test("blocks saved with the older style-group markers are still read and replaced", () => {
  const current = generateGroupCss(group());
  const older = current
    .replace("/* theme-group: coastal-calm", "/* style-group: coastal-calm")
    .replace(
      "/* end theme-group: coastal-calm",
      "/* end style-group: coastal-calm",
    );
  assert.match(older, /style-group: coastal-calm/);
  assert.equal(parseGroupClasses(`${groupsCssHeader}\n${older}\n`).length, 10);
  const changed = group();
  changed.themes.light.hero.background = "#abcdef";
  const updated = upsertGroupCss(`${groupsCssHeader}\n${older}\n`, changed);
  assert.doesNotMatch(updated, /style-group/);
  assert.equal(updated.match(/theme-group: coastal-calm \(/g).length, 1);
  assert.match(updated, /--canvas-hero: #abcdef;/);
});

test("group typography becomes rules under each area class", () => {
  const saved = group();
  saved.typography = {
    page: { p: { "font-family": "var(--font-serif)" } },
    hero: { h1: { "font-size": "3rem", "letter-spacing": "-0.02em" } },
    header: { a: { "font-weight": "600" } },
    footer: { h2: { "text-transform": "uppercase" } },
  };
  const css = generateGroupCss(saved);
  assert.ok(
    css.includes(".sg-coastal-calm-header a {\n  font-weight: 600;\n}"),
  );
  assert.ok(
    css.includes(
      ".sg-coastal-calm-footer h2 {\n  text-transform: uppercase;\n}",
    ),
  );
  assert.ok(
    css.includes(
      ".sg-coastal-calm-page p {\n  font-family: var(--font-serif);\n}",
    ),
  );
  assert.ok(
    css.includes(
      ".sg-coastal-calm-hero h1 {\n  font-size: 3rem;\n  letter-spacing: -0.02em;\n}",
    ),
  );
  // Page rules come before the hero's so the hero wins where they overlap.
  assert.ok(
    css.indexOf(".sg-coastal-calm-page p {") <
      css.indexOf(".sg-coastal-calm-hero h1 {"),
  );
  assert.ok(
    css.indexOf(".sg-coastal-calm-hero h1 {") <
      css.indexOf("/* end theme-group"),
  );
  // Typography rules don't add classes to the page builder's list.
  assert.equal(parseGroupClasses(upsertGroupCss("", saved)).length, 10);
});

test("deleting a group removes only its block from groups.css", () => {
  const css = upsertGroupCss(upsertGroupCss("", group()), group("Night shift"));
  const removed = removeGroupCss(
    `${css}\n.hand-written { color: red; }\n`,
    "Coastal calm",
  );
  assert.doesNotMatch(removed, /coastal-calm/);
  assert.match(removed, /theme-group: night-shift/);
  assert.match(removed, /\.hand-written/);
});

test("CTA 03 colors are written on the page class", () => {
  const saved = group();
  saved.themes.light.global.ctaTertiary = "var(--color-sky-600)";
  saved.themes.light.global.ctaTertiaryHoverText = "var(--color-white)";
  const page = ruleFor(
    generateGroupCss(saved),
    ':root:not([data-theme="dark"]) .sg-coastal-calm-page',
  );
  assert.match(page, /--cta-03: var\(--color-sky-600\);/);
  assert.match(page, /--cta-03-hover-text: var\(--color-white\);/);
  assert.doesNotMatch(page, /--cta-03-text/);
});
