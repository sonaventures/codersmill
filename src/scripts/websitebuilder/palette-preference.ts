import { builtinPaletteFamilies } from "../../data/palette.js";

const storageKey = "website-builder-tailwind-palette-only";
const builtinKeys = new Set(builtinPaletteFamilies.map(({ key }) => key));

export function usesTailwindPaletteOnly() {
  try {
    return localStorage.getItem(storageKey) === "true";
  } catch (error) {
    console.warn("Unable to read the builder palette preference:", error);
    return false;
  }
}

export function setTailwindPaletteOnly(enabled: boolean) {
  if (enabled) localStorage.setItem(storageKey, "true");
  else localStorage.removeItem(storageKey);
}

export function applyTailwindPaletteOnly(picker: HTMLSelectElement) {
  for (const option of picker.querySelectorAll<HTMLOptionElement>(
    "option[data-palette-family-option]",
  )) {
    if (!builtinKeys.has(option.value)) option.remove();
  }
}
