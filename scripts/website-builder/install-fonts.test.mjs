import assert from "node:assert/strict";
import test from "node:test";
import { googleFontIds } from "../../src/data/website-builder/google-font-names.js";

test("turns pasted family names into unique Fontsource package IDs", () => {
  assert.deepEqual(
    googleFontIds("Open Sans, Playfair Display\nopen-sans\nM PLUS 1p"),
    ["open-sans", "playfair-display", "m-plus-1p"],
  );
});

test("rejects flags, shell syntax, and package specs before generating a command", () => {
  for (const input of [
    "--help",
    "Outfit; echo test",
    "outfit@latest",
    "@fontsource/outfit",
  ]) {
    assert.throws(() => googleFontIds(input), /family names only/);
  }
  assert.throws(() => googleFontIds(" , "), /at least one/);
});
