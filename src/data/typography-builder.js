export const typographyElements = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "em",
  "strong",
  "code",
  "cite",
  "pre",
  "blockquote",
  // Links, e.g. the menu and logo in a header or the links in a footer.
  "a",
];

export const typographyFonts = {
  "var(--font-sans)": "font-sans (site sans)",
  "var(--font-display)": "font-display (site display)",
  "var(--font-serif)": "font-serif (site serif)",
  "var(--font-mono)": "font-mono (site monospace)",
  "var(--font-inter)": "Inter",
  "var(--font-plus-jakarta-sans)": "Plus Jakarta Sans",
  "var(--font-dm-sans)": "DM Sans",
  "var(--font-montserrat)": "Montserrat",
  "var(--font-syne)": "Syne",
  "Arial, sans-serif": "Arial",
  "Georgia, serif": "Georgia",
  "'Times New Roman', serif": "Times New Roman",
  "var(--font-space-grotesk)": "Space Grotesk",
  "var(--font-ibm-plex-mono)": "IBM Plex Mono",
  "var(--font-open-sans)": "Open Sans",
  "var(--font-roboto)": "Roboto",
  "var(--font-poppins)": "Poppins",
  "var(--font-work-sans)": "Work Sans",
  "var(--font-noto-sans)": "Noto Sans",
  "var(--font-noto-sans-display)": "Noto Sans Display",
  "var(--font-sora)": "Sora",
  "var(--font-roboto-flex)": "Roboto Flex",
  "var(--font-roboto-mono)": "Roboto Mono",
  "var(--font-roboto-condensed)": "Roboto Condensed",
  "var(--font-roboto-slab)": "Roboto Slab",
};

export const typographyProperties = [
  {
    key: "font-family",
    label: "Font family",
    options: typographyFonts,
  },
  {
    key: "font-size",
    label: "Font size",
    placeholder: "e.g. 2.5rem",
    presets: Object.fromEntries(
      Object.entries(defaultTheme.fontSize).map(([name, [size]]) => [
        size,
        `text-${name} (${size})`,
      ]),
    ),
  },
  {
    key: "font-weight",
    label: "Font weight",
    options: {
      ...Object.fromEntries(
        Object.entries(defaultTheme.fontWeight).map(([name, weight]) => [
          weight,
          `font-${name} (${weight})`,
        ]),
      ),
      1000: "font-[1000] (DM Sans)",
    },
  },
  {
    key: "line-height",
    label: "Line height",
    placeholder: "e.g. 1.5 or 24px",
    presets: Object.fromEntries(
      Object.entries(defaultTheme.lineHeight).map(([name, height]) => [
        height,
        `leading-${name} (${height})`,
      ]),
    ),
  },
  {
    key: "letter-spacing",
    label: "Letter spacing",
    placeholder: "e.g. -0.02em",
    presets: Object.fromEntries(
      Object.entries(defaultTheme.letterSpacing).map(([name, spacing]) => [
        spacing,
        `tracking-${name} (${spacing})`,
      ]),
    ),
  },
  {
    key: "font-style",
    label: "Font style",
    options: { normal: "not-italic", italic: "italic" },
  },
  {
    key: "text-transform",
    label: "Text transform",
    options: {
      none: "normal-case",
      uppercase: "uppercase",
      lowercase: "lowercase",
      capitalize: "capitalize",
    },
  },
  {
    key: "color",
    label: "Text color",
    placeholder: "e.g. #334155",
    presets: {
      "var(--color-black)": "text-black",
      "var(--color-white)": "text-white",
      transparent: "text-transparent",
      currentColor: "text-current",
      inherit: "text-inherit",
      ...Object.fromEntries(
        builtinPaletteFamilies.flatMap(({ key }) =>
          paletteShades.map((shade) => [
            `var(--color-${key}-${shade})`,
            `text-${key}-${shade}`,
          ]),
        ),
      ),
    },
  },
];

export function createTypography() {
  return { version: 1, defaults: {}, sections: {} };
}

export function validateSectionId(id) {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 120 ||
    /[\s\u0000-\u001f\u007f]/u.test(id)
  ) {
    throw new Error(
      "Use a section ID of 1-120 characters without spaces or control characters. Enter the ID without a leading #.",
    );
  }
}

export function parseIdsFromCss(css) {
  if (typeof css !== "string" || !css.trim()) return [];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const ids = new Set();
  const pattern =
    /#([a-zA-Z][\w-]*)|\[\s*id\s*=\s*["']?([a-zA-Z0-9_-]+)["']?\s*\]/g;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "{") {
      let start = i - 1;
      while (
        start >= 0 &&
        stripped[start] !== ";" &&
        stripped[start] !== "{" &&
        stripped[start] !== "}"
      ) {
        start--;
      }
      const selectorText = stripped.slice(start + 1, i);
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(selectorText)) !== null) {
        const id = match[1] || match[2];
        if (id) ids.add(id);
      }
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

export function appendIdToCss(css, id) {
  const cleanId = id.trim().replace(/^#/, "");
  validateSectionId(cleanId);
  const existing = parseIdsFromCss(css);
  if (existing.includes(cleanId)) return css;
  const trimmed = typeof css === "string" ? css.trimEnd() : "";
  const rule = `\n\n#${cleanId} {\n}\n`;
  return trimmed ? `${trimmed}${rule}` : `#${cleanId} {\n}\n`;
}

export async function readThemeIdFile(projectDirectory) {
  if (!projectDirectory) return { handle: null, css: "" };
  try {
    let src;
    try {
      src = await projectDirectory.getDirectoryHandle("src");
    } catch {
      src = projectDirectory;
    }
    const styles = await src.getDirectoryHandle("styles");
    let themeDir;
    try {
      themeDir = await styles.getDirectoryHandle("themes");
    } catch {
      return { handle: null, css: "" };
    }
    const fileHandle = await themeDir.getFileHandle("id.css");
    const file = await fileHandle.getFile();
    const css = await file.text();
    return { handle: fileHandle, css };
  } catch {
    return { handle: null, css: "" };
  }
}

export async function saveThemeIdFile(projectDirectory, content) {
  if (!projectDirectory) throw new Error("No project directory provided.");
  let src;
  try {
    src = await projectDirectory.getDirectoryHandle("src");
  } catch {
    src = projectDirectory;
  }
  const styles = await src.getDirectoryHandle("styles");
  const themeDir = await styles.getDirectoryHandle("themes", { create: true });
  const fileHandle = await themeDir.getFileHandle("id.css", { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(content);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
  return fileHandle;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateTypographyValue(key, value) {
  const property = typographyProperties.find(
    (property) => property.key === key,
  );
  if (!property || typeof value !== "string") {
    throw new Error(`Unknown typography property or invalid value: ${key}`);
  }
  if (
    value === "" ||
    (property.presets && Object.hasOwn(property.presets, value))
  )
    return;
  let valid;
  if (property.options) {
    valid = Object.hasOwn(property.options, value);
  } else if (key === "color") {
    valid = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value);
  } else {
    const length = /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%)$/;
    if (key === "letter-spacing") {
      valid =
        value === "normal" ||
        /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)$/.test(value) ||
        value === "0";
    } else if (key === "line-height") {
      valid =
        value === "normal" ||
        length.test(value) ||
        /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value);
    } else {
      valid = length.test(value) || value === "0";
    }
  }
  if (!valid) {
    throw new Error(
      `Invalid ${property.label.toLowerCase()}. Use a listed option or a value like ${property.placeholder?.replace("e.g. ", "") ?? "the examples shown"}.`,
    );
  }
}

export function validateTypography(config) {
  if (
    !isRecord(config) ||
    config.version !== 1 ||
    !isRecord(config.defaults) ||
    !isRecord(config.sections)
  ) {
    throw new Error("Invalid typography settings or unsupported version.");
  }
  const validateRules = validateTypographyRules;
  validateRules(config.defaults);
  for (const [id, rules] of Object.entries(config.sections)) {
    validateSectionId(id);
    validateRules(rules);
  }
  return config;
}

/** Validates one set of rules: { h1: { "font-size": "2rem" }, p: {...} }. */
export function validateTypographyRules(rules) {
  if (!isRecord(rules)) throw new Error("Invalid typography rules.");
  for (const [element, styles] of Object.entries(rules)) {
    if (!typographyElements.includes(element) || !isRecord(styles)) {
      throw new Error(`Invalid typography element: ${element}`);
    }
    for (const [key, value] of Object.entries(styles)) {
      validateTypographyValue(key, value);
    }
  }
  return rules;
}

/** CSS for one set of rules, each selector prefixed (e.g. ".sg-x-hero "). */
export function typographyRulesCss(rules, prefix = "") {
  validateTypographyRules(rules);
  const css = [];
  for (const element of typographyElements) {
    const declarations = Object.entries(rules[element] ?? {})
      .filter(([, value]) => value !== "")
      .map(([key, value]) => `  ${key}: ${value};`);
    if (declarations.length)
      css.push(`${prefix}${element} {\n${declarations.join("\n")}\n}`);
  }
  return css;
}

function quotedAttribute(value) {
  return `"${value.replace(/["\\<>]/g, (character) => `\\${character.codePointAt(0).toString(16)} `)}"`;
}

export function typographyCss(config, preview = false) {
  validateTypography(config);
  const rules = [];
  const append = (styles, prefix) =>
    rules.push(...typographyRulesCss(styles, prefix));
  append(config.defaults, preview ? "[data-typography-preview] " : "");
  for (const [id, styles] of Object.entries(config.sections)) {
    append(
      styles,
      preview
        ? `[data-typography-preview] section[data-typography-section=${quotedAttribute(id)}] `
        : `section[id=${quotedAttribute(id)}] `,
    );
  }
  return rules.join("\n\n");
}

const marker = "/* typography-builder: ";

export function serializeTypography(config) {
  const css = typographyCss(config);
  return `${marker}${encodeURIComponent(JSON.stringify(config))} */\n\n${css}\n`;
}

export function parseTypography(source) {
  if (source.trim() === "") return createTypography();
  if (!source.startsWith(marker)) {
    throw new Error(
      "This stylesheet does not contain Typography Builder settings.",
    );
  }
  const end = source.indexOf(" */", marker.length);
  if (end === -1) throw new Error("Incomplete Typography Builder settings.");
  return validateTypography(
    JSON.parse(decodeURIComponent(source.slice(marker.length, end))),
  );
}
import defaultTheme from "tailwindcss/defaultTheme";
import { builtinPaletteFamilies, paletteShades } from "./palette.js";
