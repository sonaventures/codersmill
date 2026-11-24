import assert from "node:assert/strict";
import test from "node:test";
import {
  applyThemeClasses,
  blockMarkers,
  markerOf,
  findStyleableElements,
  isThemeClass,
  parseClassList,
  stylePresets,
  themeClassesOf,
} from "../../src/data/website-builder/component-styling.js";

const component = `---
interface Props {
  title: string;
}
const { title } = Astro.props;
const big = 2 > 1;
---

<section class="py-8 px-4">
  <!-- <a class="ignored">comment</a> -->
  <h2 class="mb-4 text-4xl font-bold">{title}</h2>
  <p>Plain text</p>
  <a href="#" class="px-4 py-2 rounded-lg hover:brightness-95" x-on:click="open = a > b">
    Get started
    <svg class="w-4 fill-ink-01-svg-01" fill="currentColor"><path d="M0 0" /></svg>
  </a>
  <button type="button" class={big ? "a" : "b"}>Dynamic</button>
  <Card title="x" />
  <input type="email" placeholder="Your email" class="w-full border" />
</section>
<script>
  document.querySelector("a").innerHTML = "<a class='script'>no</a>";
</script>
`;

test("styleable elements come from the markup only, with their text", () => {
  const elements = findStyleableElements(component);
  assert.deepEqual(
    elements.map(({ tag, kind, editable }) => [tag, kind, editable]),
    [
      ["section", "surfaces", true],
      ["h2", "headings", true],
      ["p", "text", true],
      ["a", "actions", true],
      ["svg", "icons", true],
      ["button", "actions", false],
      ["input", "fields", true],
    ],
  );
  assert.equal(elements[1].text, "{title}");
  assert.equal(elements[3].text, "Get started");
  assert.equal(
    elements[3].classValue,
    "px-4 py-2 rounded-lg hover:brightness-95",
  );
  assert.equal(elements[6].text, "placeholder: Your email");
  assert.equal(elements[1].line, 11);
});

test("theme classes are told apart from layout classes", () => {
  for (const name of [
    "bg-cta-01",
    "hover:text-cta-01-hover-text",
    "inset-ring",
    "inset-ring-cta-01-border",
    "shadow-canvas-01-card-01-shadow/20",
    "from-ink-01-highlight/[0.03]",
    "md:bg-canvas-01",
    "btn-filled",
  ])
    assert.ok(isThemeClass(name), name);
  for (const name of [
    "text-4xl",
    "bg-linear-to-r",
    "shadow-md",
    "ring-2",
    "fill-ink-01-svg-02",
    "border",
    "btn",
  ])
    assert.ok(!isThemeClass(name), name);
});

test("presets are recognised from an element's classes in any order", () => {
  const cta = stylePresets.find(({ key }) => key === "cta-01");
  const shuffled = `px-4 ${cta.classes.split(" ").reverse().join(" ")} rounded`;
  assert.equal(themeClassesOf(shuffled).preset, "cta-01");
  assert.equal(themeClassesOf("px-4 rounded").preset, "none");
  assert.deepEqual(themeClassesOf("px-4 bg-cta-01 text-ink-01"), {
    classes: ["bg-cta-01", "text-ink-01"],
    preset: "",
  });
  // Every preset only holds theme classes, so it can be replaced later.
  for (const { key, classes } of stylePresets)
    assert.ok(classes.split(" ").every(isThemeClass), key);
});

test("applying classes replaces only theme classes and keeps the rest", () => {
  const cta = stylePresets.find(({ key }) => key === "cta-01").classes;
  let source = applyThemeClasses(component, {
    1: "text-ink-01-h2",
    2: "text-ink-01-muted",
    3: cta,
  });
  let elements = findStyleableElements(source);
  assert.equal(
    elements[1].classValue,
    "mb-4 text-4xl font-bold text-ink-01-h2",
  );
  // An element without a class gets one.
  assert.match(source, /<p class="text-ink-01-muted">Plain text<\/p>/);
  assert.equal(themeClassesOf(elements[3].classValue).preset, "cta-01");
  assert.match(source, /x-on:click="open = a > b"/);
  // The SVG inside the link keeps its fill.
  assert.match(source, /class="w-4 fill-ink-01-svg-01"/);

  // Changing the preset swaps the theme classes; "none" removes them.
  source = applyThemeClasses(source, { 3: "text-ink-01-highlight", 2: "" });
  elements = findStyleableElements(source);
  assert.equal(
    elements[3].classValue,
    "px-4 py-2 rounded-lg hover:brightness-95 text-ink-01-highlight",
  );
  assert.match(source, /<p>Plain text<\/p>/);
  // Removing every theme class again gives back the original file exactly.
  assert.equal(applyThemeClasses(source, { 1: "", 3: "" }), component);
});

test("expression classes and unsafe classes are refused", () => {
  assert.throws(
    () => applyThemeClasses(component, { 5: "bg-cta-01" }),
    /sets its class with an expression/,
  );
  assert.throws(() => applyThemeClasses(component, { 99: "x" }), /no longer/);
  assert.throws(
    () => parseClassList('bg-cta-01" onload="x'),
    /not a class name/,
  );
  assert.deepEqual(parseClassList("  bg-cta-01  bg-cta-01 hover:bg-[#fff] "), [
    "bg-cta-01",
    "hover:bg-[#fff]",
  ]);
});

test("button and card presets carry the theme group's corner radius", () => {
  const radius = (key) =>
    stylePresets
      .find((preset) => preset.key === key)
      .classes.split(" ")
      .find((name) => name.startsWith("rounded-"));
  for (const key of ["cta-01", "cta-02", "cta-03"])
    assert.equal(radius(key), "rounded-cta!");
  for (const key of ["accent-01", "accent-02", "accent-03"])
    assert.equal(radius(key), "rounded-accent!");
  // Each accent button uses all seven of its colors.
  for (const number of ["01", "02", "03"]) {
    const classes = stylePresets
      .find(({ key }) => key === `accent-${number}`)
      .classes.split(" ");
    const accent = `accent-01-${number}`;
    for (const name of [
      `bg-${accent}`,
      `hover:bg-${accent}-hover`,
      `inset-ring-${accent}-border`,
      `hover:inset-ring-${accent}-hover-border`,
      `text-${accent}-text`,
      `hover:text-${accent}-hover-text`,
      `shadow-${accent}-shadow/20`,
    ])
      assert.ok(classes.includes(name), `${name} in accent-${number}`);
  }
  for (const key of ["card-01", "card-02", "card-03"])
    assert.equal(radius(key), "rounded-card!");
  assert.ok(isThemeClass("rounded-cta!"));
  assert.ok(isThemeClass("rounded-section"));
  assert.ok(!isThemeClass("rounded-lg"));
  // The element's own rounded class stays, so removing the preset restores it.
  const cta = stylePresets.find(({ key }) => key === "cta-01").classes;
  const styled = applyThemeClasses(component, { 3: cta });
  assert.match(
    findStyleableElements(styled)[3].classValue,
    /\brounded-lg\b.*rounded-cta!/,
  );
  assert.equal(applyThemeClasses(styled, { 3: "" }), component);
});

test("block markers say what an element is until a style replaces them", () => {
  const block = `<div class="card rounded-xl border p-6">
  <a href="#" class="cta-anchor btn">Start <span class="anchor-icon icon-[tabler--arrow-right] size-5"></span></a>
  <svg class="icon size-6" viewBox="0 0 24 24"><path d="M0 0" /></svg>
</div>`;
  const elements = findStyleableElements(block);
  assert.deepEqual(
    elements.map(({ tag, kind }) => [tag, kind]),
    [
      ["div", "surfaces"],
      ["a", "actions"],
      ["span", "icons"],
      ["svg", "icons"],
    ],
  );
  assert.deepEqual(
    elements.map(({ classValue }) => markerOf(classValue)?.className),
    ["card", "cta-anchor", "anchor-icon", "icon"],
  );
  // Every suggested preset exists, and markers count as theme classes.
  for (const { className, preset } of blockMarkers) {
    assert.ok(isThemeClass(className), className);
    if (preset)
      assert.ok(
        stylePresets.some(({ key }) => key === preset),
        preset,
      );
  }
  // A style replaces the marker; "No theme colors" keeps it.
  const cta = stylePresets.find(({ key }) => key === "cta-01").classes;
  const styled = applyThemeClasses(block, { 1: cta, 3: "nav-svg" });
  assert.doesNotMatch(styled, /cta-anchor/);
  assert.match(styled, /<a href="#" class="btn [^"]*bg-cta-01/);
  assert.match(styled, /<svg class="size-6 nav-svg"/);
  assert.equal(applyThemeClasses(block, { 0: "", 1: "" }), block);
});

test("a submit input marked cta-button suggests the CTA 01 style", () => {
  const block = `<input type="submit" value="Try for free" class="cta-button px-5 py-3" />`;
  const [input] = findStyleableElements(block);
  assert.equal(input.kind, "fields");
  assert.equal(markerOf(input.classValue)?.preset, "cta-01");
  const cta = stylePresets.find(({ key }) => key === "cta-01").classes;
  const styled = applyThemeClasses(block, { 0: cta });
  assert.doesNotMatch(styled, /cta-button/);
  assert.match(styled, /class="px-5 py-3 [^"]*bg-cta-01/);
});
