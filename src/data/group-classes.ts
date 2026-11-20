import {
  globalColorRoles,
  regionColorRoles,
  semanticToken,
  type Region,
  type StyleColors,
  type StyleGroup,
  type Theme,
} from "./style-groups.ts";

/** Areas of a style group that become classes, in the order they are written. */
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
  region: Region;
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
 * Style group classes, written by the Website Builder theme builder.
 * Assign them to components in the page builder. Each block between the
 * "style-group" markers is replaced when that group is saved again;
 * anything outside the markers is left alone.
 */
`;

/** Turns a style group name into the part of its class names, e.g. "coastal-calm". */
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
      "Use a style group name with at least one letter or number to create classes.",
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
function areaDeclarations(colors: StyleColors, region: Region) {
  const declarations = new Map<string, string>();
  const area = colors[region];
  for (const { key: role } of regionColorRoles) {
    const color = area[role];
    const own = semanticToken(region, role);
    if (own && color !== "theme") declarations.set(own, color);
    const shared = semanticToken("section1", role);
    if (!shared || declarations.has(shared)) continue;
    if (color !== "theme") declarations.set(shared, color);
    // "Theme default" in another area still means that area's colors.
    else if (own && own !== shared) declarations.set(shared, `var(--${own})`);
  }
  if (region === "page")
    for (const { key, token } of globalColorRoles)
      if (colors.global[key] !== "theme")
        declarations.set(token, colors.global[key]);
  return declarations;
}

function rule(selector: string, declarations: Map<string, string>, extra = "") {
  const lines = [...declarations].map(
    ([token, value]) => `  --${token}: ${value};`,
  );
  if (extra) lines.push(extra);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

const themeSelectors: Record<Theme, string> = {
  light: ':root:not([data-theme="dark"])',
  dark: ':root[data-theme="dark"]',
};

/** The CSS block for one style group, wrapped in markers so it can be replaced. */
export function generateGroupCss(group: StyleGroup): string {
  const slug = groupClassSlug(group.name);
  const label = group.name.replace(/\*\//g, "* /").replace(/[\r\n]+/g, " ");
  const rules: string[] = [];
  for (const { region, suffix } of classGroupAreas) {
    const className = `sg-${slug}-${suffix}`;
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
    }
  }
  return [
    `/* style-group: ${slug} (${label}) */`,
    ...rules,
    `/* end style-group: ${slug} */`,
  ].join("\n");
}

function blockPattern(slug: string) {
  return new RegExp(
    `/\\* style-group: ${slug} \\(.*?\\) \\*/[\\s\\S]*?/\\* end style-group: ${slug} \\*/\\n?`,
  );
}

/** Adds the group's block to groups.css, or replaces the block saved before. */
export function upsertGroupCss(css: string, group: StyleGroup): string {
  const block = `${generateGroupCss(group)}\n`;
  const slug = groupClassSlug(group.name);
  const base = css.trim() ? css : groupsCssHeader;
  const pattern = blockPattern(slug);
  if (pattern.test(base)) return base.replace(pattern, block);
  return `${base.replace(/\s*$/, "\n")}\n${block}`;
}

/** Every style-group class defined in groups.css, for the page builder. */
export function parseGroupClasses(css: string): GroupClass[] {
  if (typeof css !== "string") return [];
  const found = new Map<string, GroupClass>();
  const blocks = css.matchAll(
    /\/\* style-group: ([a-z0-9-]+) \((.*?)\) \*\/([\s\S]*?)\/\* end style-group: \1 \*\//g,
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
