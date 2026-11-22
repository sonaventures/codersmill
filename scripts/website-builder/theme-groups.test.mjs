import assert from "node:assert/strict";
import test from "node:test";
import {
  accentColorRoles,
  cardCanvasRoles,
  createDefaultColors,
  defaultColorReference,
  defaultRadii,
  getColor,
  interactiveColorRoles,
  isColorRoleVisible,
  mergeThemeGroups,
  parseThemeGroups,
  removeThemeGroupJson,
  upsertThemeGroupJson,
  regions,
  semanticToken,
  setColor,
  serializeThemeGroups,
} from "../../src/data/website-builder/theme-groups.ts";

// Accent colors as theme group files saved them before version 28.
const oldAccentNames = {
  accent1: "primary",
  accent1Text: "primaryText",
  accent1Border: "accentBorder",
  accent1Shadow: "buttonShadow",
  accent1Hover: "primaryHover",
  accent2: "secondary",
  accent2Text: "secondaryText",
  accent2Border: "secondaryBorder",
  accent2Shadow: "secondaryShadow",
  accent2Hover: "secondaryHover",
  accent2HoverText: "secondaryHoverText",
  accent3Hover: "learnMoreHover",
};

/** A theme group file from an older version, with the old accent names. */
function legacyJson(version, groups) {
  const old = structuredClone(groups);
  for (const saved of old) {
    const palettes = saved.colors
      ? [saved.colors]
      : Object.values(saved.themes ?? {}).filter(Boolean);
    for (const palette of palettes)
      for (const [region, colors] of Object.entries(palette)) {
        if (region === "global" || !colors) continue;
        for (const [now, before] of Object.entries(oldAccentNames))
          if (now in colors) colors[before] = colors[now];
        for (const { key } of accentColorRoles) delete colors[key];
      }
  }
  return JSON.stringify({ version, groups: old });
}

const group = () => ({
  id: "coastal",
  name: "Coastal calm",
  themes: { light: createDefaultColors(), dark: createDefaultColors() },
  radii: { ...defaultRadii },
  sectionIds: {},
  widths: {},
  typography: {},
});

test("theme groups round-trip independent area palettes", () => {
  const saved = group();
  saved.themes.light.section3.background = "var(--color-magical-merlin-500)";
  saved.themes.dark.section3.background = "var(--color-dark-rift-900)";
  const [restored] = parseThemeGroups(serializeThemeGroups([saved]));
  assert.deepEqual(restored, saved);
  assert.notEqual(
    restored.themes.light.section2.background,
    saved.themes.light.section3.background,
  );
  restored.themes.light.section3.text = "#abcdef";
  assert.notEqual(restored.themes.light.section2.text, "#abcdef");
  assert.notEqual(restored.themes.dark.section3.text, "#abcdef");
});

test("theme groups round-trip independent global corner radii", () => {
  const saved = group();
  saved.radii = {
    section: "3xl",
    card: "none",
    subsection: "sm",
    accent: "lg",
    cta: "3xl",
  };
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([saved])), [saved]);

  saved.radii.card = "1px; color: red";
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([saved])),
    /Invalid card corner radius/,
  );
  delete saved.radii;
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([saved])),
    /Missing corner radii/,
  );
});

test("version 9 theme groups retain colors and get the original corner radii", () => {
  const saved = group();
  saved.themes.light.section1.border = "#123456";
  delete saved.radii;
  const [restored] = parseThemeGroups(legacyJson(9, [saved]));
  assert.deepEqual(restored.themes, saved.themes);
  assert.deepEqual(restored.radii, {
    section: "none",
    card: "xl",
    subsection: "xl",
    accent: "sm",
    cta: "sm",
  });
});

test("transparent selections and Tailwind colors round-trip in both themes", () => {
  const saved = group();
  saved.themes.light.page.background = "transparent";
  saved.themes.light.global.brandFirst = "transparent";
  saved.themes.light.section3.accent2Text = "transparent";
  saved.themes.dark.section3.card03Border = "transparent";
  saved.themes.dark.page.background = "var(--color-sky-500)";
  const json = serializeThemeGroups([saved]);
  assert.equal(JSON.parse(json).version, 28);
  assert.deepEqual(parseThemeGroups(json), [saved]);

  const old = group();
  old.themes.light.page.background = "var(--color-magical-merlin-500)";
  assert.deepEqual(parseThemeGroups(legacyJson(5, [old])), [old]);
});

test("imports reject incomplete palettes and unsafe CSS values", () => {
  const incomplete = group();
  delete incomplete.themes.light.footer;
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([incomplete])),
    /footer/,
  );

  const invalid = group();
  invalid.themes.light.section1.background = "red;display:none";
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([invalid])),
    /Invalid background/,
  );
});

test("imports reject invalid envelopes, duplicate groups, and oversized lists", () => {
  for (const json of ["null", "[]", "{", '{"version":29,"groups":[]}']) {
    assert.throws(() => parseThemeGroups(json));
  }
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([group(), group()])),
    /unique/,
  );
  assert.throws(
    () =>
      parseThemeGroups(
        serializeThemeGroups([
          group(),
          { ...group(), id: "other", name: "COASTAL CALM" },
        ]),
      ),
    /unique/,
  );
  assert.throws(
    () =>
      parseThemeGroups(
        serializeThemeGroups(Array.from({ length: 101 }, group)),
      ),
    /100/,
  );
});

test("imports normalize names and hex colors and reject blank names", () => {
  const saved = group();
  saved.name = "  Summer  ";
  saved.themes.light.header.background = "#ABCDEF";
  const [restored] = parseThemeGroups(serializeThemeGroups([saved]));
  assert.equal(restored.name, "Summer");
  assert.equal(restored.themes.light.header.background, "#abcdef");
  saved.name = "   ";
  assert.throws(() => parseThemeGroups(serializeThemeGroups([saved])), /name/);
});

test("legacy hex groups migrate without losing colors in either theme", () => {
  const colors = createDefaultColors();
  for (const palette of Object.values(colors)) {
    for (const role of Object.keys(palette)) palette[role] = "#ABCDEF";
    delete palette.shadow;
    delete palette.accent1Border;
    delete palette.accentFocus;
  }
  delete colors.global;
  delete colors.hero;
  const [restored] = parseThemeGroups(
    legacyJson(1, [{ id: "legacy", name: "Original", colors }]),
  );
  assert.equal(restored.themes.light.header.background, "#abcdef");
  assert.equal(restored.themes.dark.header.background, "#abcdef");
  assert.equal(restored.themes.light.header.accent1Border, "#abcdef");
  restored.themes.light.header.background = "#123456";
  assert.equal(restored.themes.dark.header.background, "#abcdef");
  assert.equal(restored.themes.light.hero.background, "theme");
  assert.equal(restored.themes.light.section1.card02, "#abcdef");
  assert.equal(restored.themes.light.section1.card03Border, "theme");
  assert.equal(JSON.parse(serializeThemeGroups([restored])).version, 28);
});

test("brand assignments are page-wide and round-trip independently by theme", () => {
  const saved = group();
  setColor(
    saved.themes.light,
    "header",
    "brandFirst",
    "var(--color-magical-merlin-500)",
  );
  setColor(saved.themes.light, "footer", "brandSecond", "#abcdef");
  setColor(
    saved.themes.dark,
    "page",
    "brandThird",
    "var(--color-cardamom-300)",
  );
  const [restored] = parseThemeGroups(serializeThemeGroups([saved]));
  assert.deepEqual(restored, saved);
  assert.equal(
    getColor(restored.themes.light, "section6", "brandFirst"),
    "var(--color-magical-merlin-500)",
  );
  assert.equal(
    getColor(restored.themes.dark, "header", "brandThird"),
    "var(--color-cardamom-300)",
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
  const [restored] = parseThemeGroups(legacyJson(2, [saved]));
  assert.equal(restored.themes.light.header.background, "#abcdef");
  assert.equal(restored.themes.light.global.brandFirst, "theme");
  assert.equal(restored.themes.dark.global.brandSecond, "theme");
  assert.equal(restored.themes.dark.hero.text, "theme");
});

test("version 3 groups reject incomplete or invalid brand and CTA assignments", () => {
  const saved = group();
  saved.themes.light.global.brandFirst = "var(--unknown)";
  assert.throws(
    () => parseThemeGroups(legacyJson(3, [saved])),
    /Invalid brandFirst/,
  );
  delete saved.themes.light.global;
  assert.throws(
    () => parseThemeGroups(legacyJson(3, [saved])),
    /Missing brand/,
  );
});

test("semantic tokens map page, header, hero, footer, and numbered sections", () => {
  assert.equal(semanticToken("page", "background"), "canvas-page");
  assert.equal(semanticToken("header", "accent1"), "accent-header-01");
  assert.equal(semanticToken("header", "text"), "ink-header");
  for (let index = 1; index <= 6; index++) {
    const region = `section${index}`;
    const suffix = String(index).padStart(2, "0");
    assert.equal(semanticToken(region, "background"), `canvas-${suffix}`);
    assert.equal(semanticToken(region, "border"), `canvas-${suffix}-border`);
    assert.equal(semanticToken(region, "accent1"), `accent-${suffix}-01`);
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
  assert.equal(semanticToken("hero", "accent1"), "accent-hero-01");
  assert.equal(semanticToken("hero", "h1"), "ink-hero-h1");
  assert.equal(defaultColorReference("hero", "text"), "var(--ink-hero)");
});

test("hero assignments round-trip by theme and remain independent of page colors", () => {
  const saved = group();
  saved.themes.light.hero.background = "var(--color-magical-merlin-950)";
  saved.themes.dark.hero.text = "#abcdef";
  const [restored] = parseThemeGroups(serializeThemeGroups([saved]));
  assert.deepEqual(restored, saved);
  assert.equal(restored.themes.light.page.background, "theme");
  assert.equal(restored.themes.dark.hero.background, "theme");
  delete saved.themes.light.hero;
  assert.throws(() => parseThemeGroups(serializeThemeGroups([saved])), /hero/);
  saved.themes.light.hero = {
    ...createDefaultColors().hero,
    text: "var(--unknown)",
  };
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([saved])),
    /Invalid text color for hero/,
  );
});

test("version 3 groups keep their colors and adopt hero theme defaults", () => {
  const saved = group();
  saved.themes.light.page.background = "#abcdef";
  saved.themes.dark.global.brandFirst = "var(--color-cardamom-300)";
  delete saved.themes.light.hero;
  delete saved.themes.dark.hero;
  const [restored] = parseThemeGroups(legacyJson(3, [saved]));
  assert.equal(restored.themes.light.page.background, "#abcdef");
  assert.equal(
    restored.themes.dark.global.brandFirst,
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
      () => parseThemeGroups(serializeThemeGroups([saved])),
      /Invalid background/,
    );
  }
  const saved = group();
  delete saved.themes.dark;
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([saved])),
    /theme palette/,
  );
});

test("editing areas expose only their own controls without losing card and brand editing", () => {
  assert.equal(isColorRoleVisible("section1", "background"), true);
  assert.equal(isColorRoleVisible("section1", "h1"), true);
  assert.equal(isColorRoleVisible("section1", "accent1"), true);
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
  // CTA colors are sitewide: edited in the Global area, in no group area.
  assert.equal(isColorRoleVisible("page", "ctaPrimary"), false);
  // Every area has all three accents, the header and footer included.
  assert.equal(isColorRoleVisible("header", "accent2"), true);
  assert.equal(isColorRoleVisible("footer", "accent3HoverBorder"), true);
});

test("three cards round-trip independent canvases, borders, and shadows", () => {
  const saved = group();
  saved.themes.light.section3.card = "#123456";
  saved.themes.light.section3.card02 = "#abcdef";
  saved.themes.light.section3.card02Border = "var(--color-magical-merlin-500)";
  saved.themes.light.page.card03Border = "#123456";
  saved.themes.dark.section3.card03Shadow = "var(--color-dark-rift-950)";
  const [restored] = parseThemeGroups(serializeThemeGroups([saved]));
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
    () => parseThemeGroups(serializeThemeGroups([saved])),
    /card03Shadow/,
  );
  saved.themes.light.section3.card03Shadow = "url(unsafe)";
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([saved])),
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

  const [restored] = parseThemeGroups(serializeThemeGroups([saved]));
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
  saved.themes.light.page.accent1 = "#123456";
  for (const theme of Object.values(saved.themes)) {
    for (const { key: region } of regions) {
      for (const { key } of interactiveColorRoles) {
        delete theme[region][key];
      }
    }
  }

  const [restored] = parseThemeGroups(legacyJson(6, [saved]));
  assert.equal(restored.themes.light.page.accent1, "#123456");
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

  const [restored] = parseThemeGroups(legacyJson(7, [saved]));
  assert.equal(restored.themes.light.hero.h3, "#123456");
  assert.equal(restored.themes.light.section3.h4, "theme");
});

test("version 8 groups adopt theme defaults for component border and shadow colors", () => {
  const saved = group();
  saved.themes.light.section3.border = "#123456";
  saved.themes.light.section3.accent1Border = "#abcdef";
  for (const theme of Object.values(saved.themes)) {
    for (const { key: region } of regions) {
      for (const role of [
        "accent1Shadow",
        "iconBorder",
        "iconShadow",
        "subsectionBorder",
        "subsectionShadow",
      ]) {
        delete theme[region][role];
      }
    }
  }

  const [restored] = parseThemeGroups(legacyJson(8, [saved]));
  assert.equal(restored.themes.light.section3.border, "#123456");
  assert.equal(restored.themes.light.section3.accent1Border, "#abcdef");
  assert.equal(restored.themes.light.section3.accent1Shadow, "theme");
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
    "var(--sample-accent1Border)",
  );
  assert.equal(
    defaultColorReference("section3", "accent1Shadow"),
    "var(--accent-03-01-shadow,var(--canvas-03-shadow))",
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
    const [restored] = parseThemeGroups(legacyJson(version, [saved]));
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

test("theme groups round-trip section IDs and reject unsafe ones", () => {
  const saved = group();
  saved.sectionIds = { page: "landing", section1: "about", hero: "hero" };
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([saved])), [saved]);

  for (const [sectionIds, error] of [
    [{ section1: "has space" }, /Invalid section ID for section1/],
    [{ section1: "" }, /Invalid section ID for section1/],
    [{ section1: "x".repeat(121) }, /Invalid section ID for section1/],
    [{ header: "top" }, /Unknown section ID area "header"/],
    [{ section1: "about", section2: "about" }, /#about is used twice/],
  ]) {
    assert.throws(
      () => parseThemeGroups(serializeThemeGroups([{ ...saved, sectionIds }])),
      error,
    );
  }
  const { sectionIds: _omitted, ...missing } = saved;
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([missing])),
    /Missing section IDs/,
  );
});

test("version 10 theme groups load with default section IDs", () => {
  const { sectionIds: _omitted, ...saved } = group();
  const [restored] = parseThemeGroups(legacyJson(10, [saved]));
  assert.deepEqual(restored.sectionIds, {});
  assert.deepEqual(restored.radii, saved.radii);
});

test("version 12 groups keep their contrast band and get the default band text", () => {
  const saved = group();
  saved.themes.light.global.contrastCanvas = "var(--color-sky-900)";
  delete saved.themes.light.global.contrastText;
  delete saved.themes.dark.global.contrastText;
  const [restored] = parseThemeGroups(legacyJson(12, [saved]));
  assert.equal(
    restored.themes.light.global.contrastCanvas,
    "var(--color-sky-900)",
  );
  assert.equal(restored.themes.light.global.contrastText, "theme");
  assert.equal(restored.themes.dark.global.contrastText, "theme");

  const edited = group();
  edited.themes.dark.global.contrastText = "var(--color-sky-50)";
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([edited])), [edited]);
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
  const [restored] = parseThemeGroups(legacyJson(13, [saved]));
  assert.equal(restored.themes.light.section2.text, "#123456");
  assert.equal(restored.themes.light.section2.strong, "theme");
  assert.equal(restored.themes.dark.hero.preBackground, "theme");

  const edited = group();
  edited.themes.light.hero.code = "var(--color-sky-700)";
  edited.themes.dark.section4.preBackground = "transparent";
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([edited])), [edited]);
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
  const [restored] = parseThemeGroups(legacyJson(14, [saved]));
  assert.equal(restored.themes.light.section1.strong, "#123456");
  for (const role of roles)
    assert.equal(restored.themes.dark.hero[role], "theme", role);

  const edited = group();
  edited.themes.light.section5.inputBorder = "var(--color-sky-400)";
  edited.themes.dark.page.selectionBackground = "var(--color-yellow-200)";
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([edited])), [edited]);
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

test("groups saved before version 24 drop their CTA colors, which are sitewide now", () => {
  for (const version of [15, 22, 23]) {
    const saved = group();
    saved.themes.light.global.ctaPrimary = "var(--color-orange-500)";
    saved.themes.dark.global.ctaTertiaryHover = "#ffffff";
    const [restored] = parseThemeGroups(legacyJson(version, [saved]));
    assert.equal(restored.themes.light.global.ctaPrimary, undefined);
    assert.equal(restored.themes.dark.global.ctaTertiaryHover, undefined);
    assert.ok(!JSON.stringify(restored.themes).includes("cta"));
  }
  assert.equal(
    semanticToken("page", "ctaPrimaryHoverText"),
    "cta-01-hover-text",
  );
  assert.equal(semanticToken("hero", "ctaTertiary"), "cta-03");
  for (const region of ["page", "hero", "section1", "footer"])
    assert.ok(!isColorRoleVisible(region, "ctaSecondaryBorder"));
});

test("theme groups round-trip typography per area and reject invalid rules", () => {
  const saved = group();
  saved.typography = {
    hero: { h1: { "font-size": "3rem", "font-weight": "700" } },
    section2: { p: { "line-height": "1.75" } },
    header: { a: { "font-weight": "600" } },
    footer: { p: { "font-size": "0.875rem" } },
  };
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([saved])), [saved]);

  for (const [typography, error] of [
    [{ sidebar: {} }, /Unknown typography area "sidebar"/],
    [{ hero: { marquee: {} } }, /Invalid hero typography.*element: marquee/],
    [
      { hero: { h1: { "font-size": "huge" } } },
      /Invalid hero typography.*font size/,
    ],
    [
      { hero: { h1: { "font-size": "1rem; color: red" } } },
      /Invalid hero typography/,
    ],
  ])
    assert.throws(
      () => parseThemeGroups(serializeThemeGroups([{ ...saved, typography }])),
      error,
    );
  const { typography: _omitted, ...missing } = saved;
  assert.throws(
    () => parseThemeGroups(serializeThemeGroups([missing])),
    /Missing typography/,
  );
});

test("version 16 groups load with no group typography", () => {
  const { typography: _omitted, ...saved } = group();
  saved.themes.light.hero.background = "#123456";
  const [restored] = parseThemeGroups(legacyJson(16, [saved]));
  assert.deepEqual(restored.typography, {});
  assert.equal(restored.themes.light.hero.background, "#123456");
});

test("project theme groups merge into a browser's groups without duplicates", () => {
  const browser = [group()];
  const sameId = { ...group(), name: "Renamed elsewhere" };
  const sameName = { ...group(), id: "other-id", name: "COASTAL CALM" };
  const fresh = { ...group(), id: "sample", name: "sample" };
  const merged = mergeThemeGroups(browser, [sameId, sameName, fresh]);
  assert.deepEqual(
    merged.map(({ name }) => name),
    ["Coastal calm", "sample"],
  );
  assert.equal(merged[0], browser[0]);
});

test("theme-groups.json gains, replaces, and loses groups", () => {
  const first = upsertThemeGroupJson("", group());
  assert.equal(JSON.parse(first).version, 28);
  const changed = group();
  changed.themes.light.hero.background = "#123456";
  const second = upsertThemeGroupJson(
    upsertThemeGroupJson(first, { ...group(), id: "sample", name: "sample" }),
    changed,
  );
  const saved = parseThemeGroups(second);
  assert.deepEqual(
    saved.map(({ name }) => name),
    ["sample", "Coastal calm"],
  );
  assert.equal(saved[1].themes.light.hero.background, "#123456");
  assert.deepEqual(
    parseThemeGroups(removeThemeGroupJson(second, "sample")).map(
      ({ name }) => name,
    ),
    ["Coastal calm"],
  );
});

test("version 17 groups get default Accent 2 shadow and hover colors", () => {
  const saved = group();
  saved.themes.light.section1.accent2 = "#123456";
  for (const theme of ["light", "dark"])
    for (const region of Object.keys(saved.themes[theme]))
      for (const role of ["accent2Shadow", "accent2Hover", "accent2HoverText"])
        delete saved.themes[theme][region]?.[role];
  const [restored] = parseThemeGroups(legacyJson(17, [saved]));
  assert.equal(restored.themes.light.section1.accent2, "#123456");
  assert.equal(restored.themes.light.section1.accent2Hover, "theme");
  assert.equal(restored.themes.dark.footer.accent2Shadow, "theme");
});

test("version 18 groups get a subsection background that matches card 03", () => {
  const saved = group();
  saved.themes.light.section3.card03 = "var(--color-sky-100)";
  for (const theme of ["light", "dark"])
    for (const region of Object.keys(saved.themes[theme]))
      delete saved.themes[theme][region]?.subsection;
  const [restored] = parseThemeGroups(legacyJson(18, [saved]));
  assert.equal(restored.themes.light.section3.card03, "var(--color-sky-100)");
  assert.equal(restored.themes.light.section3.subsection, "theme");
  assert.equal(
    defaultColorReference("section3", "subsection"),
    "var(--sample-card03)",
  );
  assert.ok(isColorRoleVisible("hero", "subsection"));
  assert.ok(!isColorRoleVisible("footer", "subsection"));

  const edited = group();
  edited.themes.dark.section1.subsection = "var(--color-slate-800)";
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([edited])), [edited]);
});

test("version 19 groups get a default Accent 2 border", () => {
  const saved = group();
  for (const theme of ["light", "dark"])
    for (const region of Object.keys(saved.themes[theme]))
      delete saved.themes[theme][region]?.accent2Border;
  const [restored] = parseThemeGroups(legacyJson(19, [saved]));
  assert.equal(restored.themes.light.hero.accent2Border, "theme");
});

test("version 20 groups get default Accent 1 and 3 hover colors", () => {
  const saved = group();
  for (const theme of ["light", "dark"])
    for (const region of Object.keys(saved.themes[theme]))
      for (const role of ["accent1Hover", "accent3Hover"])
        delete saved.themes[theme][region]?.[role];
  const [restored] = parseThemeGroups(legacyJson(20, [saved]));
  assert.equal(restored.themes.light.hero.accent1Hover, "theme");
  assert.equal(restored.themes.dark.section2.accent3Hover, "theme");
});

test("every area has three accents of seven colors, each with its own token", () => {
  assert.equal(accentColorRoles.length, 21);
  for (const { key: region } of regions)
    for (const { key } of accentColorRoles)
      assert.ok(isColorRoleVisible(region, key), `${key} in ${region}`);
  assert.equal(semanticToken("section2", "accent1"), "accent-02-01");
  assert.equal(
    semanticToken("hero", "accent2HoverBorder"),
    "accent-hero-02-hover-border",
  );
  assert.equal(
    semanticToken("header", "accent3Shadow"),
    "accent-header-03-shadow",
  );
  assert.equal(
    semanticToken("footer", "accent1HoverText"),
    "accent-footer-01-hover-text",
  );
  // Hover / focus colors use the accent's own; Accent 2 and 3 use Accent 1's
  // border and shadow; Accent 2 is the area's background and text, and
  // Accent 3 a text link in the focus color.
  const fallback = (role) => defaultColorReference("section1", role);
  assert.equal(fallback("accent1"), "var(--accent-01-01)");
  assert.equal(
    fallback("accent1Hover"),
    "var(--accent-01-01-hover,var(--accent-01-01))",
  );
  assert.equal(
    fallback("accent1HoverBorder"),
    "var(--accent-01-01-hover-border,var(--accent-01-01-border))",
  );
  assert.equal(fallback("accent2"), "var(--accent-01-02,var(--canvas-01))");
  assert.equal(
    fallback("accent2Text"),
    "var(--accent-01-02-text,var(--ink-01))",
  );
  assert.equal(
    fallback("accent2Border"),
    "var(--accent-01-02-border,var(--accent-01-01-border))",
  );
  assert.equal(fallback("accent3"), "var(--accent-01-03,transparent)");
  assert.equal(
    fallback("accent3Text"),
    "var(--accent-01-03-text,var(--accent-01-focus))",
  );
  assert.equal(
    fallback("accent3Shadow"),
    "var(--accent-01-03-shadow,var(--accent-01-01-shadow,var(--canvas-01-shadow)))",
  );
  const edited = group();
  edited.themes.light.hero.accent3HoverText = "var(--color-sky-600)";
  edited.themes.dark.header.accent2HoverBorder = "#abcdef";
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([edited])), [edited]);
});

test("groups saved before version 28 keep their accent colors under the new names", () => {
  const saved = group();
  const area = saved.themes.light.section2;
  Object.assign(area, {
    accent1: "var(--color-sky-500)",
    accent1Text: "#111111",
    accent1Border: "#222222",
    accent1Shadow: "#333333",
    accent1Hover: "#444444",
    accent2: "#555555",
    accent2Text: "#666666",
    accent2Border: "#777777",
    accent2Shadow: "#888888",
    accent2Hover: "#999999",
    accent2HoverText: "#aaaaaa",
    accent3Hover: "transparent",
  });
  const json = legacyJson(27, [saved]);
  assert.match(json, /"primary":"var\(--color-sky-500\)"/);
  assert.doesNotMatch(json, /accent1/);
  const [restored] = parseThemeGroups(json);
  assert.deepEqual(restored.themes, saved.themes);
  // Colors that had no older equivalent start on the theme default.
  assert.equal(restored.themes.light.section2.accent3HoverBorder, "theme");
  assert.equal(restored.themes.light.section2.accent1HoverText, "theme");
});

test("version 21 groups get default SVG fills for every area", () => {
  const saved = group();
  for (const theme of ["light", "dark"])
    for (const region of Object.keys(saved.themes[theme]))
      for (const role of ["svgFill1", "svgFill2", "svgFill3"])
        delete saved.themes[theme][region]?.[role];
  const [restored] = parseThemeGroups(legacyJson(21, [saved]));
  assert.equal(restored.themes.light.header.svgFill1, "theme");
  assert.equal(restored.themes.dark.footer.svgFill3, "theme");
  assert.equal(semanticToken("page", "svgFill1"), "ink-page-svg-01");
  assert.equal(semanticToken("header", "svgFill2"), "ink-header-svg-02");
  assert.equal(semanticToken("section1", "svgFill3"), "ink-01-svg-03");
  assert.equal(
    defaultColorReference("footer", "svgFill2"),
    "var(--ink-footer-svg-02,var(--canvas-footer))",
  );
  for (const { key } of regions)
    assert.ok(isColorRoleVisible(key, "svgFill1"), `svgFill1 in ${key}`);
  const edited = group();
  edited.themes.light.hero.svgFill2 = "var(--color-sky-500)";
  assert.deepEqual(parseThemeGroups(serializeThemeGroups([edited])), [edited]);
});

test("content widths round-trip by area, and older groups have none", () => {
  const saved = { ...group(), widths: { page: "90rem", hero: "100%" } };
  const [restored] = parseThemeGroups(serializeThemeGroups([saved]));
  assert.deepEqual(restored.widths, { page: "90rem", hero: "100%" });
  const older = JSON.parse(legacyJson(24, [group()]));
  delete older.groups[0].widths;
  assert.deepEqual(parseThemeGroups(JSON.stringify(older))[0].widths, {});
  for (const widths of [
    { header: "80rem" },
    { hero: "80vw" },
    { hero: "1rem;x" },
  ])
    assert.throws(() =>
      parseThemeGroups(serializeThemeGroups([{ ...group(), widths }])),
    );
});

test("accent and CTA corner radii round-trip, and older groups get the defaults", () => {
  const saved = {
    ...group(),
    radii: { ...group().radii, accent: "2xl", cta: "none" },
  };
  const [restored] = parseThemeGroups(serializeThemeGroups([saved]));
  assert.equal(restored.radii.accent, "2xl");
  assert.equal(restored.radii.cta, "none");
  const older = JSON.parse(legacyJson(25, [group()]));
  delete older.groups[0].radii.accent;
  delete older.groups[0].radii.cta;
  const [migrated] = parseThemeGroups(JSON.stringify(older));
  assert.equal(migrated.radii.accent, "sm");
  assert.equal(migrated.radii.cta, "sm");
  const missing = JSON.parse(serializeThemeGroups([group()]));
  delete missing.groups[0].radii.cta;
  assert.throws(
    () => parseThemeGroups(JSON.stringify(missing)),
    /cta corner radius/,
  );
});

test("SVG types have six colors each for the page, hero and sections only", async () => {
  const {
    svgTypeColorRoles,
    semanticToken,
    defaultColorReference,
    isColorRoleVisible,
  } = await import("../../src/data/website-builder/theme-groups.ts");
  assert.equal(svgTypeColorRoles.length, 24);
  assert.equal(
    semanticToken("hero", "navSvgFillHover"),
    "ink-hero-nav-svg-fill-hover",
  );
  assert.equal(semanticToken("section1", "svgIconStroke"), "ink-01-svg-stroke");
  assert.equal(
    semanticToken("page", "anchorSvgStrokeActive"),
    "ink-page-anchor-svg-stroke-active",
  );
  assert.equal(semanticToken("header", "navSvgFill"), null);
  assert.ok(!isColorRoleVisible("footer", "buttonSvgFill"));
  assert.ok(isColorRoleVisible("section4", "buttonSvgFill"));
  // Active falls back to hover, hover to the base color, the base to the text.
  assert.equal(
    defaultColorReference("hero", "buttonSvgFillActive"),
    "var(--ink-hero-button-svg-fill-active,var(--ink-hero-button-svg-fill-hover,var(--ink-hero-button-svg-fill,currentColor)))",
  );
  // Groups saved before version 27 get theme defaults for them.
  const older = JSON.parse(legacyJson(26, [group()]));
  for (const theme of ["light", "dark"])
    for (const colors of Object.values(older.groups[0].themes[theme]))
      for (const { key } of svgTypeColorRoles) delete colors[key];
  const [restored] = parseThemeGroups(JSON.stringify(older));
  assert.equal(restored.themes.light.hero.navSvgFill, "theme");
});
