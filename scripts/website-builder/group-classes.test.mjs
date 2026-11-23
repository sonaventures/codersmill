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
} from "../../src/data/website-builder/group-classes.ts";
import {
  createDefaultColors,
  defaultRadii,
} from "../../src/data/website-builder/theme-groups.ts";

const group = (name = "Coastal calm") => ({
  id: "coastal",
  name,
  themes: { light: createDefaultColors(), dark: createDefaultColors() },
  radii: { ...defaultRadii },
  sectionIds: {},
  widths: {},
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
  // Headers and footers are sitewide (sw-header / sw-footer), not groups.
  assert.ok(!isGroupClassName("sg-coastal-calm-header"));
  assert.ok(!isGroupClassName("sg-coastal-calm-footer"));
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

test("headers and footers are sitewide, so groups have no classes for them", () => {
  const saved = group();
  saved.themes.light.header.background = "var(--color-sky-900)";
  saved.typography = { footer: { h2: { "text-transform": "uppercase" } } };
  const css = generateGroupCss(saved);
  assert.doesNotMatch(
    css,
    /sg-coastal-calm-(?:header|footer)|--canvas-header|text-transform/,
  );
});

test("SVG fills map onto section 01 and fall back to the text color", () => {
  const saved = group();
  saved.themes.light.hero.svgFill1 = "var(--color-sky-500)";
  const css = generateGroupCss(saved);
  const hero = ruleFor(
    css,
    ':root:not([data-theme="dark"]) .sg-coastal-calm-hero',
  );
  assert.match(hero, /--ink-hero-svg-01: var\(--color-sky-500\);/);
  assert.match(hero, /--ink-01-svg-01: var\(--color-sky-500\);/);
  assert.match(
    hero,
    /--ink-01-svg-02: var\(--ink-hero-svg-02, var\(--canvas-01\)\);/,
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
  assert.equal(classes.length, 16);
  assert.deepEqual(classes[1], {
    className: "sg-coastal-calm-hero",
    group: "coastal-calm",
    groupName: "Coastal calm",
    area: "hero",
    areaLabel: "Hero",
  });
  assert.deepEqual(
    classes.slice(0, 8).map(({ area }) => area),
    [
      "page",
      "hero",
      "section-1",
      "section-2",
      "section-3",
      "section-4",
      "section-5",
      "section-6",
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
  assert.equal(parseGroupClasses(upsertGroupCss("", saved)).length, 8);
});

test("CTA colors are sitewide, so no group class sets them", () => {
  const saved = group();
  saved.themes.light.global.ctaPrimaryHover = "var(--color-orange-600)";
  saved.themes.light.global.brandFirst = "var(--color-sky-600)";
  const css = generateGroupCss(saved);
  assert.doesNotMatch(css, /--cta-/);
  assert.match(css, /--brand-01: var\(--color-sky-600\);/);
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
  assert.equal(parseGroupClasses(`${groupsCssHeader}\n${older}\n`).length, 8);
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
  };
  const css = generateGroupCss(saved);
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
  assert.equal(parseGroupClasses(upsertGroupCss("", saved)).length, 8);
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

test("each area class maps its colors onto the elements inside it", () => {
  const css = generateGroupCss(group());
  const hero = css.slice(
    css.indexOf("  :where(.sg-coastal-calm-hero) {"),
    css.indexOf("  :where(.sg-coastal-calm-section-1) {"),
  );
  const expected = [
    [
      /:where\(\.sg-coastal-calm-hero\) \{\n    background-color: var\(--canvas-01\);\n    border-color: var\(--canvas-01-border\);/,
    ],
    [
      /--tw-shadow-color: color-mix\(in srgb, var\(--canvas-01-shadow\) 10%, transparent\)/,
    ],
    [/:where\(\.sg-coastal-calm-hero\) p \{\n    color: var\(--ink-01\);/],
    [/:where\(\.sg-coastal-calm-hero\) h1 \{\n    color: var\(--ink-01-h1\);/],
    [
      /:where\(\.sg-coastal-calm-hero\) h4 \{\n    color: var\(--ink-01-h4, var\(--ink-01-h3\)\);/,
    ],
    [/:where\(\.sg-coastal-calm-hero\) strong \{/],
    [/:where\(\.sg-coastal-calm-hero\) em \{/],
    [
      /:where\(\.sg-coastal-calm-hero\) code \{\n    color: var\(--ink-01-code, currentColor\);\n    background-color: var\(--canvas-01-code, transparent\);/,
    ],
    [/:where\(\.sg-coastal-calm-hero\) pre \{/],
    [
      /:where\(\.sg-coastal-calm-hero\) label \{\n    color: var\(--ink-01-label, var\(--ink-01\)\);/,
    ],
    [
      /:where\(\.sg-coastal-calm-hero\) input:not\(\[type="button"\][^)]*\),\n  :where\(\.sg-coastal-calm-hero\) textarea,\n  :where\(\.sg-coastal-calm-hero\) select \{\n    color: var\(--ink-01-input, var\(--ink-01\)\);\n    background-color: var\(--canvas-01-input, var\(--canvas-01\)\);\n    border-color: var\(--canvas-01-input-border, var\(--canvas-01-border\)\);/,
    ],
    [
      /:where\(\.sg-coastal-calm-hero\) ::placeholder \{\n    color: var\(--ink-01-placeholder, var\(--ink-01-muted\)\);/,
    ],
    [
      /:where\(\.sg-coastal-calm-hero\) :is\(input, textarea, select\):focus-visible \{\n    outline-color: var\(--accent-01-input-focus, var\(--accent-01-focus\)\);/,
    ],
    [
      /:where\(\.sg-coastal-calm-hero\) blockquote \{\n    color: var\(--ink-01-blockquote, var\(--ink-01-muted\)\);\n    border-color: var\(--canvas-01-blockquote-border, currentColor\);/,
    ],
    [
      /:where\(\.sg-coastal-calm-hero\) hr \{\n    border-color: var\(--canvas-01-divider, var\(--canvas-01-border\)\);/,
    ],
  ];
  for (const [pattern] of expected) assert.match(hero, pattern);
  // In the base layer, so color utilities on a component still win.
  assert.match(css, /@layer base \{\n  :where\(\.sg-coastal-calm-hero\) \{/);
  // The page and every section use the same mapping as the hero.
  const elementBlock = (area) =>
    css.match(
      new RegExp(
        `@layer base \\{\\n  :where\\(\\.sg-coastal-calm-${area}\\) \\{[\\s\\S]*?\\n\\}`,
      ),
    )?.[0];
  // The page keeps square corners; sections and the hero take the radius.
  assert.match(elementBlock("hero"), /border-radius: var\(--radius-section\);/);
  assert.equal(
    elementBlock("page"),
    elementBlock("hero")
      .replaceAll("sg-coastal-calm-hero", "sg-coastal-calm-page")
      .replace("    border-radius: var(--radius-section);\n", ""),
  );
  for (const area of [
    "section-1",
    "section-2",
    "section-3",
    "section-4",
    "section-5",
    "section-6",
  ])
    assert.equal(
      elementBlock(area),
      elementBlock("hero").replaceAll(
        "sg-coastal-calm-hero",
        `sg-coastal-calm-${area}`,
      ),
    );
  // Element rules don't add classes the page builder would list.
  assert.equal(parseGroupClasses(upsertGroupCss("", group())).length, 8);
});

test("an area's content width goes on its class; others use the sitewide width", () => {
  const saved = group();
  saved.widths = { hero: "100%", section2: "64rem" };
  const css = generateGroupCss(saved);
  assert.match(
    css,
    /\n\.sg-coastal-calm-hero \{\n  --container-site: 100%;\n\}/,
  );
  assert.match(
    css,
    /\n\.sg-coastal-calm-section-2 \{\n  --container-site: 64rem;\n\}/,
  );
  assert.equal(css.match(/--container-site/g).length, 2);
});

test("the group's corner radii are variables on every one of its classes", () => {
  const saved = group();
  saved.radii = {
    section: "lg",
    card: "none",
    subsection: "2xl",
    accent: "full",
    cta: "md",
  };
  const css = generateGroupCss(saved);
  const block = css.match(
    /\.sg-coastal-calm-page,\n[\s\S]*?\{\n[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(block, "radius rule");
  for (const suffix of ["page", "hero", "section-1", "section-6"])
    assert.match(block, new RegExp(`\\.sg-coastal-calm-${suffix}[,\\s]`));
  assert.match(block, /--radius-section: 0\.5rem;/);
  assert.match(block, /--radius-card: 0px;/);
  assert.match(block, /--radius-subsection: 1rem;/);
  assert.match(block, /--radius-accent: 9999px;/);
  assert.match(block, /--radius-cta: 0\.375rem;/);
  // The page builder still lists the classes in area order.
  assert.deepEqual(
    parseGroupClasses(upsertGroupCss("", saved)).map(({ area }) => area),
    [
      "page",
      "hero",
      "section-1",
      "section-2",
      "section-3",
      "section-4",
      "section-5",
      "section-6",
    ],
  );
});

test("SVG type colors become rules for their marker classes, only once chosen", () => {
  const saved = group();
  saved.themes.light.hero.navSvgFill = "var(--color-sky-500)";
  saved.themes.light.hero.navSvgStrokeHover = "var(--color-sky-700)";
  saved.themes.dark.section2.buttonSvgFillActive = "#123456";
  const css = generateGroupCss(saved);
  const light = ':root:not\\(\\[data-theme="dark"\\]\\)';
  assert.match(
    css,
    new RegExp(
      `${light} :where\\(\\.sg-coastal-calm-hero\\) \\.nav-svg \\{\\n    fill: var\\(--ink-hero-nav-svg-fill\\);`,
    ),
  );
  assert.match(
    css,
    new RegExp(
      `${light} :where\\(\\.sg-coastal-calm-hero\\) :is\\(a, button, summary\\):is\\(:hover, :focus-visible\\) \\.nav-svg \\{\\n    stroke: var\\(--ink-hero-nav-svg-stroke-hover\\);`,
    ),
  );
  assert.match(
    css,
    /:root\[data-theme="dark"\] :where\(\.sg-coastal-calm-section-2\) :is\(a, button, summary\):active \.button-svg \{\n {4}fill: var\(--ink-02-button-svg-fill-active\);/,
  );
  // The colors themselves are set on the class like every other color.
  assert.match(css, /--ink-hero-nav-svg-fill: var\(--color-sky-500\);/);
  assert.match(css, /--ink-01-nav-svg-fill: var\(--color-sky-500\);/);
  // Nothing else gets an SVG type rule, so other SVGs keep their own colors.
  assert.equal(css.match(/\n {4}(?:fill|stroke): var\(--ink-/g).length, 3);
  assert.doesNotMatch(
    generateGroupCss(group()),
    /\.(?:nav-|button-|anchor-)?svg \{/,
  );
});

test("area classes set the card text colors the cards read", async () => {
  const { readFile } = await import("node:fs/promises");
  const { areaDeclarations } =
    await import("../../src/data/website-builder/group-classes.ts");
  const {
    cardInkParts,
    cardTargets,
    createDefaultColors: defaults,
  } = await import("../../src/data/website-builder/theme-groups.ts");
  const colors = defaults();
  colors.section3.card2H2 = "var(--color-sky-600)";
  const declarations = areaDeclarations(colors, "section3");
  assert.equal(declarations.get("ink-03-card-02-h2"), "var(--color-sky-600)");
  assert.equal(declarations.get("ink-card-02-h2"), "var(--color-sky-600)");
  // Colors left on the theme default are not written.
  assert.ok(
    ![...declarations.keys()].some((token) => token.includes("card-01-h2")),
  );
  // cards.css points every card text variable at the area's, and remaps the
  // area's text variables inside each card.
  const css = await readFile(
    new URL("../../src/styles/utilities/cards.css", import.meta.url),
    "utf8",
  );
  for (const target of cardTargets)
    for (const part of cardInkParts) {
      assert.ok(
        css.includes(
          `--${part.family}-${target.token}${part.suffix}: var(--${part.family}-01${part.suffix});`,
        ),
        `default for ${target.key}${part.key}`,
      );
      assert.ok(
        css.includes(
          `--${part.family}-01${part.suffix}: var(--${part.family}-${target.token}${part.suffix});`,
        ),
        `remap for ${target.key}${part.key}`,
      );
    }
  for (const target of cardTargets)
    assert.ok(css.includes(`:where(.bg-canvas-01-${target.token})`));
});

test("cards and the subsection get their own typography after the area's", async () => {
  const { generateGroupCss } =
    await import("../../src/data/website-builder/group-classes.ts");
  const { createDefaultColors: defaults, defaultRadii: radii } =
    await import("../../src/data/website-builder/theme-groups.ts");
  const css = generateGroupCss({
    id: "type",
    name: "Type",
    themes: { light: defaults(), dark: defaults() },
    radii: { ...radii },
    sectionIds: {},
    widths: {},
    typography: {
      hero: { h2: { "font-size": "2rem" } },
      "hero/card2": { h2: { "font-family": "var(--font-serif)" } },
      "section3/subsection": { p: { "font-size": "0.875rem" } },
    },
  });
  const area = css.indexOf(".sg-type-hero h2 {");
  const card = css.indexOf(
    ".sg-type-hero :where(.bg-canvas-01-card-02) h2 {\n  font-family: var(--font-serif);",
  );
  assert.ok(area !== -1 && card > area, "card rule after the area's");
  assert.match(
    css,
    /\.sg-type-section-3 :where\(\.bg-canvas-01-subsection\) p \{\n {2}font-size: 0\.875rem;/,
  );
});

test("area classes set the card accent colors the cards read", async () => {
  const { readFile } = await import("node:fs/promises");
  const { areaDeclarations } =
    await import("../../src/data/website-builder/group-classes.ts");
  const {
    accentParts,
    cardAccents,
    cardTargets,
    createDefaultColors: defaults,
  } = await import("../../src/data/website-builder/theme-groups.ts");
  const colors = defaults();
  colors.hero.card1Accent2Hover = "var(--color-sky-600)";
  const declarations = areaDeclarations(colors, "hero");
  assert.equal(
    declarations.get("accent-hero-card-01-02-hover"),
    "var(--color-sky-600)",
  );
  assert.equal(
    declarations.get("accent-card-01-02-hover"),
    "var(--color-sky-600)",
  );
  // A card accent is not mapped onto the area's shared accent.
  assert.notEqual(
    declarations.get("accent-01-02-hover"),
    "var(--color-sky-600)",
  );
  // cards.css points every card accent at the area's, and inside each card
  // the area's Accent 1 and 2 become the card's.
  const css = await readFile(
    new URL("../../src/styles/utilities/cards.css", import.meta.url),
    "utf8",
  );
  for (const target of cardTargets)
    for (const number of cardAccents)
      for (const part of accentParts) {
        const accent = `0${number}${part.suffix}`;
        assert.ok(
          css.includes(
            `--accent-${target.token}-${accent}: var(--accent-01-${accent});`,
          ),
          `default for ${target.key} Accent ${number}${part.key}`,
        );
        assert.ok(
          css.includes(
            `--accent-01-${accent}: var(--accent-${target.token}-${accent});`,
          ),
          `remap for ${target.key} Accent ${number}${part.key}`,
        );
      }
  // Accent 3 stays the area's.
  assert.ok(!css.includes("--accent-card-01-03"));
});

test("accent typography targets the accent presets in every area", async () => {
  const { generateGroupCss } =
    await import("../../src/data/website-builder/group-classes.ts");
  const { createDefaultColors: defaults, defaultRadii: radii } =
    await import("../../src/data/website-builder/theme-groups.ts");
  const css = generateGroupCss({
    id: "accent-type",
    name: "Accent type",
    themes: { light: defaults(), dark: defaults() },
    radii: { ...radii },
    sectionIds: {},
    widths: {},
    typography: {
      hero: { accent1: { "font-family": "var(--font-serif)" } },
      "section2/card3": { accent2: { "font-weight": "700" } },
      page: { accent3: { "text-transform": "uppercase" } },
    },
  });
  assert.match(
    css,
    /\.sg-accent-type-hero \.bg-accent-01-01 \{\n  font-family: var\(--font-serif\);\n\}/,
  );
  assert.match(
    css,
    /\.sg-accent-type-section-2 :where\(\.bg-canvas-01-card-03\) \.bg-accent-01-02 \{\n  font-weight: 700;\n\}/,
  );
  assert.match(css, /\.sg-accent-type-page \.bg-accent-01-03 \{/);
});
