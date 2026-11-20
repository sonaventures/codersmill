import assert from "node:assert/strict";
import test from "node:test";
import {
  cardCanvasRoles,
  createDefaultColors,
  defaultColorReference,
  defaultRadii,
  getColor,
  interactiveColorRoles,
  isColorRoleVisible,
  parseStyleGroups,
  regions,
  semanticToken,
  setColor,
  serializeStyleGroups,
} from "../src/data/style-groups.ts";

const group = () => ({
  id: "coastal",
  name: "Coastal calm",
  themes: { light: createDefaultColors(), dark: createDefaultColors() },
  radii: { ...defaultRadii },
  sectionIds: {},
});

test("style groups round-trip independent area palettes", () => {
  const saved = group();
  saved.themes.light.section3.background = "var(--color-magical-merlin-500)";
  saved.themes.dark.section3.background = "var(--color-dark-rift-900)";
  const [restored] = parseStyleGroups(serializeStyleGroups([saved]));
  assert.deepEqual(restored, saved);
  assert.notEqual(
    restored.themes.light.section2.background,
    saved.themes.light.section3.background,
  );
  restored.themes.light.section3.text = "#abcdef";
  assert.notEqual(restored.themes.light.section2.text, "#abcdef");
  assert.notEqual(restored.themes.dark.section3.text, "#abcdef");
});

test("style groups round-trip independent global corner radii", () => {
  const saved = group();
  saved.radii = { section: "3xl", card: "none", subsection: "sm" };
  assert.deepEqual(parseStyleGroups(serializeStyleGroups([saved])), [saved]);

  saved.radii.card = "1px; color: red";
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([saved])),
    /Invalid card corner radius/,
  );
  delete saved.radii;
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([saved])),
    /Missing corner radii/,
  );
});

test("version 9 style groups retain colors and get the original corner radii", () => {
  const saved = group();
  saved.themes.light.section1.border = "#123456";
  delete saved.radii;
  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 9, groups: [saved] }),
  );
  assert.deepEqual(restored.themes, saved.themes);
  assert.deepEqual(restored.radii, {
    section: "none",
    card: "xl",
    subsection: "xl",
  });
});

test("transparent selections and Tailwind colors round-trip in both themes", () => {
  const saved = group();
  saved.themes.light.page.background = "transparent";
  saved.themes.light.global.brandFirst = "transparent";
  saved.themes.light.section3.secondaryText = "transparent";
  saved.themes.dark.section3.card03Border = "transparent";
  saved.themes.dark.page.background = "var(--color-sky-500)";
  const json = serializeStyleGroups([saved]);
  assert.equal(JSON.parse(json).version, 15);
  assert.deepEqual(parseStyleGroups(json), [saved]);

  const old = group();
  old.themes.light.page.background = "var(--color-magical-merlin-500)";
  assert.deepEqual(
    parseStyleGroups(JSON.stringify({ version: 5, groups: [old] })),
    [old],
  );
});

test("imports reject incomplete palettes and unsafe CSS values", () => {
  const incomplete = group();
  delete incomplete.themes.light.footer;
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([incomplete])),
    /footer/,
  );

  const invalid = group();
  invalid.themes.light.section1.background = "red;display:none";
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([invalid])),
    /Invalid background/,
  );
});

test("imports reject invalid envelopes, duplicate groups, and oversized lists", () => {
  for (const json of ["null", "[]", "{", '{"version":16,"groups":[]}']) {
    assert.throws(() => parseStyleGroups(json));
  }
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([group(), group()])),
    /unique/,
  );
  assert.throws(
    () =>
      parseStyleGroups(
        serializeStyleGroups([
          group(),
          { ...group(), id: "other", name: "COASTAL CALM" },
        ]),
      ),
    /unique/,
  );
  assert.throws(
    () =>
      parseStyleGroups(
        serializeStyleGroups(Array.from({ length: 101 }, group)),
      ),
    /100/,
  );
});

test("imports normalize names and hex colors and reject blank names", () => {
  const saved = group();
  saved.name = "  Summer  ";
  saved.themes.light.header.background = "#ABCDEF";
  const [restored] = parseStyleGroups(serializeStyleGroups([saved]));
  assert.equal(restored.name, "Summer");
  assert.equal(restored.themes.light.header.background, "#abcdef");
  saved.name = "   ";
  assert.throws(() => parseStyleGroups(serializeStyleGroups([saved])), /name/);
});

test("legacy hex groups migrate without losing colors in either theme", () => {
  const colors = createDefaultColors();
  for (const palette of Object.values(colors)) {
    for (const role of Object.keys(palette)) palette[role] = "#ABCDEF";
    delete palette.shadow;
    delete palette.accentBorder;
    delete palette.accentFocus;
  }
  delete colors.global;
  delete colors.hero;
  const [restored] = parseStyleGroups(
    JSON.stringify({
      version: 1,
      groups: [{ id: "legacy", name: "Original", colors }],
    }),
  );
  assert.equal(restored.themes.light.header.background, "#abcdef");
  assert.equal(restored.themes.dark.header.background, "#abcdef");
  assert.equal(restored.themes.light.header.accentBorder, "#abcdef");
  restored.themes.light.header.background = "#123456";
  assert.equal(restored.themes.dark.header.background, "#abcdef");
  assert.equal(restored.themes.light.hero.background, "theme");
  assert.equal(restored.themes.light.section1.card02, "#abcdef");
  assert.equal(restored.themes.light.section1.card03Border, "theme");
  assert.equal(JSON.parse(serializeStyleGroups([restored])).version, 15);
});

test("brand and CTA assignments are page-wide and round-trip independently by theme", () => {
  const saved = group();
  setColor(
    saved.themes.light,
    "header",
    "brandFirst",
    "var(--color-magical-merlin-500)",
  );
  setColor(saved.themes.light, "footer", "brandSecond", "#abcdef");
  setColor(
    saved.themes.light,
    "section3",
    "ctaPrimary",
    "var(--color-yellow-mana-400)",
  );
  setColor(
    saved.themes.dark,
    "page",
    "ctaSecondary",
    "var(--color-cardamom-300)",
  );
  const [restored] = parseStyleGroups(serializeStyleGroups([saved]));
  assert.deepEqual(restored, saved);
  assert.equal(
    getColor(restored.themes.light, "section6", "brandFirst"),
    "var(--color-magical-merlin-500)",
  );
  assert.equal(
    getColor(restored.themes.light, "header", "ctaPrimary"),
    "var(--color-yellow-mana-400)",
  );
  assert.equal(getColor(restored.themes.dark, "header", "brandFirst"), "theme");
  for (const [index, role] of [
    "brandFirst",
    "brandSecond",
    "brandThird",
    "brandFourth",
    "brandFifth",
    "brandSixth",
  ].entries()) {
    assert.equal(
      semanticToken("header", role),
      `brand-${String(index + 1).padStart(2, "0")}`,
    );
  }
  assert.equal(semanticToken("page", "ctaPrimary"), "cta-01");
  assert.equal(semanticToken("page", "ctaSecondary"), "cta-02");
});

test("version 2 groups retain area colors and adopt theme defaults for brand and CTA", () => {
  const saved = group();
  saved.themes.light.header.background = "#abcdef";
  delete saved.themes.light.global;
  delete saved.themes.dark.global;
  delete saved.themes.light.hero;
  delete saved.themes.dark.hero;
  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 2, groups: [saved] }),
  );
  assert.equal(restored.themes.light.header.background, "#abcdef");
  assert.equal(restored.themes.light.global.brandFirst, "theme");
  assert.equal(restored.themes.dark.global.ctaPrimary, "theme");
  assert.equal(restored.themes.dark.hero.text, "theme");
});

test("version 3 groups reject incomplete or invalid brand and CTA assignments", () => {
  const saved = group();
  saved.themes.light.global.ctaPrimary = "var(--unknown)";
  assert.throws(
    () => parseStyleGroups(JSON.stringify({ version: 3, groups: [saved] })),
    /Invalid ctaPrimary/,
  );
  delete saved.themes.light.global;
  assert.throws(
    () => parseStyleGroups(JSON.stringify({ version: 3, groups: [saved] })),
    /Missing brand\/CTA/,
  );
});

test("semantic tokens map page, header, hero, footer, and numbered sections", () => {
  assert.equal(semanticToken("page", "background"), "canvas-page");
  assert.equal(semanticToken("header", "primary"), "accent-header-canvas");
  assert.equal(semanticToken("header", "text"), "ink-header");
  for (let index = 1; index <= 6; index++) {
    const region = `section${index}`;
    const suffix = String(index).padStart(2, "0");
    assert.equal(semanticToken(region, "background"), `canvas-${suffix}`);
    assert.equal(semanticToken(region, "border"), `canvas-${suffix}-border`);
    assert.equal(semanticToken(region, "primary"), `accent-${suffix}-canvas`);
    assert.equal(
      semanticToken(region, "accentFocus"),
      `accent-${suffix}-focus`,
    );
    assert.equal(semanticToken(region, "text"), `ink-${suffix}`);
    assert.equal(semanticToken(region, "h1"), `ink-${suffix}-h1`);
    assert.equal(semanticToken(region, "card"), `canvas-${suffix}-card-01`);
    assert.equal(
      semanticToken(region, "card02Border"),
      `canvas-${suffix}-card-02-border`,
    );
    assert.equal(
      semanticToken(region, "card03Shadow"),
      `canvas-${suffix}-card-03-shadow`,
    );
    assert.equal(
      defaultColorReference(region, "card02"),
      `var(--canvas-${suffix}-card-02,var(--canvas-${suffix}))`,
    );
    assert.equal(
      defaultColorReference(region, "card03Border"),
      `var(--canvas-${suffix}-card-03-border,var(--canvas-${suffix}-border))`,
    );
  }
  assert.equal(semanticToken("page", "h2"), "ink-page-second-header");
  assert.equal(defaultColorReference("footer", "text"), "var(--ink-footer)");
  assert.equal(semanticToken("hero", "background"), "canvas-hero");
  assert.equal(semanticToken("hero", "primary"), "accent-hero-canvas");
  assert.equal(semanticToken("hero", "h1"), "ink-hero-h1");
  assert.equal(defaultColorReference("hero", "text"), "var(--ink-hero)");
});

test("hero assignments round-trip by theme and remain independent of page colors", () => {
  const saved = group();
  saved.themes.light.hero.background = "var(--color-magical-merlin-950)";
  saved.themes.dark.hero.text = "#abcdef";
  const [restored] = parseStyleGroups(serializeStyleGroups([saved]));
  assert.deepEqual(restored, saved);
  assert.equal(restored.themes.light.page.background, "theme");
  assert.equal(restored.themes.dark.hero.background, "theme");
  delete saved.themes.light.hero;
  assert.throws(() => parseStyleGroups(serializeStyleGroups([saved])), /hero/);
  saved.themes.light.hero = {
    ...createDefaultColors().hero,
    text: "var(--unknown)",
  };
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([saved])),
    /Invalid text color for hero/,
  );
});

test("version 3 groups keep their colors and adopt hero theme defaults", () => {
  const saved = group();
  saved.themes.light.page.background = "#abcdef";
  saved.themes.dark.global.ctaPrimary = "var(--color-cardamom-300)";
  delete saved.themes.light.hero;
  delete saved.themes.dark.hero;
  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 3, groups: [saved] }),
  );
  assert.equal(restored.themes.light.page.background, "#abcdef");
  assert.equal(
    restored.themes.dark.global.ctaPrimary,
    "var(--color-cardamom-300)",
  );
  assert.deepEqual(restored.themes.light.hero, createDefaultColors().hero);
  restored.themes.light.hero.background = "#123456";
  assert.equal(restored.themes.dark.hero.background, "theme");
});

test("palette imports reject unknown primitives, arbitrary variables, and missing themes", () => {
  for (const value of [
    "var(--color-not-a-palette-500)",
    "var(--canvas-page)",
    "var(--color-magical-merlin-500);display:none",
  ]) {
    const saved = group();
    saved.themes.light.page.background = value;
    assert.throws(
      () => parseStyleGroups(serializeStyleGroups([saved])),
      /Invalid background/,
    );
  }
  const saved = group();
  delete saved.themes.dark;
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([saved])),
    /theme palette/,
  );
});

test("editing areas expose only their own controls without losing card and brand editing", () => {
  assert.equal(isColorRoleVisible("section1", "background"), true);
  assert.equal(isColorRoleVisible("section1", "h1"), true);
  assert.equal(isColorRoleVisible("section1", "primary"), true);
  assert.equal(isColorRoleVisible("section1", "brandFirst"), false);
  assert.equal(isColorRoleVisible("section1", "ctaPrimary"), false);
  assert.equal(isColorRoleVisible("section1", "card"), true);
  assert.equal(isColorRoleVisible("section6", "card03Shadow"), true);
  assert.equal(isColorRoleVisible("page", "card02"), true);
  assert.equal(isColorRoleVisible("hero", "cardBorder"), true);
  assert.equal(isColorRoleVisible("hero", "subsectionBorder"), true);
  assert.equal(isColorRoleVisible("header", "subsectionShadow"), false);
  assert.equal(isColorRoleVisible("section3", "card"), true);
  assert.equal(isColorRoleVisible("section4", "cardText"), true);
  assert.equal(isColorRoleVisible("page", "brandFirst"), true);
  assert.equal(isColorRoleVisible("page", "ctaPrimary"), true);
  assert.equal(isColorRoleVisible("header", "secondary"), false);
});

test("three cards round-trip independent canvases, borders, and shadows", () => {
  const saved = group();
  saved.themes.light.section3.card = "#123456";
  saved.themes.light.section3.card02 = "#abcdef";
  saved.themes.light.section3.card02Border = "var(--color-magical-merlin-500)";
  saved.themes.light.page.card03Border = "#123456";
  saved.themes.dark.section3.card03Shadow = "var(--color-dark-rift-950)";
  const [restored] = parseStyleGroups(serializeStyleGroups([saved]));
  assert.deepEqual(restored, saved);
  assert.equal(restored.themes.light.section2.card02, "theme");
  assert.equal(restored.themes.dark.section3.card02Border, "theme");
  assert.equal(semanticToken("page", "card"), "canvas-page-card-01");
  assert.equal(
    semanticToken("page", "card02Border"),
    "canvas-page-card-02-border",
  );
  assert.equal(
    semanticToken("page", "card03Shadow"),
    "canvas-page-card-03-shadow",
  );
  assert.equal(
    defaultColorReference("page", "card03"),
    "var(--canvas-page-card-03,var(--canvas-page))",
  );
  delete saved.themes.light.section3.card03Shadow;
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([saved])),
    /card03Shadow/,
  );
  saved.themes.light.section3.card03Shadow = "url(unsafe)";
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([saved])),
    /card03Shadow/,
  );
});

test("interactive colors round-trip independently for each area and theme", () => {
  const saved = group();
  saved.themes.light.header.buttonHoverBackground =
    "var(--color-magical-merlin-600)";
  saved.themes.light.hero.linkColor = "#abcdef";
  saved.themes.light.section3.visitedColor = "var(--color-yellow-mana-500)";
  saved.themes.dark.footer.iconFocus = "var(--color-dark-rift-300)";

  const [restored] = parseStyleGroups(serializeStyleGroups([saved]));
  assert.deepEqual(restored, saved);
  assert.equal(
    restored.themes.light.header.buttonHoverBackground,
    "var(--color-magical-merlin-600)",
  );
  assert.equal(restored.themes.light.hero.linkColor, "#abcdef");
  assert.equal(
    restored.themes.light.section3.visitedColor,
    "var(--color-yellow-mana-500)",
  );
  assert.equal(
    restored.themes.dark.footer.iconFocus,
    "var(--color-dark-rift-300)",
  );
  assert.equal(
    defaultColorReference("header", "buttonHoverBackground"),
    "var(--sample-accentFocus)",
  );
  assert.equal(semanticToken("section3", "h4"), "ink-03-h4");
  assert.equal(semanticToken("page", "h4"), null);
  assert.equal(defaultColorReference("page", "h4"), "var(--sample-h3)");
  assert.equal(
    defaultColorReference("footer", "visitedColor"),
    "var(--sample-text)",
  );
  for (const { key: region } of regions) {
    for (const { key } of interactiveColorRoles) {
      assert.equal(isColorRoleVisible(region, key), true);
    }
  }
});

test("version 6 groups adopt theme defaults for new interactive colors", () => {
  const saved = group();
  saved.themes.light.page.primary = "#123456";
  for (const theme of Object.values(saved.themes)) {
    for (const { key: region } of regions) {
      for (const { key } of interactiveColorRoles) {
        delete theme[region][key];
      }
    }
  }

  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 6, groups: [saved] }),
  );
  assert.equal(restored.themes.light.page.primary, "#123456");
  assert.equal(restored.themes.light.page.buttonHoverBackground, "theme");
  assert.equal(restored.themes.dark.footer.visitedColor, "theme");
});

test("version 7 groups adopt theme defaults for H4 colors", () => {
  const saved = group();
  saved.themes.light.hero.h3 = "#123456";
  saved.themes.light.section3.h4 = "#abcdef";
  for (const theme of Object.values(saved.themes)) {
    for (const { key: region } of regions) delete theme[region].h4;
  }

  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 7, groups: [saved] }),
  );
  assert.equal(restored.themes.light.hero.h3, "#123456");
  assert.equal(restored.themes.light.section3.h4, "theme");
});

test("version 8 groups adopt theme defaults for component border and shadow colors", () => {
  const saved = group();
  saved.themes.light.section3.border = "#123456";
  saved.themes.light.section3.accentBorder = "#abcdef";
  for (const theme of Object.values(saved.themes)) {
    for (const { key: region } of regions) {
      for (const role of [
        "buttonShadow",
        "iconBorder",
        "iconShadow",
        "subsectionBorder",
        "subsectionShadow",
      ]) {
        delete theme[region][role];
      }
    }
  }

  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 8, groups: [saved] }),
  );
  assert.equal(restored.themes.light.section3.border, "#123456");
  assert.equal(restored.themes.light.section3.accentBorder, "#abcdef");
  assert.equal(restored.themes.light.section3.buttonShadow, "theme");
  assert.equal(restored.themes.dark.hero.iconBorder, "theme");
  assert.equal(restored.themes.light.section3.iconShadow, "theme");
  assert.equal(restored.themes.light.section3.subsectionBorder, "theme");
  assert.equal(restored.themes.dark.section6.subsectionShadow, "theme");
  assert.equal(
    defaultColorReference("section3", "subsectionBorder"),
    "var(--sample-card03Border)",
  );
  assert.equal(
    defaultColorReference("section3", "iconBorder"),
    "var(--sample-accentBorder)",
  );
  assert.equal(
    defaultColorReference("section3", "buttonShadow"),
    "var(--sample-shadow)",
  );
  assert.equal(
    defaultColorReference("section3", "subsectionShadow"),
    "var(--sample-card03Shadow)",
  );
});

test("older theme groups migrate shared card colors to three independent cards", () => {
  for (const version of [2, 3, 4]) {
    const saved = group();
    saved.themes.light.section3.card = "#ABCDEF";
    saved.themes.dark.section3.card = "var(--color-cardamom-300)";
    saved.themes.light.section3.cardText = "#123456";
    for (const colors of Object.values(saved.themes)) {
      for (const [region, palette] of Object.entries(colors)) {
        if (region === "global") continue;
        for (const { key } of cardCanvasRoles) {
          if (key !== "card") delete palette[key];
        }
      }
      if (version < 3) delete colors.global;
      if (version < 4) delete colors.hero;
    }
    const [restored] = parseStyleGroups(
      JSON.stringify({ version, groups: [saved] }),
    );
    assert.equal(restored.themes.light.section3.card, "#abcdef");
    assert.equal(restored.themes.light.section3.card02, "#abcdef");
    assert.equal(restored.themes.light.section3.card03, "#abcdef");
    assert.equal(
      restored.themes.dark.section3.card02,
      "var(--color-cardamom-300)",
    );
    assert.equal(restored.themes.light.section3.card02Border, "theme");
    assert.equal(restored.themes.light.section3.card03Shadow, "theme");
    assert.equal(restored.themes.light.section3.cardText, "#123456");
    restored.themes.light.section3.card02 = "#000000";
    assert.equal(restored.themes.light.section3.card, "#abcdef");
    assert.equal(restored.themes.light.section3.card03, "#abcdef");
  }
});

test("style groups round-trip section IDs and reject unsafe ones", () => {
  const saved = group();
  saved.sectionIds = { page: "landing", section1: "about", hero: "hero" };
  assert.deepEqual(parseStyleGroups(serializeStyleGroups([saved])), [saved]);

  for (const [sectionIds, error] of [
    [{ section1: "has space" }, /Invalid section ID for section1/],
    [{ section1: "" }, /Invalid section ID for section1/],
    [{ section1: "x".repeat(121) }, /Invalid section ID for section1/],
    [{ header: "top" }, /Unknown section ID area "header"/],
    [{ section1: "about", section2: "about" }, /#about is used twice/],
  ]) {
    assert.throws(
      () => parseStyleGroups(serializeStyleGroups([{ ...saved, sectionIds }])),
      error,
    );
  }
  const { sectionIds: _omitted, ...missing } = saved;
  assert.throws(
    () => parseStyleGroups(serializeStyleGroups([missing])),
    /Missing section IDs/,
  );
});

test("version 10 style groups load with default section IDs", () => {
  const { sectionIds: _omitted, ...saved } = group();
  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 10, groups: [saved] }),
  );
  assert.deepEqual(restored.sectionIds, {});
  assert.deepEqual(restored.radii, saved.radii);
});

test("version 12 groups keep their contrast band and get the default band text", () => {
  const saved = group();
  saved.themes.light.global.contrastCanvas = "var(--color-sky-900)";
  delete saved.themes.light.global.contrastText;
  delete saved.themes.dark.global.contrastText;
  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 12, groups: [saved] }),
  );
  assert.equal(
    restored.themes.light.global.contrastCanvas,
    "var(--color-sky-900)",
  );
  assert.equal(restored.themes.light.global.contrastText, "theme");
  assert.equal(restored.themes.dark.global.contrastText, "theme");

  const edited = group();
  edited.themes.dark.global.contrastText = "var(--color-sky-50)";
  assert.deepEqual(parseStyleGroups(serializeStyleGroups([edited])), [edited]);
});

test("version 13 groups get theme defaults for text formatting colors", () => {
  const saved = group();
  saved.themes.light.section2.text = "#123456";
  for (const theme of ["light", "dark"])
    for (const region of Object.keys(saved.themes[theme]))
      for (const role of [
        "strong",
        "em",
        "code",
        "codeBackground",
        "pre",
        "preBackground",
      ])
        delete saved.themes[theme][region]?.[role];
  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 13, groups: [saved] }),
  );
  assert.equal(restored.themes.light.section2.text, "#123456");
  assert.equal(restored.themes.light.section2.strong, "theme");
  assert.equal(restored.themes.dark.hero.preBackground, "theme");

  const edited = group();
  edited.themes.light.hero.code = "var(--color-sky-700)";
  edited.themes.dark.section4.preBackground = "transparent";
  assert.deepEqual(parseStyleGroups(serializeStyleGroups([edited])), [edited]);
});

test("text formatting colors map to their own variables in each area", () => {
  assert.equal(semanticToken("section1", "strong"), "ink-01-strong");
  assert.equal(semanticToken("hero", "codeBackground"), "canvas-hero-code");
  assert.equal(semanticToken("page", "pre"), "ink-page-pre");
  assert.equal(semanticToken("header", "em"), null);
  assert.ok(isColorRoleVisible("section3", "preBackground"));
  assert.ok(!isColorRoleVisible("footer", "strong"));
});

test("version 14 groups get theme defaults for form, quote, list, and selection colors", () => {
  const roles = [
    "label",
    "inputText",
    "inputBackground",
    "inputBorder",
    "inputPlaceholder",
    "inputFocus",
    "blockquote",
    "blockquoteBorder",
    "divider",
    "listMarker",
    "selectionBackground",
    "selectionText",
  ];
  const saved = group();
  saved.themes.light.section1.strong = "#123456";
  for (const theme of ["light", "dark"])
    for (const region of Object.keys(saved.themes[theme]))
      for (const role of roles) delete saved.themes[theme][region]?.[role];
  const [restored] = parseStyleGroups(
    JSON.stringify({ version: 14, groups: [saved] }),
  );
  assert.equal(restored.themes.light.section1.strong, "#123456");
  for (const role of roles)
    assert.equal(restored.themes.dark.hero[role], "theme", role);

  const edited = group();
  edited.themes.light.section5.inputBorder = "var(--color-sky-400)";
  edited.themes.dark.page.selectionBackground = "var(--color-yellow-200)";
  assert.deepEqual(parseStyleGroups(serializeStyleGroups([edited])), [edited]);
});

test("form and content colors fall back to the colors components used before", () => {
  assert.equal(
    semanticToken("section1", "inputBorder"),
    "canvas-01-input-border",
  );
  assert.equal(semanticToken("hero", "label"), "ink-hero-label");
  assert.equal(semanticToken("footer", "divider"), null);
  assert.equal(
    defaultColorReference("section1", "inputPlaceholder"),
    "var(--ink-01-placeholder,var(--ink-01-muted))",
  );
  assert.equal(
    defaultColorReference("section3", "divider"),
    "var(--canvas-03-divider,var(--canvas-03-border))",
  );
  assert.equal(
    defaultColorReference("hero", "listMarker"),
    "var(--ink-hero-marker,currentColor)",
  );
  assert.ok(isColorRoleVisible("page", "selectionText"));
  assert.ok(!isColorRoleVisible("header", "inputFocus"));
});
