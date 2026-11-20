import assert from "node:assert/strict";
import test from "node:test";
import {
  generateGroupCss,
  groupClassSlug,
  groupsCssHeader,
  isGroupClassName,
  parseGroupClasses,
  upsertGroupCss,
} from "../src/data/group-classes.ts";
import { createDefaultColors, defaultRadii } from "../src/data/style-groups.ts";

const group = (name = "Coastal calm") => ({
  id: "coastal",
  name,
  themes: { light: createDefaultColors(), dark: createDefaultColors() },
  radii: { ...defaultRadii },
  sectionIds: {},
});

const ruleFor = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing rule ${selector}`);
  return css.slice(start, css.indexOf("}", start) + 1);
};

test("class names come from the style group name", () => {
  assert.equal(groupClassSlug("Coastal Calm!"), "coastal-calm");
  assert.equal(groupClassSlug("Café  Crème"), "cafe-creme");
  assert.throws(() => groupClassSlug("***"), /at least one letter/);
  assert.ok(isGroupClassName("sg-coastal-calm-hero"));
  assert.ok(isGroupClassName("sg-coastal-calm-section-3"));
  assert.ok(!isGroupClassName("sg-coastal-calm-footer"));
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
  assert.match(page, /--ink-inverse: var\(--color-orange-50\);/);
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
  assert.equal(updated.match(/style-group: coastal-calm \(/g).length, 1);
  assert.match(updated, /--canvas-hero: #123456;/);
  assert.match(updated, /\.hand-written \{ color: red; \}/);
  assert.match(updated, /style-group: night-shift \(Night shift\)/);
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
  assert.ok(!classes.some(({ className }) => className === "sg-fake-hero"));
  assert.deepEqual(parseGroupClasses(""), []);
});
