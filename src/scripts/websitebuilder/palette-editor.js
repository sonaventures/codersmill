import {
  addPalettes,
  findPaletteReferences,
  isOklch,
  paletteShades,
  readOklchPaletteFiles,
  readPalette,
  removePalette,
} from "../../data/palette.js";
import { styleGroupsStorageKey } from "../../data/style-groups";

const root = document.querySelector("[data-palette-editor]");
const get = (selector) => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing palette editor control: ${selector}`);
  return element;
};
const open = get("#open-project");
const reconnect = get("#reconnect-project");
const projectName = get("#project-name");
const status = get("#editor-status");
const content = get("#editor-content");
const form = get("#add-family");
const list = get("#family-list");
const importFile = get("#import-ramp");
const importControl = get("#import-family-control");
const importFamily = get("#import-family");
const addImportedFamilies = get("#add-imported-families");
const familyName = get("#family-name");
const shadeInputs = paletteShades.map((shade) =>
  get(`[name="shade-${shade}"]`),
);
let project;
let cssFile;
let css;
let busy = false;
let importedFamilies = [];
let rememberedProject;
const projectSessionKey = "website-builder-palette-project";

async function projectStore(mode, operation) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open("website-builder-palette-editor", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("projects", mode);
      const request = operation(transaction.objectStore("projects"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error || request.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error("Project storage was aborted."));
    });
  } finally {
    database.close();
  }
}

async function rememberProject(selected) {
  const key = crypto.randomUUID();
  await projectStore("readwrite", (store) => store.put(selected, key));
  sessionStorage.setItem(projectSessionKey, key);
}

function setBusy(value) {
  busy = value;
  open.disabled = value;
  reconnect.disabled = value;
  for (const button of form.querySelectorAll("button")) button.disabled = value;
  addImportedFamilies.disabled = value || !importedFamilies.length;
  importFile.disabled = value;
  importFamily.disabled = value;
  for (const button of list.querySelectorAll("button"))
    button.disabled = value || !project;
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
  input.addEventListener("input", () => {
    updateShade(input, paletteShades[index]);
    rememberImportedFamily();
  });
}

function rememberImportedFamily() {
  if (!importedFamilies.length) return;
  const index = Number(importFamily.value);
  importedFamilies[index] = {
    key: familyName.value.trim(),
    values: shadeInputs.map((input) => input.value.trim()),
  };
  importFamily.options[index].textContent =
    importedFamilies[index].key || "Unnamed family";
}

familyName.addEventListener("input", rememberImportedFamily);

function applyImportedFamily(index) {
  const family = importedFamilies[index];
  if (!family) throw new Error("Choose an imported color family.");
  familyName.value = family.key;
  for (const [index, input] of shadeInputs.entries()) {
    input.value = family.values[index];
    updateShade(input, paletteShades[index]);
  }
  status.textContent =
    importedFamilies.length > 1
      ? `Imported ${importedFamilies.length} families. Review them using the selector, then select Add all imported families to save them together.`
      : "Imported all 11 shades. Review the name and values, then select Add family to save.";
}

function renderImportedFamilies() {
  importFamily.replaceChildren(
    ...importedFamilies.map(
      ({ key }, index) => new Option(key || "Unnamed family", String(index)),
    ),
  );
  importControl.hidden = importedFamilies.length < 2;
  addImportedFamilies.disabled = busy || !importedFamilies.length;
  if (importedFamilies.length) applyImportedFamily(0);
}

importFile.addEventListener("change", async () => {
  const files = Array.from(importFile.files ?? []);
  if (!files.length || busy) return;
  setBusy(true);
  try {
    const families = await readOklchPaletteFiles(files);
    if (
      families.some(({ values }) =>
        values.some((value) => !CSS.supports("color", value)),
      )
    )
      throw new Error(
        "The imported files contain an OKLCH color this browser cannot use.",
      );
    importedFamilies = families;
    renderImportedFamilies();
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
    remove.disabled = busy || !project;
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
      "colors.css changed on disk. Reopen the folder before saving.",
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
  if (!project) {
    status.textContent = "Choose the project root to remove color families.";
    return;
  }
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

async function openProject(selected, remember) {
  project = undefined;
  cssFile = undefined;
  css = undefined;
  projectName.textContent = "No project selected";
  content.hidden = true;
  status.textContent = `Opening ${selected.name}...`;
  const sourceOnly = selected.name === "src";
  let selectedFile;
  try {
    const src = sourceOnly ? selected : await selected.getDirectoryHandle("src");
    if (!sourceOnly) await selected.getDirectoryHandle("public");
    const styles = await src.getDirectoryHandle("styles");
    const themes = await styles.getDirectoryHandle("themes");
    selectedFile = await themes.getFileHandle("colors.css");
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "NotFoundError" || error.name === "TypeMismatchError")
    )
      throw new Error(
        `Could not find the expected folders and colors.css in "${selected.name}". Choose the websitebuilder project root or its src folder, not styles or themes.`,
      );
    throw error;
  }
  const selectedCss = await (await selectedFile.getFile()).text();
  readPalette(selectedCss);
  if (remember) await rememberProject(selected);
  project = sourceOnly ? undefined : selected;
  cssFile = selectedFile;
  css = selectedCss;
  rememberedProject = selected;
  reconnect.hidden = true;
  projectName.textContent = selected.name;
  content.hidden = false;
  render();
  return sourceOnly;
}

function openedStatus(sourceOnly, message) {
  status.textContent = sourceOnly
    ? "Opened colors.css from src. You can add or import families. To remove a family, choose the project root so the editor can check public files."
    : message;
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
      "Choose the websitebuilder project root or its src folder.";
    const selected = await window.showDirectoryPicker({ mode: "readwrite" });
    const sourceOnly = await openProject(selected, true);
    openedStatus(
      sourceOnly,
      "Project opened. Changes are saved directly to colors.css.",
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      status.textContent =
        "Folder selection cancelled. Choose the project root or its src folder, not the CSS file.";
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

reconnect.addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  try {
    const permission = await rememberedProject.requestPermission({
      mode: "readwrite",
    });
    if (permission !== "granted")
      throw new Error(
        "Folder access was not granted. Reconnect again or choose the project folder.",
      );
    const sourceOnly = await openProject(rememberedProject, false);
    openedStatus(sourceOnly, "Project reconnected. You can continue editing.");
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});

async function restoreProject() {
  if (!("showDirectoryPicker" in window)) return;
  setBusy(true);
  try {
    const key = sessionStorage.getItem(projectSessionKey);
    if (!key) return;
    rememberedProject = await projectStore("readonly", (store) =>
      store.get(key),
    );
    if (!rememberedProject)
      throw new Error(
        "The saved project connection is no longer available. Choose the project folder again.",
      );
    const permission = await rememberedProject.queryPermission({
      mode: "readwrite",
    });
    if (permission !== "granted") {
      reconnect.hidden = false;
      projectName.textContent = rememberedProject.name;
      status.textContent =
        "Your browser needs folder permission again. Select Reconnect project to continue without choosing the folder again.";
      return;
    }
    const sourceOnly = await openProject(rememberedProject, false);
    openedStatus(
      sourceOnly,
      "Project reopened automatically. You can continue editing.",
    );
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
}

restoreProject();

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
    const addAll = event.submitter === addImportedFamilies;
    const families = addAll
      ? importedFamilies.map((family, index) =>
          index === Number(importFamily.value) ? { key: name, values } : family,
        )
      : [{ key: name, values }];
    const next = addPalettes(css, families);
    await save(next);
    if (addAll) {
      importedFamilies = [];
    } else if (importedFamilies.length) {
      importedFamilies.splice(Number(importFamily.value), 1);
    }
    form.reset();
    renderImportedFamilies();
    if (importedFamilies.length) {
      status.textContent = `Added ${name} to colors.css. ${importedFamilies.length} imported ${importedFamilies.length === 1 ? "family remains" : "families remain"}. Review the next family and select Add family to save it.`;
    } else {
      for (const [index, input] of shadeInputs.entries())
        updateShade(input, paletteShades[index]);
      status.textContent = addAll
        ? `Added all ${families.length} imported ${families.length === 1 ? "family" : "families"} to colors.css in one save.`
        : `Added ${name} to colors.css.`;
    }
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});
