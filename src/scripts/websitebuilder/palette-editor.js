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
const openForRemoval = get("#open-project-for-removal");
const removeAll = get("#remove-all-families");
const removalStatus = get("#removal-status");
const removalDialog = get("#remove-family-dialog");
const removalTitle = get("#remove-family-title");
const removalPrompt = get("#remove-family-prompt");
const confirmRemove = get("#confirm-remove-families");
const reconnect = get("#reconnect-project");
const projectName = get("#project-name");
const status = get("#editor-status");
const content = get("#editor-content");
const form = get("#add-family");
const list = get("#family-list");
const chooseImportFile = get("#choose-import-file");
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
  openForRemoval.disabled = value;
  removeAll.disabled = value || !list.childElementCount;
  reconnect.disabled = value;
  for (const button of form.querySelectorAll("button")) button.disabled = value;
  addImportedFamilies.disabled = value || !importedFamilies.length;
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

chooseImportFile.addEventListener("click", () => importFile.click());

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
    remove.disabled = busy;
    remove.setAttribute("aria-label", `Remove ${family.label}`);
    remove.addEventListener("click", () => removeFamilies(family.key));
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

async function scanDirectory(directory, path, checkReferences, nextCss) {
  for await (const [name, handle] of directory.entries()) {
    const childPath = `${path}/${name}`;
    if (handle.kind === "directory") {
      await scanDirectory(handle, childPath, checkReferences, nextCss);
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
    if (childPath === "src/styles/themes/colors.css") {
      if (text !== css)
        throw new Error(
          "colors.css changed on disk. Reopen the folder before removing families.",
        );
      checkReferences(nextCss, childPath);
    } else {
      checkReferences(text, childPath);
    }
  }
}

async function removeFamilies(family) {
  if (busy) return;
  const all = family === undefined;
  const originalCss = css;
  if (!project) {
    const opened = await chooseProject(true, cssFile);
    if (!opened) return;
  }
  setBusy(true);
  try {
    if (all && css !== originalCss)
      throw new Error(
        "colors.css changed on disk. Review the current families and try again.",
      );
    const families = all ? readPalette(css).map(({ key }) => key) : [family];
    if (!families.length) {
      status.textContent = "There are no current families to remove.";
      return;
    }
    const count = families.length;
    const nextCss = families.reduce(removePalette, css);
    status.textContent = all
      ? `Checking references to ${count} color ${count === 1 ? "family" : "families"}...`
      : `Checking references to ${family}...`;
    removalStatus.textContent = status.textContent;
    const references = new Map();
    const checkReferences = (text, path) => {
      for (const key of families) {
        if (!findPaletteReferences(text, key)) continue;
        if (!references.has(key)) references.set(key, []);
        references.get(key).push(path);
      }
    };
    for (const directory of ["src", "public"]) {
      await scanDirectory(
        await project.getDirectoryHandle(directory),
        directory,
        checkReferences,
        nextCss,
      );
    }
    const stored = localStorage.getItem(styleGroupsStorageKey);
    if (stored) {
      JSON.parse(stored);
      checkReferences(stored, "saved style groups in this browser");
    }
    if (references.size) {
      status.textContent = all
        ? `No families removed. Still in use: ${Array.from(references, ([key, paths]) => `${key} (${paths.join(", ")})`).join("; ")}.`
        : `Cannot remove ${family}; it is used in: ${references.get(family).join(", ")}.`;
      return;
    }
    removalTitle.textContent = all
      ? "Remove all current families"
      : "Remove color family";
    removalPrompt.textContent = all
      ? `Remove all ${count} current color ${count === 1 ? "family" : "families"} from colors.css? Tailwind defaults will remain available.`
      : `Remove ${family} and all 11 shades from colors.css?`;
    confirmRemove.textContent = all ? "Remove all families" : "Remove family";
    removalDialog.returnValue = "";
    removalDialog.showModal();
    await new Promise((resolve) =>
      removalDialog.addEventListener("close", resolve, { once: true }),
    );
    if (removalDialog.returnValue !== "remove") {
      status.textContent = "Removal cancelled.";
      return;
    }
    await save(nextCss);
    status.textContent = all
      ? `Removed ${count} color ${count === 1 ? "family" : "families"} from colors.css.`
      : `Removed ${family} from colors.css.`;
  } catch (error) {
    report(error);
  } finally {
    removalStatus.textContent = status.textContent;
    setBusy(false);
  }
}

async function openProject(selected, remember, expectedFile) {
  status.textContent = `Opening ${selected.name}...`;
  const sourceOnly = selected.name === "src";
  let selectedFile;
  try {
    const src = sourceOnly
      ? selected
      : await selected.getDirectoryHandle("src");
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
  if (expectedFile && !(await selectedFile.isSameEntry(expectedFile)))
    throw new Error(
      `The selected folder contains a different colors.css. Choose the parent folder of the src folder you opened.`,
    );
  const selectedCss = await (await selectedFile.getFile()).text();
  readPalette(selectedCss);
  if (remember) await rememberProject(selected);
  project = sourceOnly ? undefined : selected;
  cssFile = selectedFile;
  css = selectedCss;
  rememberedProject = selected;
  reconnect.hidden = true;
  projectName.textContent = selected.name;
  openForRemoval.hidden = !sourceOnly;
  content.hidden = false;
  render();
  return sourceOnly;
}

function openedStatus(sourceOnly, message) {
  status.textContent = sourceOnly
    ? "Opened colors.css from src. If you select Remove, the editor will ask for the project folder so it can check public files."
    : message;
}

async function chooseProject(requireRoot = false, expectedFile = undefined) {
  if (busy) return;
  if (!("showDirectoryPicker" in window)) {
    status.textContent =
      "This browser does not support project folder access. Use Chrome or Edge on localhost or HTTPS.";
    if (requireRoot) removalStatus.textContent = status.textContent;
    return;
  }
  setBusy(true);
  removalStatus.textContent = "";
  try {
    status.textContent = requireRoot
      ? "Choose the websitebuilder folder that contains src and public."
      : "Choose the websitebuilder project root or its src folder.";
    const selected = await window.showDirectoryPicker({ mode: "readwrite" });
    if (requireRoot && selected.name === "src") {
      status.textContent =
        "Select the folder containing src and public, not src itself.";
      return;
    }
    const sourceOnly = await openProject(selected, true, expectedFile);
    openedStatus(
      sourceOnly,
      "Project opened. Changes are saved directly to colors.css.",
    );
    return true;
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
    if (requireRoot) removalStatus.textContent = status.textContent;
    setBusy(false);
  }
}

open.addEventListener("click", () => chooseProject());
openForRemoval.addEventListener("click", () => chooseProject(true, cssFile));
removeAll.addEventListener("click", () => removeFamilies());

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
