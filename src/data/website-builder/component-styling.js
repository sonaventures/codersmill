// Component Styling: find the elements in an Astro component's markup and
// give each one theme color classes (CTA buttons, accent buttons, heading
// colors, cards, ...). The classes use the shared "01" tokens, so they follow
// whichever theme group class the component sits in.

/** Element kinds the page offers, in order, and the tags in each. */
export const elementKinds = [
  { key: "actions", label: "Buttons & links", tags: ["a", "button"] },
  {
    key: "headings",
    label: "Headings",
    tags: ["h1", "h2", "h3", "h4", "h5", "h6"],
  },
  {
    key: "text",
    label: "Text",
    tags: [
      "p",
      "span",
      "li",
      "blockquote",
      "label",
      "small",
      "strong",
      "em",
      "dt",
      "dd",
      "figcaption",
    ],
  },
  {
    key: "surfaces",
    label: "Sections & cards",
    tags: [
      "section",
      "div",
      "article",
      "aside",
      "header",
      "footer",
      "nav",
      "ul",
      "ol",
      "form",
      "figure",
    ],
  },
  {
    key: "fields",
    label: "Form fields",
    tags: ["input", "textarea", "select"],
  },
  // SVGs, and iconify spans (class="icon-[tabler--arrow-right]").
  { key: "icons", label: "Icons", tags: ["svg"] },
];

/**
 * Marker classes left in src/components/blocks to show what an element is,
 * so it can be given the matching theme group classes here. Applying a
 * style replaces the marker; "No theme colors" keeps it. `preset` is the
 * suggested style.
 */
export const blockMarkers = [
  { className: "cta-anchor", label: "CTA anchor", preset: "cta-01" },
  { className: "accent-anchor", label: "Accent anchor", preset: "accent-01" },
  { className: "button", label: "Button", preset: "accent-01" },
  { className: "button-icon", label: "Button icon", preset: "button-svg" },
  { className: "anchor-icon", label: "Anchor icon", preset: "anchor-svg" },
  { className: "nav-icon", label: "Nav icon", preset: "nav-svg" },
  { className: "icon", label: "Icon", preset: "svg" },
  { className: "card", label: "Card", preset: "card-01" },
  { className: "subsection", label: "Subsection", preset: "" },
];
const markerNames = new Set(blockMarkers.map(({ className }) => className));

/** The block marker in an element's classes, or null. */
export function markerOf(classValue) {
  const name = (classValue ?? "")
    .split(/\s+/)
    .find((className) => markerNames.has(className));
  return blockMarkers.find(({ className }) => className === name) ?? null;
}

const kindByTag = new Map(
  elementKinds.flatMap(({ key, tags }) => tags.map((tag) => [tag, key])),
);

/**
 * Named sets of theme classes, grouped for the style dropdown. Each accent
 * button uses all seven of its colors: background, border (an inset ring),
 * text, and shadow (for any shadow utility the element has), then their
 * hover / focus colors.
 */
export const stylePresets = [
  {
    key: "cta-01",
    label: "CTA 01 button (sitewide)",
    group: "actions",
    classes:
      "rounded-cta! bg-cta-01 text-cta-01-text inset-ring inset-ring-cta-01-border hover:bg-cta-01-hover hover:text-cta-01-hover-text focus-visible:bg-cta-01-hover focus-visible:text-cta-01-hover-text",
  },
  {
    key: "cta-02",
    label: "CTA 02 button (sitewide)",
    group: "actions",
    classes:
      "rounded-cta! bg-cta-02 text-cta-02-text inset-ring inset-ring-cta-02-border hover:bg-cta-02-hover hover:text-cta-02-hover-text focus-visible:bg-cta-02-hover focus-visible:text-cta-02-hover-text",
  },
  {
    key: "cta-03",
    label: "CTA 03 button (sitewide)",
    group: "actions",
    classes:
      "rounded-cta! bg-cta-03 text-cta-03-text inset-ring inset-ring-cta-03-border hover:bg-cta-03-hover hover:text-cta-03-hover-text focus-visible:bg-cta-03-hover focus-visible:text-cta-03-hover-text",
  },
  {
    key: "accent-01",
    label: "Accent 1 button",
    group: "actions",
    classes:
      "rounded-accent! bg-accent-01-01 text-accent-01-01-text inset-ring inset-ring-accent-01-01-border shadow-accent-01-01-shadow/20 hover:bg-accent-01-01-hover hover:text-accent-01-01-hover-text hover:inset-ring-accent-01-01-hover-border focus-visible:bg-accent-01-01-hover focus-visible:text-accent-01-01-hover-text focus-visible:inset-ring-accent-01-01-hover-border focus-visible:outline-accent-01-focus",
  },
  {
    key: "accent-02",
    label: "Accent 2 button",
    group: "actions",
    classes:
      "rounded-accent! bg-accent-01-02 text-accent-01-02-text inset-ring inset-ring-accent-01-02-border shadow-accent-01-02-shadow/20 hover:bg-accent-01-02-hover hover:text-accent-01-02-hover-text hover:inset-ring-accent-01-02-hover-border focus-visible:bg-accent-01-02-hover focus-visible:text-accent-01-02-hover-text focus-visible:inset-ring-accent-01-02-hover-border focus-visible:outline-accent-01-focus",
  },
  {
    key: "accent-03",
    label: "Accent 3 button",
    group: "actions",
    classes:
      "rounded-accent! bg-accent-01-03 text-accent-01-03-text inset-ring inset-ring-accent-01-03-border shadow-accent-01-03-shadow/20 hover:bg-accent-01-03-hover hover:text-accent-01-03-hover-text hover:inset-ring-accent-01-03-hover-border focus-visible:bg-accent-01-03-hover focus-visible:text-accent-01-03-hover-text focus-visible:inset-ring-accent-01-03-hover-border focus-visible:outline-accent-01-focus",
  },
  {
    key: "link",
    label: "Text link",
    group: "actions",
    classes:
      "text-ink-01-highlight hover:text-accent-01-focus focus-visible:text-accent-01-focus",
  },
  {
    key: "contrast-button",
    label: "Contrast button",
    group: "actions",
    classes:
      "bg-accent-contrast-01 text-accent-contrast-01-text inset-ring inset-ring-accent-contrast-01-border hover:bg-accent-contrast-01-hover hover:text-accent-contrast-01-hover-text focus-visible:bg-accent-contrast-01-hover focus-visible:text-accent-contrast-01-hover-text",
  },
  {
    key: "h1",
    label: "H1 heading color",
    group: "headings",
    classes: "text-ink-01-h1",
  },
  {
    key: "h2",
    label: "H2 heading color",
    group: "headings",
    classes: "text-ink-01-h2",
  },
  {
    key: "h3",
    label: "H3 heading color",
    group: "headings",
    classes: "text-ink-01-h3",
  },
  {
    key: "h4",
    label: "H4 heading color",
    group: "headings",
    classes: "text-ink-01-h4",
  },
  {
    key: "contrast-heading",
    label: "Contrast heading",
    group: "headings",
    classes: "text-ink-contrast-h2",
  },
  { key: "text", label: "Text", group: "text", classes: "text-ink-01" },
  {
    key: "muted",
    label: "Muted text",
    group: "text",
    classes: "text-ink-01-muted",
  },
  {
    key: "highlight",
    label: "Highlight text",
    group: "text",
    classes: "text-ink-01-highlight",
  },
  {
    key: "label",
    label: "Label text",
    group: "text",
    classes: "text-ink-01-label",
  },
  {
    key: "blockquote",
    label: "Quote text",
    group: "text",
    classes: "text-ink-01-blockquote",
  },
  {
    key: "accent-text",
    label: "Accent text",
    group: "text",
    classes: "text-accent-01-focus",
  },
  {
    key: "contrast-text",
    label: "Contrast text",
    group: "text",
    classes: "text-ink-contrast",
  },
  {
    key: "contrast-muted",
    label: "Contrast muted text",
    group: "text",
    classes: "text-ink-contrast-muted",
  },
  {
    key: "canvas",
    label: "Section canvas",
    group: "surfaces",
    classes: "bg-canvas-01 text-ink-01",
  },
  {
    key: "card-01",
    label: "Card 01",
    group: "surfaces",
    classes:
      "rounded-card! bg-canvas-01-card-01 border-canvas-01-card-01-border shadow-canvas-01-card-01-shadow/20",
  },
  {
    key: "card-02",
    label: "Card 02",
    group: "surfaces",
    classes:
      "rounded-card! bg-canvas-01-card-02 border-canvas-01-card-02-border shadow-canvas-01-card-02-shadow/20",
  },
  {
    key: "card-03",
    label: "Card 03",
    group: "surfaces",
    classes:
      "rounded-card! bg-canvas-01-card-03 border-canvas-01-card-03-border shadow-canvas-01-card-03-shadow/20",
  },
  {
    key: "accent-canvas",
    label: "Accent canvas",
    group: "surfaces",
    classes: "bg-accent-01-01 text-accent-01-01-text",
  },
  {
    key: "contrast-band",
    label: "Contrast band",
    group: "surfaces",
    classes: "bg-canvas-contrast text-ink-contrast",
  },
  {
    key: "border",
    label: "Border color",
    group: "surfaces",
    classes: "border-canvas-01-border",
  },
  {
    key: "divider",
    label: "Divider color",
    group: "surfaces",
    classes: "border-canvas-01-divider divide-canvas-01-divider",
  },
  {
    key: "input",
    label: "Form field",
    group: "fields",
    classes:
      "bg-canvas-01-input text-ink-01-input border-canvas-01-input-border placeholder:text-ink-01-placeholder focus:border-accent-01-input-focus focus:outline-accent-01-input-focus",
  },
  // The SVG types the Theme Builder colors (fill, stroke, hover, active).
  { key: "svg", label: "SVG icon (.svg)", group: "icons", classes: "svg" },
  {
    key: "nav-svg",
    label: "Nav SVG (.nav-svg)",
    group: "icons",
    classes: "nav-svg",
  },
  {
    key: "button-svg",
    label: "Button SVG (.button-svg)",
    group: "icons",
    classes: "button-svg",
  },
  {
    key: "anchor-svg",
    label: "Anchor SVG (.anchor-svg)",
    group: "icons",
    classes: "anchor-svg",
  },
];
const svgTypeNames = new Set(["svg", "nav-svg", "button-svg", "anchor-svg"]);

const colorPrefix =
  "(?:bg|text|border(?:-[xytblrse])?|divide|ring-offset|inset-ring|ring|shadow|outline|fill|stroke|from|via|to|placeholder|decoration|accent|caret)";
const colorFamily = "(?:canvas|ink|accent|cta|brand|nav|contrast)";
const themeColorPattern = new RegExp(
  `^-?${colorPrefix}-${colorFamily}(?:-[a-z0-9.]+)*(?:\\/(?:\\d+|\\[[^\\]]+\\]))?$`,
);
// Corner radii from the theme group. Presets add them with "!" so they win
// over any rounded-* class the element already has, which is kept.
const themeRadiusPattern = /^rounded-(?:section|card|subsection|accent|cta)!?$/;
// Theme builder SVG fills are set on SVGs, not here, so they are left alone.
const svgFillPattern = /^(?:fill|stroke)-ink-[a-z0-9]+-svg-0[1-3]$/;

/**
 * Whether one class (with any variants, e.g. hover:bg-cta-01) is a theme
 * color class this page manages. The bare inset-ring that draws a button's
 * border, and the old btn-filled / btn-outline, count too.
 */
export function isThemeClass(className) {
  const base = className.replace(/^.*:/, "");
  if (svgFillPattern.test(base)) return false;
  return (
    themeColorPattern.test(base) ||
    themeRadiusPattern.test(base) ||
    markerNames.has(className) ||
    svgTypeNames.has(className) ||
    base === "inset-ring" ||
    base === "btn-filled" ||
    base === "btn-outline"
  );
}

const classTokenPattern = /^[A-Za-z0-9_:/.%[\]()#,!-]+$/;

/** Splits and checks classes typed into the page. */
export function parseClassList(value) {
  if (typeof value !== "string") throw new Error("Enter classes as text.");
  const classes = value.split(/\s+/).filter(Boolean);
  for (const className of classes)
    if (!classTokenPattern.test(className))
      throw new Error(
        `"${className}" is not a class name this page can write.`,
      );
  return [...new Set(classes)];
}

/** The theme classes on an element, and the preset they match (or ""). */
export function themeClassesOf(classValue) {
  const classes = (classValue ?? "").split(/\s+/).filter(Boolean);
  const theme = classes.filter(isThemeClass);
  const key = theme.slice().sort().join(" ");
  const preset = stylePresets.find(
    ({ classes: list }) => list.split(" ").sort().join(" ") === key,
  );
  return {
    classes: theme,
    preset: theme.length ? (preset?.key ?? "") : "none",
  };
}

// --- Reading component markup -------------------------------------------

function skipBlock(source, index, open, close) {
  if (!source.startsWith(open, index)) return -1;
  const end = source.indexOf(close, index + open.length);
  return end === -1 ? source.length : end + close.length;
}

// Reads one opening tag starting at "<name": its attributes and where it ends.
// Quoted values and {expressions} may contain ">", so they are skipped whole.
function readTag(source, start) {
  const name = /^<([A-Za-z][\w.:-]*)/.exec(
    source.slice(start, start + 80),
  )?.[1];
  if (!name) return null;
  let index = start + 1 + name.length;
  const attributes = [];
  while (index < source.length) {
    while (/\s/.test(source[index] ?? "")) index++;
    const char = source[index];
    if (char === undefined) return null;
    if (char === ">")
      return { name, attributes, end: index + 1, selfClosing: false };
    if (char === "/" && source[index + 1] === ">")
      return { name, attributes, end: index + 2, selfClosing: true };
    if (char === "{") {
      // {...spread} or a shorthand {prop}
      const end = skipExpression(source, index);
      attributes.push({ name: "", start: index, end, dynamic: true });
      index = end;
      continue;
    }
    const attr = /^[^\s=>/"'{]+/.exec(source.slice(index, index + 200));
    if (!attr) return null;
    const attrStart = index;
    index += attr[0].length;
    let value = null;
    let valueStart = -1;
    let valueEnd = -1;
    let dynamic = false;
    let rest = index;
    while (/\s/.test(source[rest] ?? "")) rest++;
    if (source[rest] === "=") {
      rest++;
      while (/\s/.test(source[rest] ?? "")) rest++;
      const quote = source[rest];
      if (quote === '"' || quote === "'" || quote === "`") {
        const close = source.indexOf(quote, rest + 1);
        if (close === -1) return null;
        valueStart = rest + 1;
        valueEnd = close;
        value = source.slice(valueStart, valueEnd);
        dynamic = quote === "`";
        index = close + 1;
      } else if (quote === "{") {
        index = skipExpression(source, rest);
        dynamic = true;
      } else {
        const bare = /^[^\s>]+/.exec(source.slice(rest, rest + 200));
        index = rest + (bare?.[0].length ?? 0);
        value = bare?.[0] ?? "";
      }
    }
    attributes.push({
      name: attr[0],
      start: attrStart,
      end: index,
      value,
      valueStart,
      valueEnd,
      dynamic,
    });
  }
  return null;
}

function skipExpression(source, start) {
  let depth = 0;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (char === '"' || char === "'" || char === "`") {
      const close = source.indexOf(char, index + 1);
      if (close === -1) return source.length;
      index = close;
    } else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return index + 1;
  }
  return source.length;
}

// A short description of what an element shows, e.g. its text or {title}.
function elementText(source, tag) {
  if (tag.selfClosing || ["input", "textarea", "select"].includes(tag.name)) {
    const hint = ["placeholder", "aria-label", "name", "id", "type"]
      .map((key) => tag.attributes.find(({ name }) => name === key))
      .find((attribute) => attribute?.value);
    return hint?.value ? `${hint.name}: ${hint.value}` : "";
  }
  const close = source.indexOf(`</${tag.name}`, tag.end);
  const inner = source.slice(
    tag.end,
    close === -1 ? tag.end + 400 : Math.min(close, tag.end + 2000),
  );
  return inner
    .replace(/<svg\b[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * The elements in a component's markup that can take theme classes, in
 * source order. Frontmatter, scripts, styles, comments, and child components
 * (capitalized tags) are skipped. Elements whose class is an {expression} or
 * class:list are listed but cannot be edited here.
 */
export function findStyleableElements(source) {
  const elements = [];
  let index = 0;
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---/.exec(source);
  if (frontmatter) index = frontmatter[0].length;
  while (index < source.length) {
    const next = source.indexOf("<", index);
    if (next === -1) break;
    let skip = skipBlock(source, next, "<!--", "-->");
    if (skip === -1 && /^<script\b/i.test(source.slice(next, next + 8)))
      skip = skipBlock(source, next, "<script", "</script>");
    if (skip === -1 && /^<style\b/i.test(source.slice(next, next + 7)))
      skip = skipBlock(source, next, "<style", "</style>");
    if (skip !== -1) {
      index = skip;
      continue;
    }
    if (source[next + 1] === "{") {
      index = next + 1;
      continue;
    }
    const tag = readTag(source, next);
    if (!tag) {
      index = next + 1;
      continue;
    }
    index = tag.end;
    if (tag.name === "svg" && !tag.selfClosing) {
      // The SVG is listed; its shapes are styled with the SVG fills instead.
      const end = source.indexOf("</svg>", tag.end);
      index = end === -1 ? tag.end : end + "</svg>".length;
    }
    const classAttr = tag.attributes.find(({ name }) => name === "class");
    const iconSpan =
      /^(?:span|i)$/.test(tag.name) &&
      /(?:^|\s)icon-\[/.test(classAttr?.value ?? "");
    const kind = iconSpan ? "icons" : kindByTag.get(tag.name.toLowerCase());
    if (!kind) continue;
    const dynamicClass = tag.attributes.some(
      ({ name, dynamic }) =>
        name === "class:list" || (name === "class" && (dynamic || !classAttr)),
    );
    elements.push({
      index: elements.length,
      tag: tag.name.toLowerCase(),
      kind,
      start: next,
      tagEnd: tag.end,
      nameEnd: next + 1 + tag.name.length,
      line: source.slice(0, next).split("\n").length,
      classValue: classAttr && !classAttr.dynamic ? classAttr.value : "",
      classRange:
        classAttr && !classAttr.dynamic && classAttr.valueStart !== -1
          ? [classAttr.valueStart, classAttr.valueEnd]
          : null,
      editable: !dynamicClass,
      text: elementText(source, tag),
    });
  }
  return elements;
}

/**
 * The component source with new theme classes on some elements. `changes`
 * maps an element's index (from findStyleableElements of this same source)
 * to its theme classes; the element's other classes are kept as they are.
 */
export function applyThemeClasses(source, changes) {
  const elements = findStyleableElements(source);
  const edits = [];
  for (const [key, value] of Object.entries(changes)) {
    const element = elements[Number(key)];
    if (!element)
      throw new Error(`Element ${key} is no longer in the component.`);
    if (!element.editable)
      throw new Error(
        `The <${element.tag}> on line ${element.line} sets its class with an expression, so it cannot be edited here.`,
      );
    const theme = parseClassList(
      Array.isArray(value) ? value.join(" ") : value,
    );
    // A block marker stays until a style replaces it.
    const kept = element.classValue
      .split(/\s+/)
      .filter(
        (name) =>
          name &&
          (!isThemeClass(name) || (!theme.length && markerNames.has(name))),
      );
    const next = [
      ...kept,
      ...theme.filter((name) => !kept.includes(name)),
    ].join(" ");
    if (element.classRange) {
      const [from, to] = element.classRange;
      if (next === element.classValue) continue;
      if (next) edits.push({ from, to, text: next });
      else {
        // Remove the now empty class attribute and the space before it.
        let attrStart = source.lastIndexOf("class=", from);
        while (attrStart > element.start && /\s/.test(source[attrStart - 1]))
          attrStart--;
        edits.push({ from: attrStart, to: to + 1, text: "" });
      }
    } else if (next) {
      edits.push({
        from: element.nameEnd,
        to: element.nameEnd,
        text: ` class="${next}"`,
      });
    }
  }
  edits.sort((a, b) => b.from - a.from);
  let result = source;
  for (const { from, to, text } of edits)
    result = result.slice(0, from) + text + result.slice(to);
  return result;
}
