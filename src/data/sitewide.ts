import {
  isColorValue,
  sitewideColorRoles,
  type SitewideColors,
  type Theme,
} from "./theme-groups.ts";

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
 * The Theme Builder's Global area writes the "colors" section and the
 * Typography Builder writes the "typography" section; each replaces only
 * its own section. The Theme Builder sets data-sitewide-preview on <html>
 * while it previews unsaved colors, which turns the color rules off.
 */
`;

/** The parts of sitewide.css, each written by one builder, in file order. */
export const sitewideSections = ["colors", "typography"] as const;
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
