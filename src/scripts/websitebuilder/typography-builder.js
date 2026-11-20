import savedCss from "../../styles/themes/typography.css?raw";
import {
  parseTypography,
  serializeTypography,
  typographyCss,
  typographyRulesCss,
  validateTypographyValue,
} from "../../data/typography-builder.js";
import {
  mergeThemeGroups,
  parseThemeGroups,
  serializeThemeGroups,
  setPaletteFamilies,
  themeGroupsStorageKey,
} from "../../data/theme-groups";
import colorsCss from "../../styles/themes/colors.css?raw";
import { readPalette } from "../../data/palette.js";

// Theme groups can use the custom color families in colors.css; register them
// before reading groups, as the Theme Builder does, or those colors are
// rejected as unknown and the whole group is skipped.
setPaletteFamilies(readPalette(colorsCss));
import { classGroupAreas, groupClassSlug } from "../../data/group-classes";
import { fetchProjectThemeGroups, saveGroupToProject } from "./project-themes";

const root = document.querySelector("[data-typography-builder]");
const get = (selector) => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing typography control: ${selector}`);
  return element;
};
const scope = get("#typography-scope");
const element = get("#typography-element");
const form = get("#typography-form");
const remove = get("#remove-typography-section");
const save = get("#save-typography");
const saveToFile = get("#save-typography-file");
const download = get("#download-typography");
const importButton = get("#import-typography");
const fileInput = get("#typography-file");
const status = get("#typography-status");
const controls = [...root.querySelectorAll("[data-typography-property]")];
const presets = [...root.querySelectorAll("[data-typography-preset]")];
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
  [data-sample-content] > div { min-width: 0; }
  h1, h2, h3, h4, h5, h6, p { margin: 0; font-size: inherit; font-weight: inherit; }
  code, pre { font-family: var(--font-mono, monospace); }
  pre { margin: 0; max-width: 100%; overflow-x: auto; }
  blockquote { margin: 0; }
  [data-sample-element-label] { display: block; font-family: var(--font-mono, monospace); font-size: .75rem; opacity: .7; }
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

// Theme groups saved by the Theme Builder in this browser. Typography edits
// for their areas are kept in `groupTypography` until saved.
let themeGroups = [];
const groupTypography = new Map();
const changedGroups = new Set();
const groupScopePrefix = "group:";
const previewGroupSection = "__theme-group__";

// Groups saved to the project (theme-groups.json) from any browser.
let projectGroups = [];

function loadThemeGroups() {
  try {
    const stored = localStorage.getItem(themeGroupsStorageKey);
    themeGroups = mergeThemeGroups(
      stored ? parseThemeGroups(stored) : [],
      projectGroups,
    );
  } catch (error) {
    console.warn("Typography builder: could not read theme groups", error);
    themeGroups = [...projectGroups];
  }
  for (const group of themeGroups)
    if (!changedGroups.has(group.id))
      groupTypography.set(group.id, structuredClone(group.typography ?? {}));
}

// Scope values: "" for site-wide defaults, "group:<id>:<region>" for a theme
// group area, or a section ID kept from older ID-based typography.
function parseScope(value) {
  if (!value.startsWith(groupScopePrefix)) return null;
  const [groupId, region] = value.slice(groupScopePrefix.length).split(":");
  const group = themeGroups.find(({ id }) => id === groupId);
  const area = classGroupAreas.find((item) => item.region === region);
  return group && area ? { group, area } : null;
}

function scopeLabel(value) {
  const area = parseScope(value);
  if (area) return `${area.group.name} / ${area.area.label}`;
  return value ? `Section #${value} (older ID)` : "Site-wide defaults";
}

// Removes empty elements and areas so saved typography stays tidy.
function tidyTypography(typography) {
  const tidy = {};
  for (const [region, rules] of Object.entries(typography)) {
    const kept = Object.fromEntries(
      Object.entries(rules).filter(([, styles]) => Object.keys(styles).length),
    );
    if (Object.keys(kept).length) tidy[region] = kept;
  }
  return tidy;
}

// Saves changed group typography into the theme groups in this browser,
// starting from the latest saved groups so Theme Builder changes are kept.
function saveGroupTypographyToBrowser() {
  const stored = localStorage.getItem(themeGroupsStorageKey);
  // Include project-only groups so their typography is kept in this browser.
  const latest = mergeThemeGroups(
    stored ? parseThemeGroups(stored) : [],
    themeGroups,
  );
  const updated = latest.map((group) =>
    changedGroups.has(group.id)
      ? {
          ...group,
          typography: tidyTypography(groupTypography.get(group.id) ?? {}),
        }
      : group,
  );
  localStorage.setItem(themeGroupsStorageKey, serializeThemeGroups(updated));
  const saved = updated.filter(({ id }) => changedGroups.has(id));
  themeGroups = updated;
  changedGroups.clear();
  return saved;
}

function setStatus(message, isError = false) {
  status.toggleAttribute("data-error", isError);
  status.textContent = message;
}

function report(error) {
  console.error("Typography builder:", error);
  setStatus(error instanceof Error ? error.message : String(error), true);
}

function markDirty() {
  dirty = true;
  setStatus("Unsaved changes. Save to project to apply them site-wide.");
}

function rules() {
  const area = parseScope(currentScope);
  if (area) {
    const typography = groupTypography.get(area.group.id) ?? {};
    groupTypography.set(area.group.id, typography);
    typography[area.area.region] ??= {};
    return typography[area.area.region];
  }
  return currentScope ? config.sections[currentScope] : config.defaults;
}

function renderPreview() {
  const area = parseScope(currentScope);
  const groupRules = area ? rules() : null;
  previewStyle.textContent = [
    typographyCss(config, true),
    ...(groupRules
      ? typographyRulesCss(
          groupRules,
          `[data-typography-preview] section[data-typography-section="${previewGroupSection}"] `,
        )
      : []),
  ].join("\n\n");
  const siteCss = typographyCss(config) || "/* No site-wide typography yet. */";
  get("#typography-css").textContent = area
    ? `/* src/styles/themes/typography.css */\n${siteCss}\n\n/* src/styles/themes/groups.css (${area.group.name} / ${area.area.label}) */\n${
        typographyRulesCss(
          groupRules,
          `.sg-${groupClassSlug(area.group.name)}-${area.area.suffix} `,
        ).join("\n\n") || "/* No typography for this area yet. */"
      }`
    : siteCss;
  sectionSample.hidden = !currentScope;
  sectionSample.querySelector(
    "[data-sample-content]",
  ).dataset.typographySection = area ? previewGroupSection : currentScope;
  sectionSample.querySelector("[data-sample-label]").textContent =
    `${scopeLabel(currentScope)} (includes site-wide defaults)`;
}

function renderControls() {
  for (const control of controls) {
    control.value =
      rules()[currentElement]?.[control.dataset.typographyProperty] ?? "";
    control.setCustomValidity("");
  }
  for (const preset of presets) {
    const control = get(`#typography-${preset.dataset.typographyPreset}`);
    preset.value = [...preset.options].some(
      (option) => option.value === control.value,
    )
      ? control.value
      : "custom";
    toggleCustomControl(preset);
  }
  remove.disabled = !currentScope;
  remove.textContent = parseScope(currentScope)
    ? "Clear this area's typography"
    : "Remove older section override";
  get("#typography-editing").textContent =
    `${scopeLabel(currentScope)} / ${currentElement}`;
  renderPreview();
}

function renderScopes() {
  const options = [new Option("Site-wide defaults", "")];
  if (!themeGroups.length) {
    const none = new Option(
      "No theme groups yet: create one in the Theme Builder",
      "__none__",
    );
    none.disabled = true;
    options.push(none);
  }
  for (const group of themeGroups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = `Theme group: ${group.name}`;
    for (const { region, label } of classGroupAreas)
      optgroup.append(
        new Option(
          `${group.name} / ${label}`,
          `${groupScopePrefix}${group.id}:${region}`,
        ),
      );
    options.push(optgroup);
  }
  const legacy = Object.keys(config.sections);
  if (legacy.length) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = "Older section IDs";
    for (const id of legacy)
      optgroup.append(new Option(`Section #${id} (older ID)`, id));
    options.push(optgroup);
  }
  scope.replaceChildren(...options);
  if (![...scope.options].some(({ value }) => value === currentScope))
    currentScope = "";
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
  if (!value) {
    for (const preset of presets) toggleCustomControl(preset);
    remove.disabled = !currentScope;
  }
  form.setAttribute("aria-busy", String(value));
}

function updateValue(control) {
  const key = control.dataset.typographyProperty;
  const value = control.value.trim();
  try {
    validateTypographyValue(key, value);
    control.setCustomValidity("");
  } catch (error) {
    control.setCustomValidity(error.message);
    setStatus(error.message, true);
    return;
  }
  const styles = rules();
  if (!Object.hasOwn(styles, currentElement)) styles[currentElement] = {};
  if (value) styles[currentElement][key] = value;
  else delete styles[currentElement][key];
  noteGroupChange();
  renderPreview();
  markDirty();
}

function noteGroupChange() {
  const area = parseScope(currentScope);
  if (area) changedGroups.add(area.group.id);
}

function toggleCustomControl(preset) {
  const key = preset.dataset.typographyPreset;
  const custom = preset.value === "custom";
  get(`[data-typography-custom="${key}"]`).hidden = !custom;
  get(`#typography-${key}`).disabled = busy || !custom;
}

for (const preset of presets) {
  preset.addEventListener("change", () => {
    const control = get(`#typography-${preset.dataset.typographyPreset}`);
    toggleCustomControl(preset);
    if (preset.value === "custom") {
      control.focus();
    } else {
      control.value = preset.value;
      updateValue(control);
    }
  });
}

for (const control of controls) {
  control.addEventListener("input", () => updateValue(control));
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

remove.addEventListener("click", () => {
  const area = parseScope(currentScope);
  if (
    !currentScope ||
    !window.confirm(
      area
        ? `Clear all typography for ${scopeLabel(currentScope)}? It will follow the site-wide defaults.`
        : `Remove all overrides for section #${currentScope}?`,
    )
  )
    return;
  if (area) {
    delete groupTypography.get(area.group.id)?.[area.area.region];
    changedGroups.add(area.group.id);
  } else {
    delete config.sections[currentScope];
    currentScope = "";
    renderScopes();
  }
  renderControls();
  markDirty();
  scope.focus();
});

get("#reset-typography-element").addEventListener("click", () => {
  delete rules()[currentElement];
  noteGroupChange();
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
  let groupMsg = "";
  if (changedGroups.size) {
    try {
      const saved = saveGroupTypographyToBrowser();
      groupMsg = ` Typography for ${saved.map(({ name }) => `"${name}"`).join(", ")} was saved with its theme group; use Save classes to groups.css in the Theme Builder to update groups.css.`;
    } catch (error) {
      report(error);
      return;
    }
  }
  setStatus(
    `CSS downloaded. Replace src/styles/themes/typography.css in your project to apply it. The download includes editable builder settings.${groupMsg}`,
  );
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
    setStatus(
      "Imported into the preview. Save to project to apply these settings.",
    );
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});

async function saveTypography(direct = false) {
  if (busy) return;
  if (!form.reportValidity()) {
    const invalid = form.querySelector(":invalid");
    const property = invalid?.dataset.typographyProperty;
    setStatus(
      property
        ? `Cannot save: ${property}: ${invalid.validationMessage}`
        : "Cannot save. Correct the invalid typography setting and try again.",
      true,
    );
    return;
  }
  const picker = direct
    ? window.showOpenFilePicker
    : window.showDirectoryPicker;
  if (typeof picker !== "function") {
    setStatus(
      "Saving requires Chrome or Edge on localhost or HTTPS. Download CSS and replace src/styles/themes/typography.css instead.",
      true,
    );
    return;
  }
  setBusy(true);
  setStatus(
    direct
      ? "Select the existing src/styles/themes/typography.css file."
      : "Choose the websitebuilder project folder and allow write access.",
  );
  let step = "selecting a save destination";
  let projectPath = "";
  let themes = null;
  try {
    let handle;
    if (direct) {
      [handle] = await window.showOpenFilePicker({
        types: [
          { description: "CSS stylesheet", accept: { "text/css": [".css"] } },
        ],
        excludeAcceptAllOption: true,
      });
      if (handle.name !== "typography.css") {
        throw new Error("Select the project's existing typography.css file.");
      }
      step = "requesting write access to the selected typography.css";
      if (
        (await handle.requestPermission({ mode: "readwrite" })) !== "granted"
      ) {
        throw new DOMException(
          "Write access was not granted.",
          "NotAllowedError",
        );
      }
    } else {
      const project = await window.showDirectoryPicker({ mode: "readwrite" });
      setStatus(`Checking the selected folder (${project.name})...`);
      projectPath = "src";
      const src = await project.getDirectoryHandle("src");
      projectPath = "src/styles";
      const styles = await src.getDirectoryHandle("styles");
      projectPath = "src/styles/global.css";
      const global = await (await styles.getFileHandle("global.css")).getFile();
      if (
        !/@import\s+["']\.\/themes\/typography\.css["']\s*;/.test(
          await global.text(),
        )
      ) {
        throw new Error(
          "The selected folder's src/styles/global.css must import ./themes/typography.css.",
        );
      }
      projectPath = "src/styles/themes";
      themes = await styles.getDirectoryHandle("themes");
      projectPath = "src/styles/themes/typography.css";
      handle = await themes.getFileHandle("typography.css");
    }
    step = "reading src/styles/themes/typography.css";
    const existing = await (await handle.getFile()).text();
    parseTypography(existing);
    const output = serializeTypography(config);
    let confirmation;
    if (direct) {
      confirmation =
        "Replace the selected typography.css with the current preview? Make sure you selected src/styles/themes/typography.css in the project, not a downloaded copy.";
    } else if (existing !== sourceCss && existing !== output) {
      confirmation =
        "The selected project's typography differs from the version loaded by this page. Replace it with the current preview?";
    }
    if (confirmation && !window.confirm(confirmation)) {
      setStatus("Save canceled. No files changed.");
      return;
    }
    step = "writing src/styles/themes/typography.css";
    projectPath = "";
    setStatus("Writing src/styles/themes/typography.css...");
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
    // Theme group typography: save it with the groups in this browser, then
    // rewrite those groups' classes in groups.css when the folder is open.
    let groupMsg = "";
    if (changedGroups.size) {
      step = "saving theme group typography";
      const saved = saveGroupTypographyToBrowser();
      const names = saved.map(({ name }) => `"${name}"`).join(", ");
      if (themes && saved.length) {
        step = "writing src/styles/themes/groups.css and theme-groups.json";
        for (const group of saved) await saveGroupToProject(themes, group);
        groupMsg = ` and ${names} in src/styles/themes/groups.css and theme-groups.json`;
      } else if (saved.length) {
        groupMsg = `. Typography for ${names} was saved with its theme group; use Save classes to groups.css in the Theme Builder to update groups.css`;
      }
    }
    dirty = false;
    setStatus(
      direct
        ? `Saved to the selected typography.css file${groupMsg}.`
        : `Saved src/styles/themes/typography.css${groupMsg}. Settings now apply to pages using the shared layout. Rebuild and deploy to update your published site.`,
    );
  } catch (error) {
    if (
      !projectPath &&
      step === "selecting a save destination" &&
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      setStatus("No save destination was selected. No files changed.");
    } else {
      console.error(`Typography builder: ${projectPath || step}`, error);
      if (
        projectPath &&
        error instanceof DOMException &&
        (error.name === "NotFoundError" || error.name === "TypeMismatchError")
      ) {
        setStatus(
          `Could not open ${projectPath} in the selected folder. ` +
            "Use Save directly to CSS to select the stylesheet instead, or use Download CSS.",
          true,
        );
      } else {
        const detail = error instanceof Error ? error.message : String(error);
        const next =
          error instanceof DOMException && error.name === "NotAllowedError"
            ? " Allow write access in Chrome or use Download CSS."
            : "";
        const action = projectPath ? `opening ${projectPath}` : step;
        setStatus(`Could not save while ${action}: ${detail}${next}`, true);
      }
    }
  } finally {
    setBusy(false);
  }
}

save.addEventListener("click", () => saveTypography());
saveToFile.addEventListener("click", () => saveTypography(true));

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

// Reload theme groups when the Theme Builder saves (in another tab or frame).
window.addEventListener("storage", (event) => {
  if (event.key !== themeGroupsStorageKey) return;
  loadThemeGroups();
  renderScopes();
  renderControls();
});

// Add groups saved to the project from other browsers once they arrive.
void fetchProjectThemeGroups().then((groups) => {
  projectGroups = groups;
  if (!config) return;
  loadThemeGroups();
  renderScopes();
  renderControls();
});

try {
  config = parseTypography(savedCss);
  loadThemeGroups();
  renderScopes();
  renderControls();
  setStatus("Project typography loaded. Select a scope and element to begin.");
} catch (error) {
  setBusy(true);
  report(error);
}
