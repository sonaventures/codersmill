import savedCss from "../styles/utilities/typography.css?raw";
import {
  parseTypography,
  serializeTypography,
  typographyCss,
  validateSectionId,
  validateTypographyValue,
} from "../data/typography-builder.js";

const root = document.querySelector("[data-typography-builder]");
const get = (selector) => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing typography control: ${selector}`);
  return element;
};
const scope = get("#typography-scope");
const element = get("#typography-element");
const form = get("#typography-form");
const sectionForm = get("#add-typography-section");
const sectionId = get("#typography-section-id");
const remove = get("#remove-typography-section");
const save = get("#save-typography");
const download = get("#download-typography");
const importButton = get("#import-typography");
const fileInput = get("#typography-file");
const status = get("#typography-status");
const controls = [...root.querySelectorAll("[data-typography-property]")];
const preview = get("[data-typography-preview]");
const shadow = preview.attachShadow({ mode: "open" });
const samples = document.createElement("div");
samples.dataset.typographyPreview = "";
samples.append(...preview.childNodes);
const previewBase = document.createElement("style");
previewBase.textContent = `
  [data-typography-preview] { display: grid; gap: 1.5rem; }
  [data-sample-label] { border-bottom: 1px solid var(--canvas-page-border); padding-bottom: .5rem; margin-bottom: .75rem; font-size: .875rem; font-weight: 600; }
  [data-sample-content] { display: grid; gap: .75rem; overflow-wrap: anywhere; }
  h1, h2, h3, h4, h5, h6, p { margin: 0; font-size: inherit; font-weight: inherit; }
  code { font-size: .75rem; opacity: .7; }
`;
const previewStyle = document.createElement("style");
shadow.append(previewBase, previewStyle, samples);
const sectionSample = samples.querySelector(
  '[data-typography-sample="section"]',
);
let config;
let currentScope = "";
let currentElement = element.value;
let dirty = false;
let busy = false;
let sourceCss = savedCss;

function report(error) {
  console.error("Typography builder:", error);
  status.textContent = error instanceof Error ? error.message : String(error);
}

function markDirty() {
  dirty = true;
  status.textContent =
    "Unsaved changes. Save to project to apply them site-wide.";
}

function rules() {
  return currentScope ? config.sections[currentScope] : config.defaults;
}

function renderPreview() {
  previewStyle.textContent = typographyCss(config, true);
  get("#typography-css").textContent =
    typographyCss(config) || "/* No typography overrides yet. */";
  sectionSample.hidden = !currentScope;
  sectionSample.querySelector(
    "[data-sample-content]",
  ).dataset.typographySection = currentScope;
  sectionSample.querySelector("[data-sample-label]").textContent =
    `Section #${currentScope} (includes site-wide defaults)`;
}

function renderControls() {
  for (const control of controls) {
    control.value =
      rules()[currentElement]?.[control.dataset.typographyProperty] ?? "";
    control.setCustomValidity("");
  }
  remove.disabled = !currentScope;
  get("#typography-editing").textContent =
    `${currentScope ? `Section #${currentScope}` : "Site-wide defaults"} / ${currentElement}`;
  renderPreview();
}

function renderScopes() {
  scope.replaceChildren(
    new Option("Site-wide defaults", ""),
    ...Object.keys(config.sections).map(
      (id) => new Option(`Section #${id}`, id),
    ),
  );
  scope.value = currentScope;
}

function confirmDiscard() {
  return !dirty || window.confirm("Discard unsaved typography changes?");
}

function setBusy(value) {
  busy = value;
  for (const control of root.querySelectorAll("button, input, select")) {
    control.disabled = value;
  }
  if (!value) remove.disabled = !currentScope;
  root.setAttribute("aria-busy", String(value));
}

for (const control of controls) {
  control.addEventListener("input", () => {
    const key = control.dataset.typographyProperty;
    const value = control.value.trim();
    try {
      validateTypographyValue(key, value);
      control.setCustomValidity("");
    } catch (error) {
      control.setCustomValidity(error.message);
      status.textContent = error.message;
      return;
    }
    const styles = rules();
    if (!Object.hasOwn(styles, currentElement)) styles[currentElement] = {};
    if (value) styles[currentElement][key] = value;
    else delete styles[currentElement][key];
    renderPreview();
    markDirty();
  });
  control.addEventListener("change", () => control.reportValidity());
}

form.addEventListener("submit", (event) => event.preventDefault());
scope.addEventListener("change", () => {
  if (!form.reportValidity()) {
    scope.value = currentScope;
    return;
  }
  currentScope = scope.value;
  renderControls();
});
element.addEventListener("change", () => {
  if (!form.reportValidity()) {
    element.value = currentElement;
    return;
  }
  currentElement = element.value;
  renderControls();
});

sectionId.addEventListener("input", () => sectionId.setCustomValidity(""));
sectionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const id = sectionId.value.trim();
  try {
    validateSectionId(id);
    if (Object.hasOwn(config.sections, id)) {
      throw new Error(
        `Section #${id} already exists. Select it in Editing scope.`,
      );
    }
    Object.defineProperty(config.sections, id, {
      value: {},
      enumerable: true,
      writable: true,
      configurable: true,
    });
    currentScope = id;
    sectionId.value = "";
    renderScopes();
    renderControls();
    markDirty();
    scope.focus();
  } catch (error) {
    sectionId.setCustomValidity(error.message);
    sectionId.reportValidity();
    status.textContent = error.message;
  }
});

remove.addEventListener("click", () => {
  if (
    !currentScope ||
    !window.confirm(`Remove all overrides for section #${currentScope}?`)
  )
    return;
  delete config.sections[currentScope];
  currentScope = "";
  renderScopes();
  renderControls();
  markDirty();
  scope.focus();
});

get("#reset-typography-element").addEventListener("click", () => {
  delete rules()[currentElement];
  renderControls();
  markDirty();
});

download.addEventListener("click", () => {
  if (!form.reportValidity()) return;
  const url = URL.createObjectURL(
    new Blob([serializeTypography(config)], { type: "text/css" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "typography.css";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent =
    "CSS downloaded. Replace src/styles/utilities/typography.css in your project to apply it. The download includes editable builder settings.";
});

importButton.addEventListener("click", () => {
  fileInput.value = "";
  fileInput.click();
});
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file || !confirmDiscard()) return;
  setBusy(true);
  try {
    if (file.size > 1_000_000)
      throw new Error("Typography CSS must be under 1 MB.");
    const imported = parseTypography(await file.text());
    config = imported;
    currentScope = "";
    renderScopes();
    renderControls();
    markDirty();
    status.textContent =
      "Imported into the preview. Save to project to apply these settings.";
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});

save.addEventListener("click", async () => {
  if (busy || !form.reportValidity()) return;
  if (!("showDirectoryPicker" in window)) {
    status.textContent =
      "Project folder saving requires Chrome or Edge on localhost or HTTPS. Download CSS and replace src/styles/utilities/typography.css instead.";
    return;
  }
  setBusy(true);
  let selectingFolder = true;
  try {
    const project = await window.showDirectoryPicker({ mode: "readwrite" });
    selectingFolder = false;
    const src = await project.getDirectoryHandle("src");
    await project.getDirectoryHandle("public");
    const styles = await src.getDirectoryHandle("styles");
    const global = await (await styles.getFileHandle("global.css")).getFile();
    if (
      !/@import\s+["']\.\/utilities\/typography\.css["']\s*;/.test(
        await global.text(),
      )
    ) {
      throw new Error(
        "Choose this websitebuilder project: global.css must import ./utilities/typography.css.",
      );
    }
    const utilities = await styles.getDirectoryHandle("utilities");
    const handle = await utilities.getFileHandle("typography.css");
    const existing = await (await handle.getFile()).text();
    parseTypography(existing);
    const output = serializeTypography(config);
    if (
      existing !== sourceCss &&
      existing !== output &&
      !window.confirm(
        "The selected project's typography differs from the version loaded by this page. Replace it with the current preview?",
      )
    ) {
      status.textContent = "Save canceled. No files changed.";
      return;
    }
    const writable = await handle.createWritable();
    try {
      await writable.write(output);
      await writable.close();
    } catch (error) {
      await writable
        .abort()
        .catch((abortError) =>
          console.error("Unable to abort typography write:", abortError),
        );
      throw error;
    }
    sourceCss = output;
    dirty = false;
    status.textContent =
      "Saved src/styles/utilities/typography.css. Settings now apply to pages using the shared layout. Rebuild and deploy to update your published site.";
  } catch (error) {
    if (
      selectingFolder &&
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      status.textContent = "Folder selection canceled. No files changed.";
    } else {
      report(error);
    }
  } finally {
    setBusy(false);
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

try {
  config = parseTypography(savedCss);
  renderScopes();
  renderControls();
  status.textContent =
    "Project typography loaded. Select a scope and element to begin.";
} catch (error) {
  setBusy(true);
  report(error);
}
