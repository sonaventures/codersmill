import {
  addPalette,
  findPaletteReferences,
  isOklch,
  paletteShades,
  readOklchPalettes,
  readPalette,
  removePalette,
} from "../data/palette.js";
import { styleGroupsStorageKey } from "../data/style-groups";

const root = document.querySelector("[data-palette-editor]");
const get = (selector) => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing palette editor control: ${selector}`);
  return element;
};
const open = get("#open-project");
const projectName = get("#project-name");
const status = get("#editor-status");
const content = get("#editor-content");
const form = get("#add-family");
const list = get("#family-list");
const importFile = get("#import-ramp");
const importControl = get("#import-family-control");
const importFamily = get("#import-family");
const familyName = get("#family-name");
const shadeInputs = paletteShades.map((shade) =>
  get(`[name="shade-${shade}"]`),
);
let project;
let cssFile;
let css;
let busy = false;
let importedFamilies = [];

function setBusy(value) {
  busy = value;
  open.disabled = value;
  form.querySelector("button").disabled = value;
  importFile.disabled = value;
  importFamily.disabled = value;
  for (const button of list.querySelectorAll("button")) button.disabled = value;
  root.setAttribute("aria-busy", String(value));
}

const report = (error) => {
  console.error("Color family editor:", error);
  status.textContent = error instanceof Error ? error.message : String(error);
};

function updateShade(input, shade) {
  const value = input.value.trim();
  const valid = isOklch(value) && CSS.supports("color", value);
  input.setCustomValidity(
    !value || valid
      ? ""
      : "Enter a numeric OKLCH color, such as oklch(62.6% 0.128 243.6).",
  );
  get(`[data-shade-swatch="${shade}"]`).style.backgroundColor = valid
    ? value
    : "";
}

for (const [index, input] of shadeInputs.entries()) {
  input.addEventListener("input", () =>
    updateShade(input, paletteShades[index]),
  );
}

function applyImportedFamily(index) {
  const family = importedFamilies[index];
  if (!family) throw new Error("Choose an imported color family.");
  if (family.key) familyName.value = family.key;
  for (const [index, input] of shadeInputs.entries()) {
    input.value = family.values[index];
    updateShade(input, paletteShades[index]);
  }
  status.textContent =
    "Imported all 11 shades. Review the name and values, then select Add family to save.";
}

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file || busy) return;
  setBusy(true);
  try {
    if (file.size > 1_000_000)
      throw new Error("Choose a CSS file smaller than 1 MB.");
    const families = readOklchPalettes(await file.text());
    if (
      families.some(({ values }) =>
        values.some((value) => !CSS.supports("color", value)),
      )
    )
      throw new Error(
        "The CSS file contains an OKLCH color this browser cannot use.",
      );
    importedFamilies = families;
    importFamily.replaceChildren(
      ...families.map(
        ({ key }, index) => new Option(key || "Unnamed family", String(index)),
      ),
    );
    importControl.hidden = families.length < 2;
    applyImportedFamily(0);
  } catch (error) {
    report(error);
  } finally {
    importFile.value = "";
    setBusy(false);
  }
});

importFamily.addEventListener("change", () => {
  try {
    applyImportedFamily(Number(importFamily.value));
  } catch (error) {
    report(error);
  }
});

function render() {
  list.replaceChildren();
  for (const family of readPalette(css)) {
    const row = document.createElement("div");
    row.className = "family-row";
    const title = document.createElement("strong");
    title.textContent = family.label;
    const swatches = document.createElement("div");
    swatches.className = "family-swatches";
    for (const shade of paletteShades) {
      const swatch = document.createElement("span");
      swatch.className = "family-swatch";
      swatch.title = `${family.key}-${shade}: ${family.values.get(shade)}`;
      swatch.style.backgroundColor = family.values.get(shade);
      swatches.append(swatch);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${family.label}`);
    remove.addEventListener("click", () => removeFamily(family.key));
    row.append(title, swatches, remove);
    list.append(row);
  }
}

async function save(next) {
  const latest = await (await cssFile.getFile()).text();
  if (latest !== css)
    throw new Error(
      "colors.css changed on disk. Choose the project folder again before saving.",
    );
  const writable = await cssFile.createWritable();
  try {
    await writable.write(next);
    await writable.close();
  } catch (error) {
    await writable
      .abort()
      .catch((abortError) =>
        console.error("Unable to abort file write:", abortError),
      );
    throw error;
  }
  css = next;
  render();
}

async function scanDirectory(directory, path, family, references) {
  for await (const [name, handle] of directory.entries()) {
    const childPath = `${path}/${name}`;
    if (handle.kind === "directory") {
      await scanDirectory(handle, childPath, family, references);
      continue;
    }
    if (
      /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|mp4|webm|avif)$/i.test(
        name,
      )
    )
      continue;
    const file = await handle.getFile();
    if (file.size > 5_000_000)
      throw new Error(`Cannot safely scan ${childPath}: file exceeds 5 MB.`);
    const text = await file.text();
    if (text.includes("\0") || text.includes("\uFFFD"))
      throw new Error(
        `Cannot safely scan ${childPath}: unsupported file encoding.`,
      );
    const searchable =
      childPath === "src/styles/themes/colors.css"
        ? removePalette(text, family)
        : text;
    if (findPaletteReferences(searchable, family)) references.push(childPath);
  }
}

async function removeFamily(family) {
  if (busy) return;
  setBusy(true);
  try {
    status.textContent = `Checking references to ${family}...`;
    const references = [];
    for (const directory of ["src", "public"]) {
      await scanDirectory(
        await project.getDirectoryHandle(directory),
        directory,
        family,
        references,
      );
    }
    const stored = localStorage.getItem(styleGroupsStorageKey);
    if (stored) {
      JSON.parse(stored);
      if (findPaletteReferences(stored, family))
        references.push("saved style groups in this browser");
    }
    if (references.length) {
      status.textContent = `Cannot remove ${family}; it is used in: ${references.join(", ")}.`;
      return;
    }
    if (
      !window.confirm(`Remove ${family} and all 11 shades from colors.css?`)
    ) {
      status.textContent = "Removal cancelled.";
      return;
    }
    await save(removePalette(css, family));
    status.textContent = `Removed ${family} from colors.css.`;
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
}

open.addEventListener("click", async () => {
  if (busy) return;
  if (!("showDirectoryPicker" in window)) {
    status.textContent =
      "This browser does not support project folder access. Use Chrome or Edge on localhost or HTTPS.";
    return;
  }
  setBusy(true);
  try {
    status.textContent =
      "Choose the websitebuilder project folder in the folder picker.";
    const selected = await window.showDirectoryPicker({ mode: "readwrite" });
    project = undefined;
    cssFile = undefined;
    css = undefined;
    projectName.textContent = "No project selected";
    content.hidden = true;
    status.textContent = `Opening ${selected.name}...`;
    let selectedFile;
    try {
      const src = await selected.getDirectoryHandle("src");
      await selected.getDirectoryHandle("public");
      const styles = await src.getDirectoryHandle("styles");
      const themes = await styles.getDirectoryHandle("themes");
      selectedFile = await themes.getFileHandle("colors.css");
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "NotFoundError" || error.name === "TypeMismatchError")
      )
        throw new Error(
          `"${selected.name}" is not the project folder. Choose the websitebuilder folder containing src and public, not colors.css or the themes folder.`,
        );
      throw error;
    }
    const selectedCss = await (await selectedFile.getFile()).text();
    readPalette(selectedCss);
    project = selected;
    cssFile = selectedFile;
    css = selectedCss;
    projectName.textContent = selected.name;
    content.hidden = false;
    render();
    status.textContent =
      "Project opened. Changes are saved directly to colors.css.";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      status.textContent =
        "Project selection cancelled. Choose the websitebuilder folder, not the CSS file.";
      return;
    }
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      status.textContent =
        "Folder access was denied. Allow access or open this page in Chrome or Edge.";
      return;
    }
    report(error);
  } finally {
    setBusy(false);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  try {
    const data = new FormData(form);
    const name = String(data.get("family")).trim();
    const values = paletteShades.map((shade) =>
      String(data.get(`shade-${shade}`)),
    );
    await save(addPalette(css, name, values));
    form.reset();
    importedFamilies = [];
    importControl.hidden = true;
    for (const [index, input] of shadeInputs.entries())
      updateShade(input, paletteShades[index]);
    status.textContent = `Added ${name} to colors.css.`;
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});
