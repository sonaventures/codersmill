import {
  createDefaultColors,
  isColorValue,
  regionColorRoles,
  sitewideColorRoles,
  type Colors,
  type SitewideColors,
  type Theme,
  type TypographyRules,
} from "./theme-groups.ts";
import { areaDeclarations, rule } from "./group-classes.ts";
import {
  typographyRulesCss,
  validateTypographyRules,
} from "./typography-builder.js";

/**
 * Sitewide colors (CTA 01–03) for the light and dark themes, edited in the
 * Theme Builder's Global area and saved to src/styles/themes/sitewide.css.
 * They are not part of any theme group, so they apply on every page.
 */
export type SitewideThemes = Record<Theme, SitewideColors>;

// Sitewide typography (site-wide defaults and older section ID rules) is
// written by the Typography Builder into the "typography" section, using
// serializeTypography from typography-builder.js.

export const sitewideCssFile = "sitewide.css";

export const sitewideCssHeader = `/*
 * Sitewide styles: they apply on every page whatever theme group is used.
 * The Theme Builder writes the "colors" section (CTA 01-03) and the "areas"
 * section (header and footer); the Typography Builder writes the
 * "typography" section. Each builder replaces only its own sections. The
 * Theme Builder sets data-sitewide-preview on <html> while it previews
 * unsaved changes, which turns these rules off.
 */
`;

/** The parts of sitewide.css, each written by one builder, in file order. */
export const sitewideSections = ["colors", "areas", "typography"] as const;
export type SitewideSection = (typeof sitewideSections)[number];

const sectionStart = (name: SitewideSection) => `/* sitewide: ${name} */`;
const sectionEnd = (name: SitewideSection) => `/* end sitewide: ${name} */`;

/**
 * The content of one section of sitewide.css, or "" when it has none. A file
 * from before the sections existed holds only colors.
 */
export function readSitewideSection(
  css: string,
  name: SitewideSection,
): string {
  const start = css.indexOf(sectionStart(name));
  if (start === -1) {
    if (name !== "colors" || css.includes("/* sitewide: ")) return "";
    // Older file: everything after the header comment is the colors.
    return css.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "").trim();
  }
  const from = start + sectionStart(name).length;
  const end = css.indexOf(sectionEnd(name), from);
  if (end === -1)
    throw new Error(`sitewide.css: the ${name} section has no end marker.`);
  return css.slice(from, end).trim();
}

/** sitewide.css with one section replaced; the other sections are kept. */
export function writeSitewideSection(
  css: string,
  name: SitewideSection,
  content: string,
): string {
  const parts = sitewideSections.map((section) => {
    const body = (
      section === name ? content : readSitewideSection(css, section)
    ).trim();
    return body
      ? `${sectionStart(section)}\n${body}\n${sectionEnd(section)}\n`
      : "";
  });
  return `${sitewideCssHeader}${parts.filter(Boolean).join("\n")}`;
}

const selectors: Record<Theme, string> = {
  light: ':root:not([data-sitewide-preview]):not([data-theme="dark"])',
  dark: ':root:not([data-sitewide-preview])[data-theme="dark"]',
};

export function createDefaultSitewideColors(): SitewideColors {
  const colors = {} as SitewideColors;
  for (const { key } of sitewideColorRoles) colors[key] = "theme";
  return colors;
}

export function createDefaultSitewideThemes(): SitewideThemes {
  return {
    light: createDefaultSitewideColors(),
    dark: createDefaultSitewideColors(),
  };
}

/** The colors section of sitewide.css. "Theme default" colors are left out. */
export function sitewideColorsCss(themes: SitewideThemes): string {
  return (["light", "dark"] as const)
    .map((theme) => {
      const lines = sitewideColorRoles
        .filter(({ key }) => themes[theme][key] !== "theme")
        .map(({ key, token }) => `  --${token}: ${themes[theme][key]};`);
      return `${selectors[theme]} {\n${lines.join("\n")}${lines.length ? "\n" : ""}}`;
    })
    .join("\n");
}

/** sitewide.css with these colors, keeping `existing`'s other sections. */
export function sitewideCss(themes: SitewideThemes, existing = ""): string {
  return writeSitewideSection(existing, "colors", sitewideColorsCss(themes));
}

/**
 * The colors in a sitewide.css written by sitewideCss. Colors it does not set
 * stay on "Theme default". Throws on a color the builder cannot show, so a
 * hand-edited file is never silently overwritten with less.
 */
export function parseSitewideCss(css: string): SitewideThemes {
  const themes = createDefaultSitewideThemes();
  const source = readSitewideSection(css, "colors").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const theme of ["light", "dark"] as const) {
    const start = source.indexOf(`${selectors[theme]} {`);
    if (start === -1) continue;
    const open = source.indexOf("{", start + selectors[theme].length);
    const close = source.indexOf("}", open);
    if (close === -1) throw new Error(`sitewide.css: unclosed ${theme} block.`);
    for (const declaration of source.slice(open + 1, close).split(";")) {
      const match = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(declaration);
      if (!match) continue;
      const [, token, value] = match;
      const role = sitewideColorRoles.find((role) => role.token === token);
      if (!role) continue;
      if (!isColorValue(value) || value === "theme")
        throw new Error(
          `sitewide.css: --${token} in the ${theme} theme is not a palette color, hex color, or transparent.`,
        );
      themes[theme][role.key] = value.startsWith("#")
        ? value.toLowerCase()
        : value;
    }
  }
  return themes;
}

// --- Header and footer ---------------------------------------------------

/**
 * The header and footer are styled sitewide, not by a theme group: every
 * page's header has the sw-header class and its footer sw-footer.
 */
export const sitewideAreas = [
  { region: "header", className: "sw-header", label: "Header" },
  { region: "footer", className: "sw-footer", label: "Footer" },
] as const;
export type SitewideArea = (typeof sitewideAreas)[number]["region"];

export interface SitewideAreaStyles {
  colors: Record<Theme, Record<SitewideArea, Colors>>;
  typography: Partial<Record<SitewideArea, TypographyRules>>;
}

export function isSitewideArea(region: string): region is SitewideArea {
  return sitewideAreas.some((area) => area.region === region);
}

export function createDefaultSitewideAreas(): SitewideAreaStyles {
  const defaults = createDefaultColors();
  const theme = () => ({
    header: { ...defaults.header },
    footer: { ...defaults.footer },
  });
  return { colors: { light: theme(), dark: theme() }, typography: {} };
}

const areasMarker = "/* theme-builder: ";
const themeSelectors: Record<Theme, string> = {
  light: ':root:not([data-sitewide-preview]):not([data-theme="dark"])',
  dark: ':root:not([data-sitewide-preview])[data-theme="dark"]',
};

/**
 * The "areas" section of sitewide.css: the settings (so the Theme Builder can
 * load them again) and the sw-header / sw-footer rules. Like a theme group
 * class, each maps its colors onto the shared 01 variables too, so header and
 * footer components follow them.
 */
export function sitewideAreasCss(styles: SitewideAreaStyles): string {
  // Only chosen colors are stored; the rest stay on "Theme default".
  const chosen = (colors: Colors) =>
    Object.fromEntries(
      Object.entries(colors).filter(([, value]) => value !== "theme"),
    );
  const settings = JSON.stringify({
    version: 1,
    colors: Object.fromEntries(
      (["light", "dark"] as const).map((theme) => [
        theme,
        Object.fromEntries(
          sitewideAreas.map(({ region }) => [
            region,
            chosen(styles.colors[theme][region]),
          ]),
        ),
      ]),
    ),
    typography: styles.typography,
  });
  const css = [`${areasMarker}${encodeURIComponent(settings)} */`];
  for (const { region, className } of sitewideAreas) {
    for (const theme of ["light", "dark"] as const) {
      const colors = createDefaultColors();
      colors[region] = styles.colors[theme][region];
      const selector = `${themeSelectors[theme]} .${className}`;
      css.push(
        rule(
          selector,
          areaDeclarations(colors, region),
          `  background-color: var(--canvas-${region});\n  color: var(--ink-${region});`,
        ),
      );
      const area = colors[region];
      const selection = [
        area.selectionBackground !== "theme"
          ? `  background-color: ${area.selectionBackground};`
          : "",
        area.selectionText !== "theme" ? `  color: ${area.selectionText};` : "",
      ].filter(Boolean);
      if (selection.length)
        css.push(
          `${selector} ::selection,\n${selector}::selection {\n${selection.join("\n")}\n}`,
        );
    }
  }
  for (const { region, className } of sitewideAreas) {
    const rules = styles.typography[region];
    if (rules) css.push(...typographyRulesCss(rules, `.${className} `));
  }
  return css.join("\n");
}

/** The header and footer styles in a sitewide.css (defaults if it has none). */
export function parseSitewideAreas(css: string): SitewideAreaStyles {
  const styles = createDefaultSitewideAreas();
  const section = readSitewideSection(css, "areas");
  if (!section) return styles;
  if (!section.startsWith(areasMarker))
    throw new Error("sitewide.css: the areas section has no settings.");
  const end = section.indexOf(" */", areasMarker.length);
  if (end === -1) throw new Error("sitewide.css: incomplete area settings.");
  const data = JSON.parse(
    decodeURIComponent(section.slice(areasMarker.length, end)),
  );
  if (data?.version !== 1)
    throw new Error("sitewide.css: unknown area settings version.");
  for (const theme of ["light", "dark"] as const)
    for (const { region } of sitewideAreas)
      for (const { key } of regionColorRoles) {
        const value = data.colors?.[theme]?.[region]?.[key];
        if (value === undefined) continue;
        if (!isColorValue(value))
          throw new Error(
            `sitewide.css: invalid ${key} color for the ${region} (${theme}).`,
          );
        styles.colors[theme][region][key] = value.startsWith("#")
          ? value.toLowerCase()
          : value;
      }
  for (const { region } of sitewideAreas) {
    const rules = data.typography?.[region];
    if (rules === undefined) continue;
    validateTypographyRules(rules);
    styles.typography[region] = structuredClone(rules);
  }
  return styles;
}
