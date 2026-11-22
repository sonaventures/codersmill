import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { googleFontIds } from "../../src/data/website-builder/google-font-names.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (file) => readFileSync(join(root, file), "utf8");
const cssPath = "src/styles/themes/fonts.css";
const typographyPath = "src/data/website-builder/typography-builder.js";
const themeBlock = /^@theme static\s*\{[^{}]*^\}/gm;
const fontOptions = /^export const typographyFonts = \{[^{}]*^\};/gm;

function npm(args, capture = false) {
  const cli = process.env.npm_execpath;
  if (!cli)
    throw new Error(
      "Run this installer using npm run fonts:add -- <font names>.",
    );
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  return result;
}

function packageExists(name) {
  const result = npm(["view", name, "version", "--json"], true);
  if (result.status === 0 && result.stdout.trim()) return true;
  const errorOutput = result.stdout.trim();
  if (errorOutput && JSON.parse(errorOutput)?.error?.code === "E404")
    return false;
  throw new Error(
    `Could not look up ${name}: ${result.stderr.trim() || errorOutput || `npm exited with ${result.status}`}`,
  );
}

function fontFiles(name, id) {
  const dir = join(root, "node_modules", name);
  const metadata = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf8"));
  if (
    metadata.type !== "google" ||
    metadata.id !== id ||
    !/^[a-z0-9][a-z0-9 -]*$/i.test(metadata.family)
  ) {
    throw new Error(`${name} does not describe the requested Google Font.`);
  }
  const variable = name.startsWith("@fontsource-variable/");
  const files = variable
    ? ["wght.css", "wght-italic.css"].filter((file) =>
        existsSync(join(dir, file)),
      )
    : metadata.weights.flatMap((weight) =>
        metadata.styles.map(
          (style) => `${weight}${style === "normal" ? "" : `-${style}`}.css`,
        ),
      );
  if (variable && !files.includes("wght.css")) files.unshift("index.css");
  if (
    !files.length ||
    files.some(
      (file) =>
        !/^(?:index|wght(?:-italic)?|[1-9]\d\d(?:-italic)?)\.css$/.test(file) ||
        !existsSync(join(dir, file)),
    )
  ) {
    throw new Error(`Could not identify the font styles provided by ${name}.`);
  }
  const faceNames = files.map(
    (file) =>
      readFileSync(join(dir, file), "utf8").match(
        /font-family:\s*(['"])(.*?)\1;/,
      )?.[2],
  );
  const face = faceNames[0];
  if (
    !face ||
    !/^[a-z0-9][a-z0-9 -]*$/i.test(face) ||
    faceNames.some((other) => other !== face)
  ) {
    throw new Error(
      `Could not identify a consistent CSS font family in ${name}.`,
    );
  }
  const fallback = ["serif", "sans-serif", "monospace", "cursive"].includes(
    metadata.category,
  )
    ? metadata.category
    : "sans-serif";
  return { files, face, label: metadata.family, fallback };
}

function addFont(css, typography, name, id) {
  const { files, face, label, fallback } = fontFiles(name, id);
  const imports = new Set(
    [...css.matchAll(/^@import\s+["']([^"']+)["'];/gm)].map(
      (match) => match[1],
    ),
  );
  const missing = files
    .map((file) => `${name}/${file}`)
    .filter((path) => !imports.has(path));
  const token = `--font-${id}`;
  const existing = css.match(new RegExp(`^\\s*${token}:\\s*([^;]+);`, "m"));
  if (existing && !new RegExp(`^(['"])${face}\\1\\s*,`).test(existing[1])) {
    throw new Error(
      `${token} already points to another font. Rename the conflicting token before trying again.`,
    );
  }
  css = css.replace(themeBlock, (block) => {
    const newImports = missing.length
      ? `${missing.map((path) => `@import "${path}";`).join("\n")}\n\n`
      : "";
    const nextBlock = existing
      ? block
      : `${block.slice(0, -1)}  ${token}: ${JSON.stringify(face)}, ${fallback};\n}`;
    return newImports + nextBlock;
  });
  typography = typography.replace(fontOptions, (block) => {
    if (block.includes(`"var(${token})"`) || block.includes(`'var(${token})'`))
      return block;
    return `${block.slice(0, -2)}  "var(${token})": ${JSON.stringify(label)},\n};`;
  });
  return { css, typography };
}

function main() {
  const ids = googleFontIds(process.argv.slice(2).join(","));
  const originalCss = read(cssPath);
  const originalTypography = read(typographyPath);
  if (
    [...originalCss.matchAll(themeBlock)].length !== 1 ||
    [...originalTypography.matchAll(fontOptions)].length !== 1
  ) {
    throw new Error(
      "Could not locate the font token block and Typography Builder font list.",
    );
  }
  const { dependencies = {} } = JSON.parse(read("package.json"));
  const packages = ids.map((id) => {
    const variable = `@fontsource-variable/${id}`;
    const fixed = `@fontsource/${id}`;
    if (dependencies[variable]) return variable;
    if (dependencies[fixed]) return fixed;
    if (packageExists(variable)) return variable;
    if (packageExists(fixed)) return fixed;
    throw new Error(
      `No Fontsource package found for "${id}". Check the Google Fonts family name.`,
    );
  });
  const missing = packages.filter(
    (name) =>
      !dependencies[name] ||
      !existsSync(join(root, "node_modules", name, "metadata.json")),
  );
  if (
    missing.length &&
    npm(["install", "--ignore-scripts", "--no-audit", ...missing]).status !== 0
  ) {
    throw new Error(
      "npm install failed. The font stylesheet and font picker were not changed.",
    );
  }

  let css = originalCss;
  let typography = originalTypography;
  for (const [index, name] of packages.entries()) {
    ({ css, typography } = addFont(css, typography, name, ids[index]));
  }
  if (
    read(cssPath) !== originalCss ||
    read(typographyPath) !== originalTypography
  ) {
    throw new Error(
      "The font stylesheet or picker changed during installation. Run the command again to register the installed fonts.",
    );
  }
  if (css !== originalCss) writeFileSync(join(root, cssPath), css);
  if (typography !== originalTypography)
    writeFileSync(join(root, typographyPath), typography);
  console.log(
    `Ready in Typography Builder: ${ids.map((id) => `font-${id}`).join(", ")}.`,
  );
  if (missing.length)
    console.log(
      "If Astro was running during installation, restart it before reopening Typography Builder.",
    );
}

try {
  main();
} catch (error) {
  console.error(`Font installer: ${error.message}`);
  process.exitCode = 1;
}
