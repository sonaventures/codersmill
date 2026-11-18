import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  addPalette,
  addPalettes,
  builtinPaletteFamilies,
  findPaletteReferences,
  isOklch,
  paletteImportExample,
  paletteShades,
  readOklchPalettes,
  readOklchPaletteFiles,
  readPalette,
  removePalette,
} from "../src/data/palette.js";
import {
  isColorValue,
  paletteColors,
  paletteFamilies,
  setPaletteFamilies,
} from "../src/data/style-groups.ts";

const css = await readFile(
  new URL("../src/styles/themes/colors.css", import.meta.url),
  "utf8",
);
const shades = paletteShades.map(() => "oklch(62.6% 0.128 243.6)");

test("adds and removes a complete family without changing other CSS", () => {
  const updated = addPalette(css, "ocean-blue", shades);
  const family = readPalette(updated).find(({ key }) => key === "ocean-blue");
  assert.deepEqual([...family.values.values()], shades);
  const removed = removePalette(updated, "ocean-blue");
  assert.deepEqual(readPalette(removed), readPalette(css));
  assert.equal(removed, css);
});

test("rejects incomplete families, duplicate names, and unsafe colors", () => {
  assert.throws(() => addPalette(css, "bad name", shades), /lowercase/);
  assert.throws(() => addPalette(css, "iguana", shades), /already exists/);
  assert.throws(() => addPalette(css, "sky", shades), /reserved/);
  assert.throws(() => addPalette(css, "none", shades), /reserved/);
  assert.throws(() => addPalette(css, "new", shades.slice(1)), /every shade/);
  assert.throws(
    () => addPalette(css, "new", [...shades.slice(1), "red;display:none"]),
    /OKLCH color/,
  );
  assert.throws(
    () => readPalette("@theme static { --color-test-50: red; }"),
    /11 shades/,
  );
  assert.throws(() => removePalette(css, "missing"), /not found/);
  const unsafe = addPalette(css, "new", shades).replace(
    "--color-new-50: oklch(62.6% 0.128 243.6);",
    "--color-new-50: oklch(62.6% 0.128 243.6); --other-token: red;",
  );
  assert.throws(() => removePalette(unsafe, "new"), /shares a line/);
});

test("default site colors do not reference the editable custom families", () => {
  assert.ok(builtinPaletteFamilies.some(({ key }) => key === "sky"));
  assert.ok(builtinPaletteFamilies.some(({ key }) => key === "neutral"));
  for (const { key } of readPalette(css)) {
    assert.equal(
      findPaletteReferences(removePalette(css, key), key),
      false,
      key,
    );
  }
});

test("imports complete named and unnamed OKLCH CSS families", () => {
  const ramp = (prefix) =>
    paletteShades
      .map((shade) => `--${prefix}${shade}: oklch(50% 0.15 240 / 80%);`)
      .join("\n");
  const imported = readOklchPalettes(
    `/* --color-fake-50: red; */ @theme { ${ramp("color-ocean-")} ${ramp("")} }`,
  );
  assert.deepEqual(
    imported.map(({ key }) => key),
    ["ocean", ""],
  );
  assert.equal(imported[0].values.length, 11);
  assert.equal(imported[1].values[10], "oklch(50% 0.15 240 / 80%)");
  assert.equal(readOklchPalettes(css).length, readPalette(css).length);
});

test("the downloadable plain-text example imports and saves both complete families", () => {
  const imported = readOklchPalettes(
    "\uFEFF" + paletteImportExample.replaceAll("\n", "\r\n"),
  );
  assert.deepEqual(
    imported.map(({ key }) => key),
    ["ocean-blue", "orchid-bloom"],
  );
  const updated = addPalettes(css, imported);
  for (const { key, values } of imported) {
    assert.deepEqual(
      [
        ...readPalette(updated)
          .find((family) => family.key === key)
          .values.values(),
      ],
      values,
    );
  }
});

test("validates the entire batch before returning CSS to save", () => {
  const family = (key, values = shades) => ({ key, values });
  assert.throws(
    () => addPalettes(css, [family("ocean-blue"), family("ocean-blue")]),
    /ocean-blue.*already exists/,
  );
  assert.throws(
    () => addPalettes(css, [family("ocean-blue"), family("iguana")]),
    /iguana.*already exists/,
  );
  assert.throws(
    () => addPalettes(css, [family("ocean-blue"), family("sky")]),
    /sky.*reserved/,
  );
  assert.throws(
    () => addPalettes(css, [family("ocean-blue"), family("bad name")]),
    /lowercase/,
  );
  assert.throws(
    () => addPalettes(css, [family("ocean-blue"), family("a".repeat(61))]),
    /60 characters/,
  );
  assert.throws(
    () =>
      addPalettes(css, [
        family("ocean-blue"),
        family("orchid-bloom", [...shades.slice(1), "red"]),
      ]),
    /OKLCH/,
  );
});

test("imports every selected file, including files with multiple families", async () => {
  const [ocean, orchid] = paletteImportExample.split("\n\n");
  const imported = await readOklchPaletteFiles([
    new File([ocean], "ocean.txt"),
    new File(
      [orchid, "\n\n", ocean.replaceAll("ocean-blue", "sea-glass")],
      "more.css",
    ),
  ]);
  assert.deepEqual(
    imported.map(({ key }) => key),
    ["ocean-blue", "orchid-bloom", "sea-glass"],
  );
  const updated = addPalettes(css, imported);
  for (const { key, values } of imported)
    assert.deepEqual(
      [
        ...readPalette(updated)
          .find((family) => family.key === key)
          .values.values(),
      ],
      values,
    );
  assert.equal(
    (
      await readOklchPaletteFiles([
        new File([paletteImportExample.padEnd(1_000_000)], "maximum.txt"),
      ])
    ).length,
    2,
  );
});

test("rejects the whole file selection if one file is invalid or the total is oversized", async () => {
  const [ocean] = paletteImportExample.split("\n\n");
  await assert.rejects(
    readOklchPaletteFiles([
      new File([ocean], "ocean.txt"),
      new File(["--color-broken-50: oklch(95% 0.1 240);"], "broken.txt"),
    ]),
    /broken\.txt:.*missing shades/,
  );
  await assert.rejects(
    readOklchPaletteFiles([
      new File([" ".repeat(600_000)], "first.txt"),
      new File([" ".repeat(400_001)], "second.txt"),
    ]),
    /totaling no more than 1 MB/,
  );
});

test("rejects incomplete, duplicate, non-OKLCH and unsafe imported shades", () => {
  assert.throws(() => readOklchPalettes("body { color: red; }"), /No 50-950/);
  assert.throws(
    () => readOklchPalettes("--color-ocean-50: oklch(95% 0.1 240);"),
    /missing shades/,
  );
  assert.throws(() => readOklchPalettes("--color-ocean-50: #ffffff;"), /OKLCH/);
  assert.throws(
    () =>
      readOklchPalettes(
        "--color-ocean-50: oklch(95% 0.1 240); --color-ocean-50: oklch(90% 0.1 240);",
      ),
    /Duplicate shade/,
  );
  assert.equal(isOklch("oklch(50% 0.12 90deg / 0.5)"), true);
  assert.equal(isOklch("oklch(50% 0.12 90); color: red"), false);
});

test("detects CSS and Tailwind references, including references from other palettes", () => {
  assert.equal(
    findPaletteReferences("var(--color-ocean-blue-500)", "ocean-blue"),
    true,
  );
  assert.equal(
    findPaletteReferences("bg-ocean-blue-50/20", "ocean-blue"),
    true,
  );
  assert.equal(
    findPaletteReferences("var(--color-ocean-blue-5000)", "ocean-blue"),
    false,
  );
  const added = addPalette(css, "ocean-blue", shades);
  const linked = added.replace(
    /(--color-iguana-50:)[^;]+;/,
    "$1 var(--color-ocean-blue-500);",
  );
  assert.equal(
    findPaletteReferences(removePalette(linked, "ocean-blue"), "ocean-blue"),
    true,
  );
});

test("the theme selector accepts only the currently configured families", () => {
  const original = [...paletteFamilies];
  try {
    setPaletteFamilies(readPalette(addPalette(css, "ocean-blue", shades)));
    assert.ok(paletteColors.includes("ocean-blue-500"));
    assert.ok(paletteColors.includes("sky-500"));
    assert.equal(isColorValue("var(--color-ocean-blue-500)"), true);
    setPaletteFamilies(readPalette(css));
    assert.equal(isColorValue("var(--color-ocean-blue-500)"), false);
    assert.equal(isColorValue("var(--color-sky-500)"), true);
  } finally {
    setPaletteFamilies(original);
  }
});
