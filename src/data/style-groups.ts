import { allPaletteFamilies } from "./palette.js";

export const globalColorRoles = [
  {
    key: "brandFirst",
    label: "Brand 01 / Exclusive",
    token: "brand-01",
    group: "brand",
  },
  {
    key: "brandSecond",
    label: "Brand 02 / Group",
    token: "brand-02",
    group: "brand",
  },
  {
    key: "brandThird",
    label: "Brand 03",
    token: "brand-03",
    group: "brand",
  },
  {
    key: "brandFourth",
    label: "Brand 04",
    token: "brand-04",
    group: "brand",
  },
  {
    key: "brandFifth",
    label: "Brand 05",
    token: "brand-05",
    group: "brand",
  },
  {
    key: "brandSixth",
    label: "Brand 06",
    token: "brand-06",
    group: "brand",
  },
  {
    key: "ctaPrimary",
    label: "CTA 01",
    token: "cta-01",
    group: "cta",
  },
  {
    key: "ctaSecondary",
    label: "CTA 02",
    token: "cta-02",
    group: "cta",
  },
] as const;

export const cardCanvasRoles = [
  {
    key: "card",
    card: "01",
    part: "background",
    label: "Card 01 background",
    group: "canvas",
  },
  {
    key: "cardBorder",
    card: "01",
    part: "border",
    label: "Card 01 border",
    group: "canvas",
  },
  {
    key: "cardShadow",
    card: "01",
    part: "shadow",
    label: "Card 01 shadow",
    group: "canvas",
  },
  {
    key: "card02",
    card: "02",
    part: "background",
    label: "Card 02 background",
    group: "canvas",
  },
  {
    key: "card02Border",
    card: "02",
    part: "border",
    label: "Card 02 border",
    group: "canvas",
  },
  {
    key: "card02Shadow",
    card: "02",
    part: "shadow",
    label: "Card 02 shadow",
    group: "canvas",
  },
  {
    key: "card03",
    card: "03",
    part: "background",
    label: "Card 03 background",
    group: "canvas",
  },
  {
    key: "card03Border",
    card: "03",
    part: "border",
    label: "Card 03 border",
    group: "canvas",
  },
  {
    key: "card03Shadow",
    card: "03",
    part: "shadow",
    label: "Card 03 shadow",
    group: "canvas",
  },
] as const;

export const regionColorRoles = [
  { key: "background", label: "Background", group: "canvas" },
  { key: "border", label: "Border", group: "canvas" },
  { key: "shadow", label: "Shadow", group: "canvas" },
  { key: "primary", label: "Button canvas", group: "accent" },
  { key: "primaryText", label: "Button text", group: "accent" },
  { key: "accentBorder", label: "Button border", group: "accent" },
  { key: "accentFocus", label: "Hover / focus", group: "accent" },
  { key: "text", label: "Paragraph / text", group: "ink" },
  { key: "h1", label: "H1 heading", group: "ink" },
  { key: "h2", label: "H2 heading", group: "ink" },
  { key: "h3", label: "H3 heading", group: "ink" },
  { key: "secondary", label: "Secondary button", group: "accent" },
  { key: "secondaryText", label: "Secondary button text", group: "accent" },
  ...cardCanvasRoles,
  { key: "cardText", label: "Card text / all three cards", group: "ink" },
] as const;

export const colorRoles = [...globalColorRoles, ...regionColorRoles];

export const roleGroups = [
  { key: "brand", label: "Brand / page-wide" },
  { key: "cta", label: "CTA / page-wide" },
  { key: "canvas", label: "Canvas" },
  { key: "accent", label: "Accent" },
  { key: "ink", label: "Ink" },
] as const;

export const paletteFamilies: { key: string; label: string }[] =
  allPaletteFamilies([
    { key: "maniac-mansion", label: "Maniac Mansion" },
    { key: "iguana", label: "Iguana" },
    { key: "cardamom", label: "Cardamom" },
    { key: "court-bouillon", label: "Court Bouillon" },
    { key: "yellow-mana", label: "Yellow Mana" },
    { key: "magical-merlin", label: "Magical Merlin" },
    { key: "baby-blue", label: "Baby Blue" },
    { key: "dark-rift", label: "Dark Rift" },
  ]);
export const paletteShades = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;
export const paletteColors = [
  "white",
  "black",
  ...paletteFamilies.flatMap(({ key }) =>
    paletteShades.map((shade) => `${key}-${shade}`),
  ),
];

export function setPaletteFamilies(families: { key: string; label: string }[]) {
  const allFamilies = allPaletteFamilies(families);
  paletteFamilies.splice(0, paletteFamilies.length, ...allFamilies);
  paletteColors.splice(
    0,
    paletteColors.length,
    "white",
    "black",
    ...allFamilies.flatMap(({ key }) =>
      paletteShades.map((shade) => `${key}-${shade}`),
    ),
  );
}

export const regions = [
  { key: "page", label: "Page canvas", token: "page" },
  { key: "header", label: "Header", token: "header" },
  { key: "hero", label: "Hero", token: "hero" },
  { key: "section1", label: "Section 01", token: "01" },
  { key: "section2", label: "Section 02", token: "02" },
  { key: "section3", label: "Section 03", token: "03" },
  { key: "section4", label: "Section 04", token: "04" },
  { key: "section5", label: "Section 05", token: "05" },
  { key: "section6", label: "Section 06", token: "06" },
  { key: "footer", label: "Footer", token: "footer" },
] as const;

export type ColorRole = (typeof colorRoles)[number]["key"];
export type GlobalColorRole = (typeof globalColorRoles)[number]["key"];
export type RegionColorRole = (typeof regionColorRoles)[number]["key"];
export type Region = (typeof regions)[number]["key"];
export type Colors = Record<RegionColorRole, string>;
export type GlobalColors = Record<GlobalColorRole, string>;
export type StyleColors = Record<Region, Colors> & { global: GlobalColors };
export type Theme = "light" | "dark";
export interface StyleGroup {
  id: string;
  name: string;
  themes: Record<Theme, StyleColors>;
}

// Keep the storage key so version 1 groups remain available for migration.
export const styleGroupsStorageKey = "exclusive-group-style-groups-v1";

export function isGlobalColorRole(role: ColorRole): role is GlobalColorRole {
  return globalColorRoles.some(({ key }) => key === role);
}

export function isColorRoleVisible(region: Region, role: ColorRole): boolean {
  if (isGlobalColorRole(role)) return region === "page";
  if (role.startsWith("card")) {
    return region === "page" || region.startsWith("section");
  }
  if (role === "secondary" || role === "secondaryText")
    return region !== "header";
  return true;
}

export function getColor(
  colors: StyleColors,
  region: Region,
  role: ColorRole,
): string {
  return isGlobalColorRole(role) ? colors.global[role] : colors[region][role];
}

export function setColor(
  colors: StyleColors,
  region: Region,
  role: ColorRole,
  value: string,
): void {
  if (isGlobalColorRole(role)) colors.global[role] = value;
  else colors[region][role] = value;
}

export function semanticToken(region: Region, role: ColorRole): string | null {
  const global = globalColorRoles.find(({ key }) => key === role);
  if (global) return global.token;
  const area = regions.find(({ key }) => key === region);
  if (!area) throw new Error(`Unknown style region: ${region}`);
  const suffix = area.token;
  const card = cardCanvasRoles.find(({ key }) => key === role);
  if (card && (region === "page" || region.startsWith("section"))) {
    return `canvas-${suffix}-card-${card.card}${card.part === "background" ? "" : `-${card.part}`}`;
  }
  switch (role) {
    case "background":
      return `canvas-${suffix}`;
    case "border":
      return `canvas-${suffix}-border`;
    case "shadow":
      return `canvas-${suffix}-shadow`;
    case "primary":
      return `accent-${suffix}-canvas`;
    case "primaryText":
      return `accent-${suffix}-text`;
    case "accentBorder":
      return `accent-${suffix}-border`;
    case "accentFocus":
      return `accent-${suffix}-focus`;
    case "text":
      return `ink-${suffix}`;
    case "h1":
    case "h2":
    case "h3": {
      const pageHeadings = {
        h1: "first-header",
        h2: "second-header",
        h3: "third-header",
      };
      return `ink-${suffix}-${suffix === "page" ? pageHeadings[role] : role}`;
    }
    default:
      return null;
  }
}

export function defaultColorReference(region: Region, role: ColorRole): string {
  const token = semanticToken(region, role);
  const card = cardCanvasRoles.find(({ key }) => key === role);
  if (card) {
    const fallback = defaultColorReference(region, card.part);
    return token ? `var(--${token},${fallback})` : fallback;
  }
  if (token) return `var(--${token})`;
  switch (role) {
    case "secondary":
      return `var(--${semanticToken(region, "background")})`;
    case "secondaryText":
    case "cardText":
      return `var(--${semanticToken(region, "text")})`;
    default:
      throw new Error(`Missing default for ${role}`);
  }
}

export function isColorValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === "theme" ||
      value === "transparent" ||
      /^#[0-9a-f]{6}$/i.test(value) ||
      paletteColors.some((color) => value === `var(--color-${color})`))
  );
}

export function createDefaultColors(): StyleColors {
  const global = {} as GlobalColors;
  for (const { key } of globalColorRoles) global[key] = "theme";
  const colors = { global } as StyleColors;
  for (const { key: region } of regions) {
    const palette = {} as Colors;
    for (const { key } of regionColorRoles) palette[key] = "theme";
    colors[region] = palette;
  }
  return colors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseStyleGroups(json: string): StyleGroup[] {
  const data: unknown = JSON.parse(json);
  if (
    !isRecord(data) ||
    (data.version !== 1 &&
      data.version !== 2 &&
      data.version !== 3 &&
      data.version !== 4 &&
      data.version !== 5 &&
      data.version !== 6) ||
    !Array.isArray(data.groups) ||
    data.groups.length > 100
  ) {
    throw new Error(
      "Expected a version 1, 2, 3, 4, 5, or 6 style-group file with up to 100 groups.",
    );
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  return data.groups.map((value: unknown) => {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      !value.id.trim() ||
      value.id.length > 100 ||
      typeof value.name !== "string" ||
      !value.name.trim() ||
      value.name.trim().length > 80 ||
      (data.version === 1 ? !isRecord(value.colors) : !isRecord(value.themes))
    ) {
      throw new Error(
        "Each style group needs an ID, a name, and a full palette.",
      );
    }
    const name = value.name.trim();
    if (ids.has(value.id) || names.has(name.toLowerCase())) {
      throw new Error("Style group IDs and names must be unique.");
    }
    ids.add(value.id);
    names.add(name.toLowerCase());
    const readColors = (sourceColors: unknown): StyleColors => {
      if (!isRecord(sourceColors))
        throw new Error(`Missing theme palette in "${name}".`);
      const colors = createDefaultColors();
      if (data.version >= 3) {
        const global = sourceColors.global;
        if (!isRecord(global))
          throw new Error(`Missing brand/CTA colors in "${name}".`);
        for (const { key } of globalColorRoles) {
          const color = global[key];
          if (!isColorValue(color))
            throw new Error(`Invalid ${key} color in "${name}".`);
          colors.global[key] = color.startsWith("#")
            ? color.toLowerCase()
            : color;
        }
      }
      for (const { key: region } of regions) {
        if (region === "hero" && data.version < 4) continue;
        const source = sourceColors[region];
        if (!isRecord(source)) {
          throw new Error(`Missing colors for ${region} in "${name}".`);
        }
        const regionColors = {} as Colors;
        for (const { key: role } of regionColorRoles) {
          const card = cardCanvasRoles.find(({ key }) => key === role);
          if (data.version < 5 && card && role !== "card") {
            regionColors[role] =
              card.part === "background" ? regionColors.card : "theme";
            continue;
          }
          if (
            data.version === 1 &&
            ["shadow", "accentBorder", "accentFocus"].includes(role)
          ) {
            regionColors[role] =
              role === "shadow" ? "theme" : regionColors.border;
            continue;
          }
          const color = source[role];
          if (
            !isColorValue(color) ||
            (data.version === 1 && !/^#[0-9a-f]{6}$/i.test(color))
          ) {
            throw new Error(
              `Invalid ${role} color for ${region} in "${name}".`,
            );
          }
          regionColors[role] = color.startsWith("#")
            ? color.toLowerCase()
            : color;
        }
        colors[region] = regionColors;
      }
      return colors;
    };
    const light = readColors(
      data.version === 1
        ? value.colors
        : isRecord(value.themes)
          ? value.themes.light
          : undefined,
    );
    const dark =
      data.version === 1
        ? structuredClone(light)
        : readColors(isRecord(value.themes) ? value.themes.dark : undefined);
    return { id: value.id, name, themes: { light, dark } };
  });
}

export function serializeStyleGroups(groups: StyleGroup[]): string {
  return JSON.stringify({ version: 6, groups }, null, 2);
}
