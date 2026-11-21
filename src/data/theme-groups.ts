import { allPaletteFamilies } from "./palette.js";
import { validateTypographyRules } from "./typography-builder.js";

const brandColorRoles = [
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
] as const;

/**
 * Sitewide colors: edited in the Theme Builder's Global area and saved to
 * src/styles/themes/sitewide.css, not with a theme group, so they apply on
 * every page whatever theme group is used.
 */
export const sitewideColorRoles = [
  {
    key: "ctaPrimary",
    label: "CTA 01",
    token: "cta-01",
    group: "cta",
  },
  {
    key: "ctaPrimaryText",
    label: "CTA 01 text",
    token: "cta-01-text",
    group: "cta",
  },
  {
    key: "ctaPrimaryBorder",
    label: "CTA 01 border",
    token: "cta-01-border",
    group: "cta",
  },
  {
    key: "ctaPrimaryHover",
    label: "CTA 01 hover / focus background",
    token: "cta-01-hover",
    group: "cta",
  },
  {
    key: "ctaPrimaryHoverText",
    label: "CTA 01 hover / focus text",
    token: "cta-01-hover-text",
    group: "cta",
  },
  {
    key: "ctaSecondary",
    label: "CTA 02",
    token: "cta-02",
    group: "cta",
  },
  {
    key: "ctaSecondaryText",
    label: "CTA 02 text",
    token: "cta-02-text",
    group: "cta",
  },
  {
    key: "ctaSecondaryBorder",
    label: "CTA 02 border",
    token: "cta-02-border",
    group: "cta",
  },
  {
    key: "ctaSecondaryHover",
    label: "CTA 02 hover / focus background",
    token: "cta-02-hover",
    group: "cta",
  },
  {
    key: "ctaSecondaryHoverText",
    label: "CTA 02 hover / focus text",
    token: "cta-02-hover-text",
    group: "cta",
  },
  {
    key: "ctaTertiary",
    label: "CTA 03",
    token: "cta-03",
    group: "cta",
  },
  {
    key: "ctaTertiaryText",
    label: "CTA 03 text",
    token: "cta-03-text",
    group: "cta",
  },
  {
    key: "ctaTertiaryBorder",
    label: "CTA 03 border",
    token: "cta-03-border",
    group: "cta",
  },
  {
    key: "ctaTertiaryHover",
    label: "CTA 03 hover / focus background",
    token: "cta-03-hover",
    group: "cta",
  },
  {
    key: "ctaTertiaryHoverText",
    label: "CTA 03 hover / focus text",
    token: "cta-03-hover-text",
    group: "cta",
  },
] as const;

const contrastColorRoles = [
  {
    key: "contrastCanvas",
    label: "Contrast band background",
    token: "canvas-contrast",
    group: "contrast",
  },
  {
    key: "contrastText",
    label: "Contrast band text",
    token: "ink-contrast",
    group: "contrast",
  },
] as const;

/** Page-wide colors saved with a theme group (on its page class). */
export const globalColorRoles = [
  ...brandColorRoles,
  ...contrastColorRoles,
] as const;

export const cardCanvasRoles = [
  {
    key: "card",
    card: "01",
    part: "background",
    label: "Card 01 background",
    group: "cards",
  },
  {
    key: "cardBorder",
    card: "01",
    part: "border",
    label: "Card 01 border",
    group: "cards",
  },
  {
    key: "cardShadow",
    card: "01",
    part: "shadow",
    label: "Card 01 shadow",
    group: "cards",
  },
  {
    key: "card02",
    card: "02",
    part: "background",
    label: "Card 02 background",
    group: "cards",
  },
  {
    key: "card02Border",
    card: "02",
    part: "border",
    label: "Card 02 border",
    group: "cards",
  },
  {
    key: "card02Shadow",
    card: "02",
    part: "shadow",
    label: "Card 02 shadow",
    group: "cards",
  },
  {
    key: "card03",
    card: "03",
    part: "background",
    label: "Card 03 background",
    group: "cards",
  },
  {
    key: "card03Border",
    card: "03",
    part: "border",
    label: "Card 03 border",
    group: "cards",
  },
  {
    key: "card03Shadow",
    card: "03",
    part: "shadow",
    label: "Card 03 shadow",
    group: "cards",
  },
] as const;

export const interactiveColorRoles = [
  { key: "iconBorder", label: "Icon border", group: "interactive" },
  { key: "iconShadow", label: "Icon shadow", group: "interactive" },
  {
    key: "buttonHoverBackground",
    label: "Button hover background",
    group: "interactive",
  },
  {
    key: "buttonHoverText",
    label: "Button hover text",
    group: "interactive",
  },
  {
    key: "buttonFocusBackground",
    label: "Button focus background",
    group: "interactive",
  },
  {
    key: "buttonFocusText",
    label: "Button focus text",
    group: "interactive",
  },
  {
    key: "buttonActiveBackground",
    label: "Button active background",
    group: "interactive",
  },
  {
    key: "buttonActiveText",
    label: "Button active text",
    group: "interactive",
  },
  { key: "linkColor", label: "Link (:link)", group: "interactive" },
  {
    key: "visitedColor",
    label: "Visited link (:visited)",
    group: "interactive",
  },
  { key: "linkHover", label: "Link hover", group: "interactive" },
  { key: "linkFocus", label: "Link focus", group: "interactive" },
  { key: "linkActive", label: "Link active", group: "interactive" },
  { key: "iconColor", label: "Icon", group: "interactive" },
  { key: "iconHover", label: "Icon hover", group: "interactive" },
  { key: "iconFocus", label: "Icon focus", group: "interactive" },
  { key: "iconActive", label: "Icon active", group: "interactive" },
] as const;

export const subsectionColorRoles = [
  {
    key: "subsection",
    label: "Subsection background",
    group: "cards",
  },
  {
    key: "subsectionBorder",
    label: "Subsection border",
    group: "cards",
  },
  {
    key: "subsectionShadow",
    label: "Subsection shadow",
    group: "cards",
  },
] as const;

// Inline and block text formatting: strong, em, code, and pre.
export const formattingColorRoles = [
  { key: "strong", label: "Strong text", group: "formatting" },
  { key: "em", label: "Emphasis (em) text", group: "formatting" },
  { key: "code", label: "Inline code text", group: "formatting" },
  {
    key: "codeBackground",
    label: "Inline code background",
    group: "formatting",
  },
  { key: "pre", label: "Code block (pre) text", group: "formatting" },
  {
    key: "preBackground",
    label: "Code block background",
    group: "formatting",
  },
] as const;

// Form fields: labels, inputs, textareas, and selects.
export const formColorRoles = [
  { key: "label", label: "Label text", group: "forms" },
  { key: "inputText", label: "Input text", group: "forms" },
  { key: "inputBackground", label: "Input background", group: "forms" },
  { key: "inputBorder", label: "Input border", group: "forms" },
  { key: "inputPlaceholder", label: "Placeholder text", group: "forms" },
  { key: "inputFocus", label: "Input focus", group: "forms" },
] as const;

// Blockquotes, dividers, list bullets, and text selection.
export const contentColorRoles = [
  { key: "blockquote", label: "Quote text", group: "content" },
  { key: "blockquoteBorder", label: "Quote border", group: "content" },
  { key: "divider", label: "Divider (hr)", group: "content" },
  { key: "listMarker", label: "List bullet", group: "content" },
  {
    key: "selectionBackground",
    label: "Selection background",
    group: "content",
  },
  { key: "selectionText", label: "Selection text", group: "content" },
] as const;

// SVG fills: three colors for the shapes in an area's icons and
// illustrations, e.g. fill-ink-01-svg-01. Until chosen, 01 (main shapes) and
// 03 (secondary shapes) use the text color and 02 (cutouts, such as the play
// button in a logo) uses the area's background.
export const svgFillRoles = [
  { key: "svgFill1", number: "01", label: "SVG fill 01", group: "svg" },
  { key: "svgFill2", number: "02", label: "SVG fill 02", group: "svg" },
  { key: "svgFill3", number: "03", label: "SVG fill 03", group: "svg" },
] as const;

/** Text selection is written as a ::selection rule, not a variable. */
export const selectionColorRoles = [
  "selectionBackground",
  "selectionText",
] as const;

// New detail colors fall back to an existing color until one is chosen, so
// the site looks the same by default.
const detailFallbacks = {
  secondary: "background",
  secondaryText: "text",
  label: "text",
  inputText: "text",
  inputBackground: "background",
  inputBorder: "border",
  inputPlaceholder: "muted",
  inputFocus: "accentFocus",
  blockquote: "muted",
  divider: "border",
  svgFill2: "background",
} as const;
const detailDefaults = {
  // Secondary button preview defaults: the shared sample button colors.
  secondaryBorder: "var(--sample-accentBorder)",
  // Button hover / focus backgrounds: Primary matches the shared button
  // hover; Learn more has no background until one is chosen.
  primaryHover: "var(--sample-buttonHoverBackground)",
  learnMoreHover: "transparent",
  secondaryShadow: "var(--sample-buttonShadow)",
  secondaryHover: "var(--sample-buttonHoverBackground)",
  secondaryHoverText: "var(--sample-buttonHoverText)",
  blockquoteBorder: "currentColor",
  listMarker: "currentColor",
  selectionBackground: "Highlight",
  selectionText: "HighlightText",
  svgFill1: "currentColor",
  svgFill3: "currentColor",
} as const;
const detailTokens = {
  secondary: "accent-%-secondary",
  secondaryText: "accent-%-secondary-text",
  secondaryBorder: "accent-%-secondary-border",
  primaryHover: "accent-%-primary-hover",
  learnMoreHover: "accent-%-learn-more-hover",
  secondaryShadow: "accent-%-secondary-shadow",
  secondaryHover: "accent-%-secondary-hover",
  secondaryHoverText: "accent-%-secondary-hover-text",
  label: "ink-%-label",
  inputText: "ink-%-input",
  inputBackground: "canvas-%-input",
  inputBorder: "canvas-%-input-border",
  inputPlaceholder: "ink-%-placeholder",
  inputFocus: "accent-%-input-focus",
  blockquote: "ink-%-blockquote",
  blockquoteBorder: "canvas-%-blockquote-border",
  divider: "canvas-%-divider",
  listMarker: "ink-%-marker",
  selectionBackground: "canvas-%-selection",
  selectionText: "ink-%-selection",
} as const;

export const regionColorRoles = [
  { key: "background", label: "Background", group: "canvas" },
  { key: "border", label: "Border", group: "canvas" },
  { key: "shadow", label: "Shadow", group: "canvas" },
  { key: "primary", label: "Accent 1 background", group: "accent" },
  { key: "primaryText", label: "Accent 1 text", group: "accent" },
  { key: "accentBorder", label: "Accent 1 / 3 border", group: "accent" },
  { key: "buttonShadow", label: "Accent 1 / 3 shadow", group: "accent" },
  { key: "accentFocus", label: "Hover / focus", group: "accent" },
  {
    key: "primaryHover",
    label: "Accent 1 hover / focus",
    group: "accent",
  },
  {
    key: "learnMoreHover",
    label: "Accent 3 hover / focus",
    group: "accent",
  },
  { key: "text", label: "Paragraph / text", group: "ink" },
  { key: "h1", label: "H1 heading", group: "ink" },
  { key: "h2", label: "H2 heading", group: "ink" },
  { key: "h3", label: "H3 heading", group: "ink" },
  { key: "h4", label: "H4 heading", group: "ink" },
  { key: "muted", label: "Muted text", group: "ink" },
  { key: "highlight", label: "Highlight text", group: "ink" },
  { key: "secondary", label: "Accent 2 background", group: "accent" },
  { key: "secondaryText", label: "Accent 2 text", group: "accent" },
  {
    key: "secondaryBorder",
    label: "Accent 2 border",
    group: "accent",
  },
  {
    key: "secondaryShadow",
    label: "Accent 2 shadow",
    group: "accent",
  },
  {
    key: "secondaryHover",
    label: "Accent 2 hover / focus",
    group: "accent",
  },
  {
    key: "secondaryHoverText",
    label: "Accent 2 hover / focus text",
    group: "accent",
  },
  ...cardCanvasRoles,
  ...subsectionColorRoles,
  { key: "cardText", label: "Card text / all three cards", group: "ink" },
  ...formattingColorRoles,
  ...formColorRoles,
  ...contentColorRoles,
  ...interactiveColorRoles,
  ...svgFillRoles,
] as const;

const recentRegionColorRoles = [
  "buttonShadow",
  "iconBorder",
  "iconShadow",
  "subsectionBorder",
  "subsectionShadow",
] as const;

// Added in version 12; older groups use the theme default for these.
const version12ColorRoles = ["muted", "highlight", "contrastCanvas"] as const;
// Added in version 13.
const version13ColorRoles = ["contrastText"] as const;
// Added in version 18; until set they match the shared button colors.
// Added in version 21.
const version21ColorRoles = ["primaryHover", "learnMoreHover"] as const;
// Added in version 22; until set they use the text color.
const version22ColorRoles = svgFillRoles.map(({ key }) => key);
// Added in version 20; until set it matches the shared button border.
const version20ColorRoles = ["secondaryBorder"] as const;
// Added in version 19; until set it matches Card 03's background.
const version19ColorRoles = ["subsection"] as const;
const version18ColorRoles = [
  "secondaryShadow",
  "secondaryHover",
  "secondaryHoverText",
] as const;

/**
 * Sitewide colors whose variable is unset until chosen, and the variable
 * (or color) components use instead. Matches the fallbacks in colors.css.
 */
export const sitewideColorFallbacks: Partial<
  Record<SitewideColorRole, string>
> = {
  ctaPrimaryText: "var(--ink-page-dark)",
  ctaPrimaryBorder: "var(--cta-01)",
  ctaPrimaryHover: "var(--cta-01)",
  ctaPrimaryHoverText: "var(--cta-01-text, var(--ink-page-dark))",
  ctaSecondaryText: "var(--ink-inverse)",
  ctaSecondaryBorder: "var(--cta-02)",
  ctaSecondaryHover: "var(--cta-02)",
  ctaSecondaryHoverText: "var(--cta-02-text, var(--ink-inverse))",
  ctaTertiaryText: "var(--ink-page-dark)",
  ctaTertiaryBorder: "var(--cta-03)",
  ctaTertiaryHover: "var(--cta-03)",
  ctaTertiaryHoverText: "var(--cta-03-text, var(--ink-page-dark))",
};
// Added in version 14.
const version14ColorRoles = formattingColorRoles.map(({ key }) => key);
// Added in version 15.
const version15ColorRoles = [...formColorRoles, ...contentColorRoles].map(
  ({ key }) => key,
);

/** Colors saved with a theme group. */
export const groupColorRoles = [...globalColorRoles, ...regionColorRoles];
/** Every color control in the Theme Builder, sitewide ones included. */
export const colorRoles = [...groupColorRoles, ...sitewideColorRoles];

export const roleGroups = [
  { key: "brand", label: "Brand / page-wide" },
  { key: "cta", label: "CTA / sitewide" },
  { key: "contrast", label: "Contrast band / page-wide" },
  { key: "canvas", label: "Canvas" },
  { key: "cards", label: "Cards & subsections" },
  { key: "accent", label: "Accent" },
  { key: "ink", label: "Ink" },
  { key: "formatting", label: "Text formatting" },
  { key: "forms", label: "Form fields" },
  { key: "content", label: "Quotes, dividers, lists & selection" },
  { key: "interactive", label: "Buttons, links & icons" },
  { key: "svg", label: "SVG fills" },
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
/** A color saved with a theme group (not a sitewide one). */
export type GroupColorRole = (typeof groupColorRoles)[number]["key"];
export type SitewideColorRole = (typeof sitewideColorRoles)[number]["key"];
export type SitewideColors = Record<SitewideColorRole, string>;
export type GlobalColorRole = (typeof globalColorRoles)[number]["key"];
export type RegionColorRole = (typeof regionColorRoles)[number]["key"];
export type Region = (typeof regions)[number]["key"];
export type Colors = Record<RegionColorRole, string>;
export type GlobalColors = Record<GlobalColorRole, string>;
export type StyleColors = Record<Region, Colors> & { global: GlobalColors };
export type Theme = "light" | "dark";

export const radiusTargets = [
  { key: "section", label: "Sections (including the hero)" },
  { key: "card", label: "Cards" },
  { key: "subsection", label: "Subsections" },
] as const;

export const radiusPresets = [
  { key: "none", label: "None", size: "0px" },
  { key: "sm", label: "SM", size: "0.25rem" },
  { key: "md", label: "MD", size: "0.375rem" },
  { key: "lg", label: "LG", size: "0.5rem" },
  { key: "xl", label: "XL", size: "0.75rem" },
  { key: "2xl", label: "2XL", size: "1rem" },
  { key: "3xl", label: "3XL", size: "1.5rem" },
] as const;

type RadiusPreset = (typeof radiusPresets)[number]["key"];
export type GlobalRadii = Record<
  (typeof radiusTargets)[number]["key"],
  RadiusPreset
>;
export const defaultRadii: Readonly<GlobalRadii> = {
  section: "none",
  card: "xl",
  subsection: "xl",
};

/**
 * Content widths: the max-width of the div that holds a component's content
 * (the max-w-site class, set by --container-site). The site default is 80rem,
 * Tailwind's max-w-7xl / max-w-screen-xl that the components used before.
 */
export const defaultContentWidth = "80rem";
export const contentWidthPresets = [
  { value: "48rem", label: "Narrow (768px)" },
  { value: "64rem", label: "Medium (1024px)" },
  { value: "72rem", label: "Wide (1152px)" },
  { value: "80rem", label: "Extra wide (1280px)" },
  { value: "90rem", label: "Large (1440px)" },
  { value: "96rem", label: "Extra large (1536px)" },
  { value: "100%", label: "Full width" },
] as const;

/** A CSS width the builder writes: a rem or px length, or 100%. */
export function isContentWidth(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(?:(?:[1-9]\d{0,3}(?:\.\d{1,3})?)(?:rem|px)|100%)$/.test(value)
  );
}

// Preview areas that can take a CSS ID from src/styles/themes/id.css.
export const sectionIdRegions = [
  "page",
  "hero",
  "section1",
  "section2",
  "section3",
  "section4",
  "section5",
  "section6",
] as const satisfies readonly Region[];
export type SectionIdRegion = (typeof sectionIdRegions)[number];
/** Chosen CSS IDs by area; areas left out keep their default preview ID. */
export type SectionIds = Partial<Record<SectionIdRegion, string>>;

export function isSectionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 120 &&
    !/[\s\u0000-\u001f\u007f]/u.test(value)
  );
}

/** Areas that can take their own typography: every area with a class. */
export const typographyRegions = [
  ...sectionIdRegions,
  "header",
  "footer",
] as const satisfies readonly Region[];
export type TypographyRegion = (typeof typographyRegions)[number];

/** Typography rules for one area: { h1: { "font-size": "2rem" }, ... }. */
export type TypographyRules = Record<string, Record<string, string>>;
/**
 * Typography per area, edited in the Typography Builder. Areas left out
 * follow the site-wide defaults in sitewide.css. The same in both themes.
 */
export type GroupTypography = Partial<
  Record<TypographyRegion, TypographyRules>
>;

export interface ThemeGroup {
  id: string;
  name: string;
  themes: Record<Theme, StyleColors>;
  radii: GlobalRadii;
  sectionIds: SectionIds;
  typography: GroupTypography;
  /** Content widths by area; areas left out use the sitewide width. */
  widths: GroupWidths;
}

/** Content widths by area. The header and footer's are sitewide. */
export type GroupWidths = Partial<Record<SectionIdRegion, string>>;

// Keep the storage key, including its older "style-groups" name, so groups
// already saved in browsers (back to version 1) are still found.
export const themeGroupsStorageKey = "exclusive-group-style-groups-v1";

export function isGlobalColorRole(role: ColorRole): role is GlobalColorRole {
  return globalColorRoles.some(({ key }) => key === role);
}

export function isSitewideColorRole(
  role: ColorRole,
): role is SitewideColorRole {
  return sitewideColorRoles.some(({ key }) => key === role);
}

/** Whether an area's color controls include this role. Sitewide colors are
 * only edited in the Global area, which is not a theme group area. */
export function isColorRoleVisible(region: Region, role: ColorRole): boolean {
  if (isSitewideColorRole(role)) return false;
  if (isGlobalColorRole(role)) return region === "page";
  if (role.startsWith("secondary")) return region !== "header";
  if (
    role.startsWith("card") ||
    role.startsWith("subsection") ||
    role === "muted" ||
    role === "highlight" ||
    formattingColorRoles.some(({ key }) => key === role) ||
    role in detailTokens
  ) {
    return (
      region === "page" || region === "hero" || region.startsWith("section")
    );
  }
  return true;
}

export function getColor(
  colors: StyleColors,
  region: Region,
  role: GroupColorRole,
): string {
  return isGlobalColorRole(role) ? colors.global[role] : colors[region][role];
}

export function setColor(
  colors: StyleColors,
  region: Region,
  role: GroupColorRole,
  value: string,
): void {
  if (isGlobalColorRole(role)) colors.global[role] = value;
  else colors[region][role] = value;
}

export function semanticToken(region: Region, role: ColorRole): string | null {
  const global = [...globalColorRoles, ...sitewideColorRoles].find(
    ({ key }) => key === role,
  );
  if (global) return global.token;
  const area = regions.find(({ key }) => key === region);
  if (!area) throw new Error(`Unknown style region: ${region}`);
  const suffix = area.token;
  // Every area, including the header and footer, has its own SVG fills.
  const svg = svgFillRoles.find(({ key }) => key === role);
  if (svg) return `ink-${suffix}-svg-${svg.number}`;
  const card = cardCanvasRoles.find(({ key }) => key === role);
  if (card && (region === "page" || region.startsWith("section"))) {
    return `canvas-${suffix}-card-${card.card}${card.part === "background" ? "" : `-${card.part}`}`;
  }
  if (role in detailTokens)
    return region === "page" ||
      region === "hero" ||
      region.startsWith("section")
      ? detailTokens[role as keyof typeof detailTokens].replace("%", suffix)
      : null;
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
    case "h4":
      return region === "hero" || region.startsWith("section")
        ? `ink-${suffix}-h4`
        : null;
    case "strong":
    case "em":
    case "code":
    case "pre":
    case "codeBackground":
    case "preBackground": {
      if (
        region !== "page" &&
        region !== "hero" &&
        !region.startsWith("section")
      )
        return null;
      const part = role.replace("Background", "");
      return role.endsWith("Background")
        ? `canvas-${suffix}-${part}`
        : `ink-${suffix}-${part}`;
    }
    case "muted":
    case "highlight":
      return region === "page" ||
        region === "hero" ||
        region.startsWith("section")
        ? `ink-${suffix}-${role}`
        : null;
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
  if (role in detailFallbacks) {
    const fallback = defaultColorReference(
      region,
      detailFallbacks[role as keyof typeof detailFallbacks],
    );
    return token ? `var(--${token},${fallback})` : fallback;
  }
  if (role in detailDefaults) {
    const fallback = detailDefaults[role as keyof typeof detailDefaults];
    return token ? `var(--${token},${fallback})` : fallback;
  }
  if (token) return `var(--${token})`;
  switch (role) {
    case "cardText":
    case "muted":
    case "highlight":
    case "strong":
    case "em":
    case "code":
    case "pre":
      return `var(--${semanticToken(region, "text")})`;
    case "codeBackground":
    case "preBackground":
      return "transparent";
    case "h4":
      return "var(--sample-h3)";
    case "buttonHoverBackground":
    case "buttonFocusBackground":
    case "buttonActiveBackground":
      return region === "hero"
        ? "var(--hero-preview-button-state-background,var(--sample-accentFocus))"
        : "var(--sample-accentFocus)";
    case "linkHover":
    case "linkFocus":
    case "linkActive":
    case "iconHover":
    case "iconFocus":
    case "iconActive":
      return "var(--sample-accentFocus)";
    case "buttonHoverText":
    case "buttonFocusText":
    case "buttonActiveText":
      return "var(--sample-primaryText)";
    case "buttonShadow":
    case "iconShadow":
      return "var(--sample-shadow)";
    case "iconBorder":
      return "var(--sample-accentBorder)";
    case "subsection":
      return "var(--sample-card03)";
    case "subsectionBorder":
      return "var(--sample-card03Border)";
    case "subsectionShadow":
      return "var(--sample-card03Shadow)";
    case "linkColor":
    case "visitedColor":
    case "iconColor":
      return "var(--sample-text)";
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

export function parseThemeGroups(json: string): ThemeGroup[] {
  const data: unknown = JSON.parse(json);
  if (
    !isRecord(data) ||
    (data.version !== 1 &&
      data.version !== 2 &&
      data.version !== 3 &&
      data.version !== 4 &&
      data.version !== 5 &&
      data.version !== 6 &&
      data.version !== 7 &&
      data.version !== 8 &&
      data.version !== 9 &&
      data.version !== 10 &&
      data.version !== 11 &&
      data.version !== 12 &&
      data.version !== 13 &&
      data.version !== 14 &&
      data.version !== 15 &&
      data.version !== 16 &&
      data.version !== 17 &&
      data.version !== 18 &&
      data.version !== 19 &&
      data.version !== 20 &&
      data.version !== 21 &&
      data.version !== 22 &&
      data.version !== 23 &&
      data.version !== 24 &&
      data.version !== 25) ||
    !Array.isArray(data.groups) ||
    data.groups.length > 100
  ) {
    throw new Error(
      "Expected a version 1 through 25 theme group file with up to 100 groups.",
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
        "Each theme group needs an ID, a name, and a full palette.",
      );
    }
    const name = value.name.trim();
    if (ids.has(value.id) || names.has(name.toLowerCase())) {
      throw new Error("Theme group IDs and names must be unique.");
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
          throw new Error(`Missing brand colors in "${name}".`);
        for (const { key } of globalColorRoles) {
          if (
            (data.version < 12 &&
              version12ColorRoles.some((role) => role === key)) ||
            (data.version < 13 &&
              version13ColorRoles.some((role) => role === key))
          ) {
            colors.global[key] = "theme";
            continue;
          }
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
          if (
            data.version < 7 &&
            interactiveColorRoles.some(({ key }) => key === role)
          ) {
            regionColors[role] = "theme";
            continue;
          }
          if (
            (data.version < 12 &&
              version12ColorRoles.some((key) => key === role)) ||
            (data.version < 14 &&
              version14ColorRoles.some((key) => key === role)) ||
            (data.version < 15 &&
              version15ColorRoles.some((key) => key === role)) ||
            (data.version < 18 &&
              version18ColorRoles.some((key) => key === role)) ||
            (data.version < 19 &&
              version19ColorRoles.some((key) => key === role)) ||
            (data.version < 20 &&
              version20ColorRoles.some((key) => key === role)) ||
            (data.version < 21 &&
              version21ColorRoles.some((key) => key === role)) ||
            (data.version < 22 &&
              version22ColorRoles.some((key) => key === role))
          ) {
            regionColors[role] = "theme";
            continue;
          }
          if (data.version < 8 && role === "h4") {
            regionColors[role] = "theme";
            continue;
          }
          if (
            data.version < 9 &&
            recentRegionColorRoles.some((key) => key === role)
          ) {
            regionColors[role] = "theme";
            continue;
          }
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
    const radii = { ...defaultRadii };
    if (data.version >= 10) {
      const source = value.radii;
      if (!isRecord(source))
        throw new Error(`Missing corner radii in "${name}".`);
      for (const { key } of radiusTargets) {
        const preset = radiusPresets.find(
          (preset) => preset.key === source[key],
        );
        if (!preset)
          throw new Error(`Invalid ${key} corner radius in "${name}".`);
        radii[key] = preset.key;
      }
    }
    const sectionIds: SectionIds = {};
    if (data.version >= 11) {
      const source = value.sectionIds;
      if (!isRecord(source))
        throw new Error(`Missing section IDs in "${name}".`);
      const used = new Set<string>();
      for (const [region, id] of Object.entries(source)) {
        if (!sectionIdRegions.some((key) => key === region))
          throw new Error(`Unknown section ID area "${region}" in "${name}".`);
        if (!isSectionId(id))
          throw new Error(`Invalid section ID for ${region} in "${name}".`);
        if (used.has(id))
          throw new Error(`Section ID #${id} is used twice in "${name}".`);
        used.add(id);
        sectionIds[region as SectionIdRegion] = id;
      }
    }
    const typography: GroupTypography = {};
    if (data.version >= 17) {
      const source = value.typography;
      if (!isRecord(source))
        throw new Error(`Missing typography in "${name}".`);
      for (const [region, rules] of Object.entries(source)) {
        if (!typographyRegions.some((key) => key === region))
          throw new Error(`Unknown typography area "${region}" in "${name}".`);
        try {
          validateTypographyRules(rules);
        } catch (error) {
          throw new Error(
            `Invalid ${region} typography in "${name}": ${(error as Error).message}`,
          );
        }
        typography[region as TypographyRegion] = structuredClone(
          rules as TypographyRules,
        );
      }
    }
    const widths: GroupWidths = {};
    if (data.version >= 25) {
      const source = value.widths;
      if (!isRecord(source)) throw new Error(`Missing widths in "${name}".`);
      for (const [region, width] of Object.entries(source)) {
        if (!sectionIdRegions.some((key) => key === region))
          throw new Error(`Unknown width area "${region}" in "${name}".`);
        if (!isContentWidth(width))
          throw new Error(`Invalid ${region} width in "${name}".`);
        widths[region as SectionIdRegion] = width;
      }
    }
    return {
      id: value.id,
      name,
      themes: { light, dark },
      radii,
      sectionIds,
      typography,
      widths,
    };
  });
}

export function serializeThemeGroups(groups: ThemeGroup[]): string {
  return JSON.stringify({ version: 25, groups }, null, 2);
}

/**
 * Adds groups from the project's theme-groups.json that this browser does not
 * have yet (matched by ID or name), so every browser sees the same groups.
 */
export function mergeThemeGroups(
  browser: ThemeGroup[],
  project: ThemeGroup[],
): ThemeGroup[] {
  const ids = new Set(browser.map(({ id }) => id));
  const names = new Set(browser.map(({ name }) => name.toLowerCase()));
  return [
    ...browser,
    ...project.filter(
      ({ id, name }) => !ids.has(id) && !names.has(name.toLowerCase()),
    ),
  ].slice(0, 100);
}

/** theme-groups.json with `group` added, or replacing the one saved before. */
export function upsertThemeGroupJson(json: string, group: ThemeGroup): string {
  const saved = json.trim() ? parseThemeGroups(json) : [];
  const others = saved.filter(
    ({ id, name }) =>
      id !== group.id && name.toLowerCase() !== group.name.toLowerCase(),
  );
  return `${serializeThemeGroups([...others, group])}\n`;
}

/** theme-groups.json without the group with this ID. */
export function removeThemeGroupJson(json: string, id: string): string {
  const saved = json.trim() ? parseThemeGroups(json) : [];
  return `${serializeThemeGroups(saved.filter((group) => group.id !== id))}\n`;
}
