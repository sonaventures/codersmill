import {
  cardInkVariable,
  globalColorRoles,
  radiusPresets,
  radiusTargets,
  regionColorRoles,
  selectionColorRoles,
  semanticToken,
  svgStates,
  svgTypes,
  svgFillRoles,
  type Region,
  type StyleColors,
  type ThemeGroup,
  type Theme,
  type TypographyRegion,
} from "./theme-groups.ts";
import { typographyRulesCss } from "./typography-builder.js";

/**
 * Areas of a theme group that become classes, in the order they are written.
 * The page comes first so the other areas' typography wins where they overlap.
 * The header and footer are sitewide (sitewide.css), not part of a group.
 */
export const classGroupAreas = [
  { region: "page", suffix: "page", label: "Page" },
  { region: "hero", suffix: "hero", label: "Hero" },
  { region: "section1", suffix: "section-1", label: "Section 01" },
  { region: "section2", suffix: "section-2", label: "Section 02" },
  { region: "section3", suffix: "section-3", label: "Section 03" },
  { region: "section4", suffix: "section-4", label: "Section 04" },
  { region: "section5", suffix: "section-5", label: "Section 05" },
  { region: "section6", suffix: "section-6", label: "Section 06" },
] as const satisfies readonly {
  region: TypographyRegion;
  suffix: string;
  label: string;
}[];

export type ClassGroupArea = (typeof classGroupAreas)[number]["suffix"];

export interface GroupClass {
  className: string;
  group: string;
  groupName: string;
  area: ClassGroupArea;
  areaLabel: string;
}

const classNamePattern = /^sg-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const areaPattern = classGroupAreas.map(({ suffix }) => suffix).join("|");

export const groupsCssHeader = `/*
 * Theme group classes, written by the Website Builder theme builder.
 * Assign them to components in the page builder. Each block between the
 * "theme-group" markers is replaced when that group is saved again;
 * anything outside the markers is left alone.
 */
`;

/** Turns a theme group name into the part of its class names, e.g. "coastal-calm". */
export function groupClassSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  if (!slug)
    throw new Error(
      "Use a theme group name with at least one letter or number to create classes.",
    );
  return slug;
}

export function isGroupClassName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 80 &&
    classNamePattern.test(value) &&
    new RegExp(`-(?:${areaPattern})$`).test(value)
  );
}

// The variables one area's class sets, for one theme. Components mostly use
// the Section 01 variables (bg-canvas-01, text-ink-01, ...), so every area
// class maps its colors onto those as well as onto the area's own variables.
export function areaDeclarations(colors: StyleColors, region: Region) {
  const declarations = new Map<string, string>();
  const area = colors[region];
  for (const { key: role } of regionColorRoles) {
    if (selectionColorRoles.some((key) => key === role)) continue;
    const color = area[role];
    const own = semanticToken(region, role);
    if (own && color !== "theme") declarations.set(own, color);
    // Card text is read by the cards through their own variable, which
    // base.css points at the area's text until a color is chosen.
    const card = cardInkVariable(role);
    if (card) {
      if (own && color !== "theme") declarations.set(card, color);
      continue;
    }
    const shared = semanticToken("section1", role);
    if (!shared || declarations.has(shared)) continue;
    if (color !== "theme") declarations.set(shared, color);
    // "Theme default" in another area still means that area's colors. SVG
    // fills have no theme variable, so they fall back to the text color, or
    // for SVG fill 02 (cutouts) the area's background.
    else if (own && own !== shared)
      declarations.set(
        shared,
        role === "svgFill2"
          ? `var(--${own}, var(--canvas-01))`
          : svgFillRoles.some(({ key }) => key === role)
            ? `var(--${own}, currentColor)`
            : `var(--${own})`,
      );
  }
  if (region === "page")
    for (const { key, token } of globalColorRoles)
      if (colors.global[key] !== "theme")
        declarations.set(token, colors.global[key]);
  return declarations;
}

export function rule(
  selector: string,
  declarations: Map<string, string>,
  extra = "",
) {
  const lines = [...declarations].map(
    ([token, value]) => `  --${token}: ${value};`,
  );
  if (extra) lines.push(extra);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

// Which element each area variable colors, e.g. .sg-fp-hero h1 gets
// --ink-hero-h1. The rules read the shared section 01 variables, which every
// area class remaps to its own (--ink-01-h1 is --ink-hero-h1 inside the
// hero), so the nearest area class wins when areas are nested. Fallbacks
// match the Theme Builder preview for colors left on the theme default.
const inputSelector =
  'input:not([type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="image"]), textarea, select';

export const areaElementMappings = [
  // The outer element: the one that carries the class.
  {
    selector: "",
    declarations: {
      "background-color": "var(--canvas-01)",
      "border-color": "var(--canvas-01-border)",
      // Colors any shadow utility on it; it adds no shadow of its own.
      "--tw-shadow-color":
        "color-mix(in srgb, var(--canvas-01-shadow) 10%, transparent)",
    },
  },
  { selector: "p", declarations: { color: "var(--ink-01)" } },
  { selector: "h1", declarations: { color: "var(--ink-01-h1)" } },
  { selector: "h2", declarations: { color: "var(--ink-01-h2)" } },
  { selector: "h3", declarations: { color: "var(--ink-01-h3)" } },
  {
    selector: "h4",
    declarations: { color: "var(--ink-01-h4, var(--ink-01-h3))" },
  },
  {
    selector: "strong",
    declarations: { color: "var(--ink-01-strong, currentColor)" },
  },
  { selector: "em", declarations: { color: "var(--ink-01-em, currentColor)" } },
  {
    selector: "code",
    declarations: {
      color: "var(--ink-01-code, currentColor)",
      "background-color": "var(--canvas-01-code, transparent)",
    },
  },
  {
    selector: "pre",
    declarations: {
      color: "var(--ink-01-pre, currentColor)",
      "background-color": "var(--canvas-01-pre, transparent)",
    },
  },
  // Code inside a pre block takes the pre colors.
  {
    selector: "pre code",
    declarations: { color: "inherit", "background-color": "transparent" },
  },
  {
    selector: "label",
    declarations: { color: "var(--ink-01-label, var(--ink-01))" },
  },
  {
    selector: inputSelector,
    declarations: {
      color: "var(--ink-01-input, var(--ink-01))",
      "background-color": "var(--canvas-01-input, var(--canvas-01))",
      "border-color": "var(--canvas-01-input-border, var(--canvas-01-border))",
    },
  },
  {
    selector: "::placeholder",
    declarations: { color: "var(--ink-01-placeholder, var(--ink-01-muted))" },
  },
  {
    selector: ":is(input, textarea, select):focus-visible",
    declarations: {
      "outline-color": "var(--accent-01-input-focus, var(--accent-01-focus))",
      "border-color": "var(--accent-01-input-focus, var(--accent-01-focus))",
      // Colors focus:ring utilities on the field.
      "--tw-ring-color": "var(--accent-01-input-focus, var(--accent-01-focus))",
    },
  },
  {
    selector: "blockquote",
    declarations: {
      color: "var(--ink-01-blockquote, var(--ink-01-muted))",
      "border-color": "var(--canvas-01-blockquote-border, currentColor)",
    },
  },
  {
    selector: "hr",
    declarations: {
      "border-color": "var(--canvas-01-divider, var(--canvas-01-border))",
    },
  },
] as const;

/**
 * The element rules for one area class, in the base layer and wrapped in
 * :where() so any color utility on a component's element still wins.
 */
export function areaElementCss(className: string, region: Region): string {
  const rules = areaElementMappings.map(
    ({ selector, declarations: mapped }) => {
      // Sections and the hero take the section corner radius; the page class
      // wraps a whole page, so it keeps square corners.
      const declarations: Record<string, string> =
        !selector && region !== "page"
          ? { ...mapped, "border-radius": "var(--radius-section)" }
          : mapped;
      const target = selector
        ? selector
            .split(/,\s*(?![^()]*\))/)
            .map((part) => `  :where(.${className}) ${part}`)
            .join(",\n")
        : `  :where(.${className})`;
      const lines = Object.entries(declarations).map(
        ([property, value]) => `    ${property}: ${value};`,
      );
      return `${target} {\n${lines.join("\n")}\n  }`;
    },
  );
  return `@layer base {\n${rules.join("\n")}\n}`;
}

/**
 * The group's corner radii as variables on every one of its classes, so
 * rounded-section, rounded-card, rounded-subsection, rounded-accent and
 * rounded-cta follow whichever group class an element sits in.
 */
export function radiusCss(slug: string, group: ThemeGroup): string {
  const selector = classGroupAreas
    .map(({ suffix }) => `.sg-${slug}-${suffix}`)
    .join(",\n");
  const lines = radiusTargets.map(({ key }) => {
    const preset = radiusPresets.find(
      (preset) => preset.key === group.radii[key],
    );
    if (!preset) throw new Error(`Unknown corner radius preset for ${key}.`);
    return `  --radius-${key}: ${preset.size};`;
  });
  return `${selector} {\n${lines.join("\n")}\n}`;
}

// Where each SVG type state applies: hover and focus, then active, of the
// link, button or menu item the SVG sits in.
const svgStateSelectors = {
  base: (svg: string) => [svg],
  hover: (svg: string) => [
    `:is(a, button, summary):is(:hover, :focus-visible) ${svg}`,
  ],
  active: (svg: string) => [`:is(a, button, summary):active ${svg}`],
} as const;

/**
 * Rules for the SVG type classes (svg, nav-svg, button-svg, anchor-svg) in
 * one area and theme. Only chosen colors get a rule, so an SVG left on
 * "Theme default" keeps its own fill and stroke attributes.
 */
export function svgTypeCss(
  themeSelector: string,
  className: string,
  colors: StyleColors,
  region: Region,
): string[] {
  const rules: string[] = [];
  for (const type of svgTypes)
    for (const state of svgStates) {
      const role = `${type.key}${state.key}` as keyof StyleColors[Region];
      if (colors[region][role] === "theme") continue;
      const token = semanticToken(region, role);
      if (!token) continue;
      const selectors = svgStateSelectors[state.state](`.${type.className}`)
        .map(
          (selector) => `  ${themeSelector} :where(.${className}) ${selector}`,
        )
        .join(",\n");
      rules.push(
        `${selectors} {\n    ${state.property}: var(--${token});\n  }`,
      );
    }
  return rules;
}

const themeSelectors: Record<Theme, string> = {
  light: ':root:not([data-theme="dark"])',
  dark: ':root[data-theme="dark"]',
};

/** The CSS block for one theme group, wrapped in markers so it can be replaced. */
export function generateGroupCss(group: ThemeGroup): string {
  const slug = groupClassSlug(group.name);
  const label = group.name.replace(/\*\//g, "* /").replace(/[\r\n]+/g, " ");
  const rules: string[] = [];
  const typographyRules: string[] = [];
  const elementRules: string[] = [];
  for (const { region, suffix } of classGroupAreas) {
    const className = `sg-${slug}-${suffix}`;
    elementRules.push(areaElementCss(className, region));
    const svgRules = (["light", "dark"] as const).flatMap((theme) =>
      svgTypeCss(themeSelectors[theme], className, group.themes[theme], region),
    );
    if (svgRules.length)
      elementRules.push(`@layer base {\n${svgRules.join("\n")}\n}`);
    // The area's content width (max-w-site), the same in both themes.
    // Areas without one inherit the sitewide width or an outer area's.
    const width = group.widths?.[region];
    if (width) rules.push(`.${className} {\n  --container-site: ${width};\n}`);
    for (const theme of ["light", "dark"] as const) {
      rules.push(
        rule(
          `${themeSelectors[theme]} .${className}`,
          areaDeclarations(group.themes[theme], region),
          // The page class paints its own canvas so it can wrap a whole page.
          region === "page"
            ? "  background-color: var(--canvas-page);\n  color: var(--ink-page);"
            : "",
        ),
      );
      // Selection colors only apply once chosen, so the browser's own
      // highlight stays in place everywhere else.
      const area = group.themes[theme][region];
      const selection = [
        area.selectionBackground !== "theme"
          ? `  background-color: ${area.selectionBackground};`
          : "",
        area.selectionText !== "theme" ? `  color: ${area.selectionText};` : "",
      ].filter(Boolean);
      if (selection.length)
        rules.push(
          `${themeSelectors[theme]} .${className} ::selection,\n${themeSelectors[theme]} .${className}::selection {\n${selection.join("\n")}\n}`,
        );
    }
  }
  // Typography from the Typography Builder: the same in both themes. Page
  // rules come first so section and hero rules win where they overlap.
  for (const { region, suffix } of classGroupAreas) {
    const rules = group.typography?.[region];
    if (rules)
      typographyRules.push(
        ...typographyRulesCss(rules, `.sg-${slug}-${suffix} `),
      );
  }
  return [
    `/* theme-group: ${slug} (${label}) */`,
    ...rules,
    // After the area rules, so the page builder lists classes in area order.
    radiusCss(slug, group),
    ...elementRules,
    ...typographyRules,
    `/* end theme-group: ${slug} */`,
  ].join("\n");
}

function blockPattern(slug: string) {
  return new RegExp(
    // Blocks saved before the rename used "style-group" markers.
    `/\\* (?:theme|style)-group: ${slug} \\(.*?\\) \\*/[\\s\\S]*?/\\* end (?:theme|style)-group: ${slug} \\*/\\n?`,
  );
}

/** Adds the group's block to groups.css, or replaces the block saved before. */
export function upsertGroupCss(css: string, group: ThemeGroup): string {
  const block = `${generateGroupCss(group)}\n`;
  const slug = groupClassSlug(group.name);
  const base = css.trim() ? css : groupsCssHeader;
  const pattern = blockPattern(slug);
  if (pattern.test(base)) return base.replace(pattern, block);
  return `${base.replace(/\s*$/, "\n")}\n${block}`;
}

/** groups.css without the group's block (theme groups deleted elsewhere). */
export function removeGroupCss(css: string, name: string): string {
  return css.replace(blockPattern(groupClassSlug(name)), "");
}

/** Every theme group class defined in groups.css, for the page builder. */
export function parseGroupClasses(css: string): GroupClass[] {
  if (typeof css !== "string") return [];
  const found = new Map<string, GroupClass>();
  const blocks = css.matchAll(
    /\/\* (?:theme|style)-group: ([a-z0-9-]+) \((.*?)\) \*\/([\s\S]*?)\/\* end (?:theme|style)-group: \1 \*\//g,
  );
  for (const [, group, groupName, body] of blocks) {
    for (const [, className] of body.matchAll(/\.(sg-[a-z0-9-]+)\s*\{/g)) {
      if (found.has(className) || !isGroupClassName(className)) continue;
      const area = classGroupAreas.find(({ suffix }) =>
        className.endsWith(`-${suffix}`),
      );
      if (!area || className !== `sg-${group}-${area.suffix}`) continue;
      found.set(className, {
        className,
        group,
        groupName,
        area: area.suffix,
        areaLabel: area.label,
      });
    }
  }
  return [...found.values()];
}
