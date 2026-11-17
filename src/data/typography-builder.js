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
];

export const typographyFonts = {
  "var(--font-sans)": "font-sans (site sans)",
  "var(--font-display)": "font-display (site display)",
  "var(--font-serif)": "font-serif (site serif)",
  "var(--font-mono)": "font-mono (site monospace)",
  "Arial, sans-serif": "Arial",
  "Georgia, serif": "Georgia",
  "'Times New Roman', serif": "Times New Roman",
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
    options: Object.fromEntries(
      Object.entries(defaultTheme.fontWeight).map(([name, weight]) => [
        weight,
        `font-${name} (${weight})`,
      ]),
    ),
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
  const validateRules = (rules) => {
    if (!isRecord(rules)) throw new Error("Invalid typography rules.");
    for (const [element, styles] of Object.entries(rules)) {
      if (!typographyElements.includes(element) || !isRecord(styles)) {
        throw new Error(`Invalid typography element: ${element}`);
      }
      for (const [key, value] of Object.entries(styles)) {
        validateTypographyValue(key, value);
      }
    }
  };
  validateRules(config.defaults);
  for (const [id, rules] of Object.entries(config.sections)) {
    validateSectionId(id);
    validateRules(rules);
  }
  return config;
}

function quotedAttribute(value) {
  return `"${value.replace(/["\\<>]/g, (character) => `\\${character.codePointAt(0).toString(16)} `)}"`;
}

export function typographyCss(config, preview = false) {
  validateTypography(config);
  const rules = [];
  const append = (styles, prefix) => {
    for (const element of typographyElements) {
      const declarations = Object.entries(styles[element] ?? {})
        .filter(([, value]) => value !== "")
        .map(([key, value]) => `  ${key}: ${value};`);
      if (declarations.length) {
        rules.push(`${prefix}${element} {\n${declarations.join("\n")}\n}`);
      }
    }
  };
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
