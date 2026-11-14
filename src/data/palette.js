export const paletteShades = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
];

const namePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const blockPattern = /@theme\s+static\s*\{([^{}]*)\}/;
const number = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?";
const channel = `(?:none|${number}%?)`;
const hue = `(?:none|${number}(?:deg|grad|rad|turn)?)`;
const oklchPattern = new RegExp(
  `^oklch\\(\\s*${channel}\\s+${channel}\\s+${hue}\\s*(?:/\\s*${channel}\\s*)?\\)$`,
  "i",
);

export function isOklch(value) {
  return typeof value === "string" && oklchPattern.test(value.trim());
}

export function readOklchPalettes(css) {
  const families = new Map();
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const declarations = /--([a-z0-9-]+)\s*:\s*([^;{}]+);/g;
  for (const [, token, rawValue] of text.matchAll(declarations)) {
    const name = token.startsWith("color-") ? token.slice(6) : token;
    const match =
      /^(?:(.+)-)?(50|100|200|300|400|500|600|700|800|900|950)$/.exec(name);
    if (!match) continue;
    const family = match[1] || "";
    if (family && !namePattern.test(family)) continue;
    const shade = Number(match[2]);
    const value = rawValue.trim();
    if (!isOklch(value))
      throw new Error(
        `Shade ${shade}${family ? ` in ${family}` : ""} must be a numeric OKLCH color.`,
      );
    if (!families.has(family)) families.set(family, new Map());
    const values = families.get(family);
    if (values.has(shade))
      throw new Error(
        `Duplicate shade ${shade}${family ? ` in ${family}` : ""}.`,
      );
    values.set(shade, value);
  }
  if (!families.size)
    throw new Error("No 50-950 CSS custom properties were found.");
  return Array.from(families, ([key, values]) => {
    const missing = paletteShades.filter((shade) => !values.has(shade));
    if (missing.length)
      throw new Error(
        `${key || "The imported family"} is missing shades: ${missing.join(", ")}.`,
      );
    return { key, values: paletteShades.map((shade) => values.get(shade)) };
  });
}

function primitiveBlock(css) {
  const match = blockPattern.exec(css);
  if (!match) throw new Error("The @theme static palette block was not found.");
  return { body: match[1], start: match.index + match[0].indexOf("{") + 1 };
}

export function readPalette(css) {
  const { body } = primitiveBlock(css);
  const families = new Map();
  const declarations = /^\s*--color-([a-z][a-z0-9-]*)-(\d+)\s*:\s*([^;\n]+);/gm;
  for (const match of body.matchAll(declarations)) {
    const [, name, rawShade, value] = match;
    const shade = Number(rawShade);
    if (!namePattern.test(name) || !paletteShades.includes(shade)) continue;
    if (!families.has(name)) families.set(name, new Map());
    const shades = families.get(name);
    if (shades.has(shade))
      throw new Error(`Duplicate color: ${name}-${shade}.`);
    shades.set(shade, value.trim());
  }
  return Array.from(families, ([key, values]) => {
    if (values.size !== paletteShades.length)
      throw new Error(`The ${key} family does not contain all 11 shades.`);
    return {
      key,
      label: key.replace(
        /(^|-)([a-z0-9])/g,
        (_, separator, letter) =>
          `${separator ? " " : ""}${letter.toUpperCase()}`,
      ),
      values,
    };
  });
}

export function addPalette(css, name, values) {
  const families = readPalette(css);
  if (!namePattern.test(name))
    throw new Error(
      "Use a lowercase family name with letters, numbers, and hyphens.",
    );
  if (families.some(({ key }) => key === name))
    throw new Error(`The ${name} family already exists.`);
  if (
    new RegExp(
      `--color-${name}-(?:${paletteShades.join("|")})(?![a-z0-9-])`,
      "i",
    ).test(css)
  )
    throw new Error(`A color for ${name} already exists in colors.css.`);
  if (
    !Array.isArray(values) ||
    values.length !== paletteShades.length ||
    values.some((value) => !isOklch(value))
  )
    throw new Error("Enter a numeric OKLCH color for every shade.");
  const { body, start } = primitiveBlock(css);
  const lines = paletteShades
    .map(
      (shade, index) => `  --color-${name}-${shade}: ${values[index].trim()};`,
    )
    .join("\n");
  return (
    css.slice(0, start) + `\n${lines}` + body + css.slice(start + body.length)
  );
}

export function removePalette(css, name) {
  if (!readPalette(css).some(({ key }) => key === name))
    throw new Error(`The ${name} family was not found.`);
  const { body, start } = primitiveBlock(css);
  const lines = body.split("\n");
  let removed = 0;
  const next = lines
    .filter((line) => {
      if (
        !paletteShades.some((shade) =>
          new RegExp(`^\\s*--color-${name}-${shade}\\s*:`).test(line),
        )
      )
        return true;
      if (!/^\s*--color-[a-z0-9-]+\s*:[^;\n]+;[ \t]*$/.test(line))
        throw new Error(
          `Cannot safely remove ${name}: a declaration shares a line with other content.`,
        );
      removed++;
      return false;
    })
    .join("\n");
  if (removed !== paletteShades.length)
    throw new Error(
      `Cannot safely remove ${name}: expected 11 separate declarations.`,
    );
  return css.slice(0, start) + next + css.slice(start + body.length);
}

export function findPaletteReferences(text, name) {
  if (!namePattern.test(name)) throw new Error("Invalid family name.");
  return new RegExp(
    `(?:^|[^a-z0-9])${name}-(?:${paletteShades.join("|")})(?![a-z0-9-])`,
    "i",
  ).test(text);
}
