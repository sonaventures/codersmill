import assert from "node:assert/strict";
import test from "node:test";
import {
  cardCanvasRoles,
  createDefaultColors,
  defaultColorReference,
  getColor,
  isColorRoleVisible,
  parseStyleGroups,
  semanticToken,
  setColor,
  serializeStyleGroups,
} from "../src/data/style-groups.ts";

const group = () => ({
  id: "coastal",
  name: "Coastal calm",
  themes: { light: createDefaultColors(), dark: createDefaultColors() },
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
  for (const json of ["null", "[]", "{", '{"version":6,"groups":[]}']) {
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
  assert.equal(JSON.parse(serializeStyleGroups([restored])).version, 5);
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
  assert.equal(isColorRoleVisible("hero", "cardBorder"), false);
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
