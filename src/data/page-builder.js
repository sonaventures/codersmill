const componentPathPattern = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.astro$/;
const componentSizeLimit = 5_000_000;
const propertyPattern =
  /^([a-zA-Z_$][\w$]*)(\?)?\s*:\s*(string|number|boolean)$/;
const excludedComponents = new Set([
  "SiteHeader.astro",
  "SiteFooter.astro",
  "StudioHeader.astro",
]);

export function inspectComponent(path, source) {
  if (!componentPathPattern.test(path))
    return { path, error: "The component file name is not supported." };
  if (excludedComponents.has(path.split("/").at(-1))) return null;

  const frontmatter = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/.exec(
    source,
  )?.[1];
  if (/<slot(?:\s|\/?>)/i.test(source))
    return { path, error: "Components with slots are not supported." };
  const usesProps =
    /\bAstro\s*(?:\.\s*props\b|\[\s*["']props["']\s*\])/.test(source) ||
    /=\s*Astro\b/.test(frontmatter ?? "");
  const declaresProps = /\b(?:interface|type)\s+Props\b/.test(
    frontmatter ?? "",
  );
  if (!usesProps && !declaresProps) return { path, properties: [] };
  const props = frontmatter?.match(
    /(?:^|\n)\s*(?:export\s+)?interface\s+Props\s*\{([^{}]*)\}/,
  );
  if (!props) return { path, error: "Requires a supported Props interface." };
  const declarations = props[1].split(/[;\n]/).map((part) => part.trim());
  const properties = [];
  for (const declaration of declarations) {
    if (!declaration) continue;
    const match = propertyPattern.exec(declaration);
    if (!match || properties.some(({ name }) => name === match[1]))
      return {
        path,
        error: "Only string, number, and boolean Props are supported.",
      };
    properties.push({
      name: match[1],
      optional: Boolean(match[2]),
      type: match[3],
    });
  }
  return { path, properties };
}

export async function readComponents(directory, prefix = "") {
  const result = [];
  for await (const [name, handle] of directory.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      result.push(...(await readComponents(handle, path)));
    } else if (name.endsWith(".astro")) {
      const file = await handle.getFile();
      if (file.size > componentSizeLimit) {
        result.push({ path, error: "File exceeds the 5 MB inspection limit." });
        continue;
      }
      const source = await file.text();
      const component = inspectComponent(path, source);
      if (component) result.push({ ...component, handle, source });
    }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

export function validateSectionId(id) {
  if (
    typeof id !== "string" ||
    !id.trim() ||
    id.trim().length > 120 ||
    /[\s\u0000-\u001f\u007f]/u.test(id.trim())
  ) {
    throw new Error(
      "Use a section ID of 1-120 characters without spaces or control characters.",
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

export async function readThemeIds(projectDirectory) {
  if (!projectDirectory) return [];
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
      return [];
    }
    const fileHandle = await themeDir.getFileHandle("id.css");
    const file = await fileHandle.getFile();
    const css = await file.text();
    return parseIdsFromCss(css);
  } catch {
    return [];
  }
}

export function componentSavePath(input) {
  if (typeof input !== "string" || !input.trim())
    throw new Error("Enter a component file path, for example custom/my-hero.");
  const path = `${input
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.astro$/i, "")}.astro`;
  if (path.length > 200 || !componentPathPattern.test(path))
    throw new Error(
      "Use letters, numbers, hyphens, and underscores, with / between folders.",
    );
  if (excludedComponents.has(path.split("/").at(-1)))
    throw new Error("That component file name is reserved.");
  return path;
}

// Relative module specifiers: `from "./x"`, `import "./x"` and `import("./x")`.
const relativeImportPattern =
  /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.\.?\/[^"'\n]*)\2/g;

/**
 * Rewrites relative imports in a component copied from `fromPath` to `toPath`
 * (both relative to src/components) so they still resolve from the new folder.
 */
export function rebaseComponentImports(source, fromPath, toPath) {
  const folder = (path) => [
    "src",
    "components",
    ...path.split("/").slice(0, -1),
  ];
  const fromDir = folder(fromPath);
  const toDir = folder(toPath);
  if (fromDir.join("/") === toDir.join("/")) return source;
  const rebase = (code) =>
    code.replace(relativeImportPattern, (match, lead, quote, spec) => {
      const target = [...fromDir];
      for (const part of spec.split("/")) {
        if (part === "." || part === "") continue;
        if (part === "..") {
          if (!target.length) return match;
          target.pop();
        } else target.push(part);
      }
      let shared = 0;
      while (
        shared < toDir.length &&
        shared < target.length - 1 &&
        toDir[shared] === target[shared]
      )
        shared++;
      const rest = target.slice(shared).join("/");
      const ups = toDir.length - shared;
      const rebased =
        (ups ? "../".repeat(ups) : "./") +
        rest +
        (spec.endsWith("/") ? "/" : "");
      return `${lead}${quote}${rebased}${quote}`;
    });
  // Only touch code: the frontmatter and <script> blocks, never page text.
  return source
    .replace(
      /^(---\s*\r?\n)([\s\S]*?)(\r?\n---)/,
      (_, open, code, close) => `${open}${rebase(code)}${close}`,
    )
    .replace(
      /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
      (_, open, code, close) => `${open}${rebase(code)}${close}`,
    );
}

/** Every folder under src/components that already holds a component. */
export function componentFolders(components) {
  const folders = new Set([""]);
  for (const { path } of components) {
    const parts = path.split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i++)
      folders.add(parts.slice(0, i).join("/"));
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}

export async function saveComponentCopy(directory, path, content) {
  if (
    !componentPathPattern.test(path) ||
    excludedComponents.has(path.split("/").at(-1))
  )
    throw new Error("Invalid component file path.");
  if (typeof content !== "string" || !content)
    throw new Error("The component has no content to save.");
  const segments = path.split("/");
  const filename = segments.pop();
  let target = directory;
  for (const segment of segments) {
    try {
      target = await target.getDirectoryHandle(segment, { create: true });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TypeMismatchError")
        throw new Error(
          `${segment} already exists as a file in src/components. Choose a different folder.`,
        );
      throw error;
    }
  }
  try {
    await target.getFileHandle(filename);
    throw new Error(
      `src/components/${path} already exists. Choose a different name.`,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "TypeMismatchError")
      throw new Error(
        `src/components/${path} already exists as a folder. Choose a different name.`,
      );
    if (!(error instanceof DOMException && error.name === "NotFoundError"))
      throw error;
  }
  const file = await target.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(content);
    await writable.close();
  } catch (error) {
    await writable
      .abort()
      .catch((abortError) =>
        console.error("Unable to abort component file write:", abortError),
      );
    throw error;
  }
  return file;
}

export function pageSlug(name) {
  if (typeof name !== "string" || !name.trim())
    throw new Error("Enter a page name.");
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug || slug.length > 80)
    throw new Error(
      "The page name must produce a file name of 1–80 letters, numbers, and hyphens.",
    );
  return slug;
}

export function pageRoute(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error("Invalid page route.");
  return slug === "index" ? "/" : `/${slug}/`;
}

function literal(value) {
  return JSON.stringify(value).replace(
    /[<>&]/g,
    (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

// Theme group classes from src/styles/themes/groups.css, e.g. sg-coastal-calm-hero.
const styleClassPattern =
  /^sg-[a-z0-9]+(?:-[a-z0-9]+)*-(?:page|hero|section-[1-6])$/;

export function validateStyleClass(value) {
  if (typeof value !== "string" || !styleClassPattern.test(value))
    throw new Error(
      `"${value}" is not a theme group class from src/styles/themes/groups.css.`,
    );
}

export function generatePage(name, description, selected, pageClass = "") {
  pageSlug(name);
  if (pageClass) validateStyleClass(pageClass);
  if (typeof description !== "string")
    throw new Error("The page description must be text.");
  if (!Array.isArray(selected) || selected.length === 0)
    throw new Error("Add at least one component.");

  const seenIds = new Set();
  for (const item of selected) {
    if (
      item.sectionId &&
      typeof item.sectionId === "string" &&
      item.sectionId.trim()
    ) {
      const cleanId = item.sectionId.trim().replace(/^#/, "");
      validateSectionId(cleanId);
      if (seenIds.has(cleanId)) {
        throw new Error(
          `Duplicate section ID "${cleanId}". Section IDs on a page must be unique.`,
        );
      }
      seenIds.add(cleanId);
    }
  }

  const imports = new Map();
  const elements = selected.map(
    ({ component, values, sectionId, styleClass }) => {
      if (
        !component ||
        component.error ||
        !componentPathPattern.test(component.path) ||
        excludedComponents.has(component.path.split("/").at(-1)) ||
        !Array.isArray(component.properties)
      )
        throw new Error("A selected component is not supported.");
      if (!values || typeof values !== "object")
        throw new Error(`Enter properties for ${component.path}.`);
      if (!imports.has(component.path))
        imports.set(component.path, `Component${imports.size + 1}`);
      const attributes = component.properties.map((property) => {
        const { name: key, type, optional } = property;
        if (!propertyPattern.test(`${key}${optional ? "?" : ""}: ${type}`))
          throw new Error(`Unsupported property in ${component.path}.`);
        const value = values[key];
        if (value === undefined || value === "") {
          if (optional) return "";
          throw new Error(`Enter ${key} for ${component.path}.`);
        }
        if (
          typeof value !== type ||
          (type === "number" && !Number.isFinite(value))
        )
          throw new Error(`Invalid ${key} for ${component.path}.`);
        if (type === "string" && !value.trim() && !optional)
          throw new Error(`Enter ${key} for ${component.path}.`);
        return ` ${key}={${literal(value)}}`;
      });
      const element = `  <${imports.get(component.path)}${attributes.join("")} />`;
      const wrapper = [];
      if (sectionId && typeof sectionId === "string" && sectionId.trim())
        wrapper.push(` id=${literal(sectionId.trim().replace(/^#/, ""))}`);
      if (styleClass) {
        validateStyleClass(styleClass);
        wrapper.push(` class=${literal(styleClass)}`);
      }
      return wrapper.length
        ? `  <section${wrapper.join("")}>\n  ${element}\n  </section>`
        : element;
    },
  );
  // A page theme group wraps everything between the header and footer.
  const body = pageClass
    ? [
        `  <div class=${literal(pageClass)}>`,
        ...elements.map((element) => element.replace(/^/gm, "  ")),
        "  </div>",
      ]
    : elements;
  const componentImports = [...imports].map(
    ([path, alias]) =>
      `import ${alias} from ${literal(`../components/${path}`)};`,
  );
  const layoutDescription = description.trim()
    ? ` description={${literal(description.trim())}}`
    : "";
  return [
    "---",
    'import Layout from "../layouts/layout.astro";',
    ...componentImports,
    "---",
    "",
    `<Layout title={${literal(name.trim())}}${layoutDescription}>`,
    ...body,
    "</Layout>",
    "",
  ].join("\n");
}

export async function saveNewPage(directory, filename, content) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.astro$/.test(filename))
    throw new Error("Invalid page file name.");
  try {
    await directory.getFileHandle(filename);
    throw new Error(
      `${filename} already exists. Choose a different page name.`,
    );
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "NotFoundError"))
      throw error;
  }
  const slug = filename.slice(0, -".astro".length);
  const routeFiles = new Set(
    ["astro", "md", "mdx", "html", "js", "ts"].map(
      (extension) => `${slug}.${extension}`,
    ),
  );
  const indexFiles = new Set(
    ["astro", "md", "mdx", "html", "js", "ts"].map(
      (extension) => `index.${extension}`,
    ),
  );
  for await (const [name, handle] of directory.entries()) {
    if (handle.kind === "file" && routeFiles.has(name))
      throw new Error(`${name} already uses this page route.`);
    if (slug !== "index" && name === slug && handle.kind === "directory") {
      for await (const [child, childHandle] of handle.entries()) {
        if (childHandle.kind === "file" && indexFiles.has(child))
          throw new Error(`${name}/${child} already uses this page route.`);
      }
    }
  }
  const file = await directory.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(content);
    await writable.close();
  } catch (error) {
    await writable
      .abort()
      .catch((abortError) =>
        console.error("Unable to abort page file write:", abortError),
      );
    throw error;
  }
}
