import idCssFallback from "../../styles/themes/id.css?raw";
import groupsCssFallback from "../../styles/themes/groups.css?raw";
import { parseGroupClasses } from "../../data/group-classes";
import { readTextFile, themesDirectory } from "./project-themes";
import {
  componentFolders,
  componentSavePath,
  generatePage,
  inspectComponent,
  pageRoute,
  pageSlug,
  parseIdsFromCss,
  readComponents,
  readThemeIds,
  rebaseComponentImports,
  saveComponentCopy,
  saveNewPage,
  validateSectionId,
} from "../../data/page-builder.js";

const root = document.querySelector("[data-page-builder]");
const get = (selector) => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing page builder control: ${selector}`);
  return element;
};
const open = get("#open-page-project");
const projectName = get("#page-project-name");
const status = get("#page-builder-status");
const form = get("#page-builder-form");
const fields = get("#page-builder-fields");
const name = get("#page-name");
const description = get("#page-description");
const pageStyleClass = get("#page-style-class");
const componentStyleClass = get("#component-style-class");
const path = get("#page-path");
const available = get("#available-components");
const sectionIdSelect = get("#component-section-id");
const customIdInput = get("#component-custom-id");
const add = get("#add-component");
const copyBeforeAdd = get("#copy-before-add");
const copyFields = get("#copy-before-add-fields");
const copyName = get("#copy-name");
const copyFolder = get("#copy-folder");
const copyNewFolderField = get("#copy-new-folder-field");
const copyNewFolder = get("#copy-new-folder");
const copyPreview = get("#copy-path-preview");
const NEW_FOLDER = "__new__";
let copyNameEdited = false;
const list = get("#selected-components");
const empty = get("#selected-components-empty");
const createdLink = get("#created-page-link");
const folderOptions = get("#component-folders");
let pageDirectory;
let componentsRoot;
let components = [];
let selected = [];
let availableIds = parseIdsFromCss(idCssFallback);
let busy = false;

function renderAvailableIds() {
  const currentVal = sectionIdSelect.value;
  sectionIdSelect.replaceChildren(
    new Option("No section ID", ""),
    ...availableIds.map((id) => new Option(id, id)),
  );
  if (currentVal && availableIds.includes(currentVal)) {
    sectionIdSelect.value = currentVal;
  }
}
renderAvailableIds();

// Theme group classes from src/styles/themes/groups.css (theme builder).
let availableClasses = parseGroupClasses(groupsCssFallback);

// Fills a dropdown with theme group classes: page classes for the page, or
// hero and section classes (grouped by theme group) for components.
function fillStyleClassSelect(select, forPage, current = select.value) {
  const classes = availableClasses.filter(
    ({ area }) => (area === "page") === forPage,
  );
  const options = [
    new Option(
      classes.length
        ? "No theme group"
        : "No theme groups yet (save classes in the theme builder)",
      "",
    ),
  ];
  if (forPage)
    for (const { className, groupName } of classes)
      options.push(new Option(`${groupName} (${className})`, className));
  else
    for (const groupName of new Set(classes.map((item) => item.groupName))) {
      const group = document.createElement("optgroup");
      group.label = groupName;
      for (const item of classes.filter(
        (entry) => entry.groupName === groupName,
      ))
        group.append(
          new Option(`${item.areaLabel} (${item.className})`, item.className),
        );
      options.push(group);
    }
  select.replaceChildren(...options);
  if (current && !classes.some(({ className }) => className === current))
    select.append(new Option(`${current} (not in groups.css)`, current));
  select.value = current;
}

function renderStyleClassOptions() {
  fillStyleClassSelect(pageStyleClass, true);
  fillStyleClassSelect(componentStyleClass, false);
}
renderStyleClassOptions();

function setBusy(value) {
  busy = value;
  open.disabled = value;
  fields.disabled = value;
  root.setAttribute("aria-busy", String(value));
}

function report(error) {
  console.error("Page builder:", error);
  status.textContent = error instanceof Error ? error.message : String(error);
}

function updatePath() {
  if (!name.value.trim()) {
    name.setCustomValidity("");
    path.textContent = "Enter a name to see the file path.";
    return;
  }
  try {
    const slug = pageSlug(name.value);
    name.setCustomValidity("");
    path.textContent = `File: src/pages/${slug}.astro · Route: ${pageRoute(slug)}`;
  } catch (error) {
    name.setCustomValidity(error.message);
    path.textContent = error.message;
  }
}

function renderComponents() {
  available.replaceChildren(
    ...components.map((component, index) => {
      const option = new Option(
        component.error
          ? `${component.path} — ${component.error}`
          : component.path,
        String(index),
      );
      option.disabled = Boolean(component.error);
      return option;
    }),
  );
  add.disabled = !components.some((component) => !component.error);
  folderOptions.replaceChildren(
    ...componentFolders(components)
      .filter(Boolean)
      .map((folder) => new Option(folder)),
  );
  renderCopyFolders();
}

// "Save a copy before adding": folder dropdown, default name, path preview.
function renderCopyFolders() {
  const current = copyFolder.value;
  copyFolder.replaceChildren(
    ...componentFolders(components).map(
      (folder) => new Option(folder || "(top level of src/components)", folder),
    ),
    new Option("New folder…", NEW_FOLDER),
  );
  if ([...copyFolder.options].some((option) => option.value === current))
    copyFolder.value = current;
}

function chosenCopyFolder() {
  return copyFolder.value === NEW_FOLDER
    ? copyNewFolder.value
    : copyFolder.value;
}

// Start from the chosen component: "<Name>Copy" in the component's own folder.
function resetCopyDefaults() {
  const component = components[Number(available.value)];
  if (!component) return;
  const segments = component.path.split("/");
  const base = segments.pop().replace(/\.astro$/, "");
  if (!copyNameEdited) copyName.value = `${base}Copy`;
  const folder = segments.join("/");
  if (copyFolder.value !== NEW_FOLDER) copyFolder.value = folder;
  updateCopyPreview();
}

function updateCopyPreview() {
  copyNewFolderField.hidden = copyFolder.value !== NEW_FOLDER;
  add.textContent = copyBeforeAdd.checked
    ? "Save copy and add component"
    : "Add component";
  if (!copyBeforeAdd.checked) return;
  try {
    const path = copyPath(chosenCopyFolder(), copyName.value);
    copyPreview.textContent = components.some(
      (existing) => existing.path === path,
    )
      ? `src/components/${path} already exists. Choose a different name or folder.`
      : `Saves to src/components/${path}`;
  } catch (error) {
    copyPreview.textContent = error.message;
  }
}

// Writes a copy of `component` to src/components/<path>, with relative imports
// adjusted for its new folder, and adds it to the component list.
async function copyComponent(component, path) {
  if (components.some((existing) => existing.path === path))
    throw new Error(
      `src/components/${path} already exists. Choose a different name or folder.`,
    );
  const source = rebaseComponentImports(component.source, component.path, path);
  const handle = await saveComponentCopy(componentsRoot, path, source);
  const copy = inspectComponent(path, source);
  if (!copy || copy.error)
    throw new Error(
      `Saved src/components/${path}, but it cannot be selected: ${copy?.error ?? "the file name is reserved."}`,
    );
  const entry = { ...copy, handle, source };
  const chosen = components[Number(available.value)];
  components.push(entry);
  components.sort((a, b) => a.path.localeCompare(b.path));
  renderComponents();
  if (chosen) available.value = String(components.indexOf(chosen));
  return entry;
}

function copyPath(folder, fileName) {
  const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, "");
  const cleanName = fileName.trim();
  if (!cleanName) throw new Error("Enter a name for the copy.");
  if (cleanName.includes("/"))
    throw new Error("Put folders in the Folder field, not in the name.");
  return componentSavePath(
    cleanFolder ? `${cleanFolder}/${cleanName}` : cleanName,
  );
}

function copyField(id, labelText, value, placeholder) {
  const wrapper = document.createElement("div");
  wrapper.className = "grid min-w-[180px] flex-1 gap-1";
  const label = document.createElement("label");
  label.htmlFor = id;
  label.className = "text-sm font-semibold";
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.value = value;
  input.placeholder = placeholder;
  input.maxLength = 200;
  input.autocomplete = "off";
  input.className =
    "w-full rounded border border-canvas-page-border bg-canvas-page p-3 text-ink-page";
  wrapper.append(label, input);
  return { wrapper, input };
}

// "Make a copy" form for one added component: choose a new name and folder,
// save the copy, then switch this row to use it.
function copyPanel(item, index, toggle) {
  const panel = document.createElement("div");
  panel.id = `component-${index}-copy`;
  panel.className = "grid gap-3 rounded border border-canvas-page-border p-3";
  panel.hidden = true;
  const segments = item.component.path.split("/");
  const original = segments.pop().replace(/\.astro$/, "");
  const name = copyField(
    `component-${index}-copy-name`,
    "Name",
    `${original}Copy`,
    "For example, HomeHero",
  );
  const folder = copyField(
    `component-${index}-copy-folder`,
    "Folder in src/components (blank for the top level)",
    segments.join("/"),
    "For example, custom/home",
  );
  folder.input.setAttribute("list", folderOptions.id);
  const preview = document.createElement("p");
  preview.className = "text-sm";
  preview.setAttribute("aria-live", "polite");
  const fields = document.createElement("div");
  fields.className = "flex flex-wrap gap-3";
  fields.append(name.wrapper, folder.wrapper);

  const saveCopy = document.createElement("button");
  saveCopy.type = "button";
  saveCopy.className = "btn btn-filled";
  saveCopy.textContent = "Save copy";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn-outline";
  cancel.textContent = "Cancel";
  const buttons = document.createElement("div");
  buttons.className = "flex flex-wrap gap-2";
  buttons.append(saveCopy, cancel);

  const updatePreview = () => {
    try {
      const path = copyPath(folder.input.value, name.input.value);
      const taken = components.some((existing) => existing.path === path);
      preview.textContent = taken
        ? `src/components/${path} already exists. Choose a different name or folder.`
        : `Saves to src/components/${path}`;
      saveCopy.disabled = taken;
    } catch (error) {
      preview.textContent = error.message;
      saveCopy.disabled = true;
    }
  };
  name.input.addEventListener("input", updatePreview);
  folder.input.addEventListener("input", updatePreview);
  updatePreview();

  const close = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  };
  cancel.addEventListener("click", close);
  saveCopy.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    const from = item.component.path;
    try {
      const copy = await copyComponent(
        item.component,
        copyPath(folder.input.value, name.input.value),
      );
      item.component = copy;
      renderSelection();
      list.children[index]
        ?.querySelector('button[data-action="copy"]')
        ?.focus();
      status.textContent = `Saved src/components/${copy.path} as a copy of ${from}. This component now uses the copy.`;
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  });

  panel.append(fields, preview, buttons);
  toggle.addEventListener("click", () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
    if (opening) {
      updatePreview();
      name.input.focus();
      name.input.select();
    }
  });
  return panel;
}

function actionButton(label, action, index, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-outline";
  button.textContent = label;
  button.dataset.action = action;
  button.setAttribute(
    "aria-label",
    `${label} ${selected[index].component.path}`,
  );
  button.disabled = disabled;
  button.addEventListener("click", () => {
    let target = index;
    if (action === "remove") selected.splice(index, 1);
    else {
      const destination = index + (action === "up" ? -1 : 1);
      [selected[index], selected[destination]] = [
        selected[destination],
        selected[index],
      ];
      target = destination;
    }
    renderSelection();
    target = Math.min(target, selected.length - 1);
    const row = list.children[target];
    const preferred = row?.querySelector(
      `button[data-action="${action}"]:not(:disabled)`,
    );
    const fallback = row?.querySelector("button:not(:disabled)");
    (preferred ?? fallback ?? add).focus();
    status.textContent = "Component order updated.";
  });
  return button;
}

function renderSelection() {
  list.replaceChildren();
  empty.hidden = selected.length > 0;
  for (const [index, item] of selected.entries()) {
    const row = document.createElement("li");
    row.className =
      "grid gap-4 rounded border border-canvas-page-border bg-canvas-01 p-4";
    const heading = document.createElement("h3");
    heading.className = "font-semibold";
    heading.textContent = `${index + 1}. ${item.component.path}`;
    row.append(heading);
    for (const property of item.component.properties) {
      const wrapper = document.createElement("div");
      wrapper.className = "grid gap-2";
      const label = document.createElement("label");
      label.htmlFor = `component-${index}-${property.name}`;
      label.textContent = `${property.name}${property.optional ? " (optional)" : " (required)"}`;
      let input;
      if (property.type === "boolean") {
        input = document.createElement("select");
        input.append(
          new Option(
            property.optional ? "Not set" : "Choose true or false",
            "",
          ),
          new Option("True", "true"),
          new Option("False", "false"),
        );
      } else {
        input = document.createElement("input");
        input.type = property.type === "number" ? "number" : "text";
        if (property.type === "number") input.step = "any";
      }
      input.id = label.htmlFor;
      input.required = !property.optional;
      input.value = item.values[property.name] ?? "";
      input.className =
        "w-full rounded border border-canvas-page-border bg-canvas-page p-3 text-ink-page";
      input.addEventListener("input", () => {
        item.values[property.name] = input.value;
      });
      input.addEventListener("change", () => {
        item.values[property.name] = input.value;
      });
      wrapper.append(label, input);
      row.append(wrapper);
    }
    const sectionWrapper = document.createElement("div");
    sectionWrapper.className = "grid gap-2";
    const sectionLabel = document.createElement("label");
    sectionLabel.htmlFor = `component-${index}-section-id`;
    sectionLabel.className = "text-sm font-semibold";
    sectionLabel.textContent = "Section ID (optional)";

    const sectionFields = document.createElement("div");
    sectionFields.className = "flex flex-wrap gap-2";

    const itemSelect = document.createElement("select");
    itemSelect.id = sectionLabel.htmlFor;
    itemSelect.className =
      "min-w-[180px] flex-1 rounded border border-canvas-page-border bg-canvas-page p-3 text-ink-page";
    itemSelect.append(new Option("No section ID", ""));
    for (const id of availableIds) {
      itemSelect.append(new Option(id, id));
    }
    if (item.sectionId && !availableIds.includes(item.sectionId)) {
      itemSelect.append(
        new Option(`Custom: ${item.sectionId}`, item.sectionId),
      );
    }
    itemSelect.value = item.sectionId ?? "";

    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.maxLength = 120;
    itemInput.placeholder = "Or custom ID";
    itemInput.className =
      "min-w-[160px] flex-1 rounded border border-canvas-page-border bg-canvas-page p-3 text-ink-page";
    itemInput.value = availableIds.includes(item.sectionId ?? "")
      ? ""
      : (item.sectionId ?? "");

    itemSelect.addEventListener("change", () => {
      item.sectionId = itemSelect.value;
      itemInput.value = "";
    });

    itemInput.addEventListener("input", () => {
      const val = itemInput.value.trim().replace(/^#/, "");
      item.sectionId = val;
      if (availableIds.includes(val)) {
        itemSelect.value = val;
      } else {
        itemSelect.value = "";
      }
    });

    sectionFields.append(itemSelect, itemInput);
    sectionWrapper.append(sectionLabel, sectionFields);
    row.append(sectionWrapper);

    const styleWrapper = document.createElement("div");
    styleWrapper.className = "grid gap-2";
    const styleLabel = document.createElement("label");
    styleLabel.htmlFor = `component-${index}-style-class`;
    styleLabel.className = "text-sm font-semibold";
    styleLabel.textContent = "Theme group (optional)";
    const styleSelect = document.createElement("select");
    styleSelect.id = styleLabel.htmlFor;
    styleSelect.className =
      "w-full rounded border border-canvas-page-border bg-canvas-page p-3 text-ink-page";
    fillStyleClassSelect(styleSelect, false, item.styleClass ?? "");
    styleSelect.addEventListener("change", () => {
      item.styleClass = styleSelect.value || undefined;
    });
    styleWrapper.append(styleLabel, styleSelect);
    row.append(styleWrapper);

    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2";
    const copyToggle = document.createElement("button");
    copyToggle.type = "button";
    copyToggle.className = "btn btn-outline";
    copyToggle.textContent = "Make a copy";
    copyToggle.dataset.action = "copy";
    copyToggle.setAttribute("aria-expanded", "false");
    copyToggle.setAttribute("aria-controls", `component-${index}-copy`);
    copyToggle.setAttribute(
      "aria-label",
      `Make a copy of ${item.component.path}`,
    );
    actions.append(
      actionButton("Move up", "up", index, index === 0),
      actionButton("Move down", "down", index, index === selected.length - 1),
      copyToggle,
      actionButton("Remove", "remove", index),
    );
    row.append(actions, copyPanel(item, index, copyToggle));
    list.append(row);
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
    status.textContent = "Choose the websitebuilder project folder.";
    const project = await window.showDirectoryPicker({ mode: "readwrite" });
    pageDirectory = undefined;
    componentsRoot = undefined;
    components = [];
    selected = [];
    form.hidden = true;
    createdLink.hidden = true;
    projectName.textContent = "No project selected";
    let src;
    let componentDirectory;
    try {
      src = await project.getDirectoryHandle("src");
      componentDirectory = await src.getDirectoryHandle("components");
      const pages = await src.getDirectoryHandle("pages");
      const builderDirectory =
        await pages.getDirectoryHandle("website-builder");
      await builderDirectory.getFileHandle("page-builder.astro");
      const layouts = await src.getDirectoryHandle("layouts");
      await layouts.getFileHandle("layout.astro");
      pageDirectory = pages;
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "NotFoundError" || error.name === "TypeMismatchError")
      )
        throw new Error(
          "Choose the websitebuilder project folder containing src, not a component or pages folder.",
        );
      throw error;
    }
    components = await readComponents(componentDirectory);
    if (!components.length)
      throw new Error(
        "No selectable Astro components were found in src/components.",
      );
    componentsRoot = componentDirectory;
    projectName.textContent = project.name;
    const liveIds = await readThemeIds(project);
    if (liveIds.length) {
      availableIds = liveIds;
    }
    try {
      availableClasses = parseGroupClasses(
        await readTextFile(await themesDirectory(project), "groups.css"),
      );
    } catch (error) {
      console.warn("Page builder: could not read groups.css", error);
    }
    form.reset();
    customIdInput.value = "";
    renderAvailableIds();
    renderStyleClassOptions();
    updatePath();
    renderComponents();
    renderSelection();
    form.hidden = false;
    status.textContent = "Project opened. Choose components and create a page.";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      status.textContent = "Project selection cancelled.";
    else if (error instanceof DOMException && error.name === "NotAllowedError")
      status.textContent =
        "Folder access was denied. Allow access and try again.";
    else report(error);
  } finally {
    setBusy(false);
  }
});

name.addEventListener("input", updatePath);
add.addEventListener("click", async () => {
  if (busy) return;
  let component = components[Number(available.value)];
  if (!component || component.error) {
    status.textContent = "Choose a supported component.";
    return;
  }
  const customId = customIdInput.value.trim().replace(/^#/, "");
  const selectedId = customId || sectionIdSelect.value.trim().replace(/^#/, "");
  if (selectedId) {
    try {
      validateSectionId(selectedId);
    } catch (error) {
      status.textContent = error.message;
      return;
    }
  }
  let copiedFrom;
  if (copyBeforeAdd.checked) {
    setBusy(true);
    try {
      const copy = await copyComponent(
        component,
        copyPath(chosenCopyFolder(), copyName.value),
      );
      copiedFrom = component.path;
      component = copy;
    } catch (error) {
      report(error);
      return;
    } finally {
      setBusy(false);
    }
    // Start fresh so the next add doesn't silently make another copy.
    copyBeforeAdd.checked = false;
    copyFields.hidden = true;
    copyBeforeAdd.setAttribute("aria-expanded", "false");
    copyNameEdited = false;
    copyNewFolder.value = "";
    updateCopyPreview();
  }
  selected.push({
    component,
    values: Object.create(null),
    sectionId: selectedId || undefined,
    styleClass: componentStyleClass.value || undefined,
  });
  sectionIdSelect.value = "";
  customIdInput.value = "";
  componentStyleClass.value = "";
  renderSelection();
  const added = copiedFrom
    ? `Saved src/components/${component.path} as a copy of ${copiedFrom} and added it`
    : `Added ${component.path}`;
  status.textContent = selectedId
    ? `${added} with section ID "${selectedId}".`
    : `${added}.`;
});

copyBeforeAdd.addEventListener("change", () => {
  copyFields.hidden = !copyBeforeAdd.checked;
  copyBeforeAdd.setAttribute("aria-expanded", String(copyBeforeAdd.checked));
  if (copyBeforeAdd.checked) resetCopyDefaults();
  else updateCopyPreview();
});
copyName.addEventListener("input", () => {
  copyNameEdited = true;
  updateCopyPreview();
});
copyFolder.addEventListener("change", () => {
  updateCopyPreview();
  if (copyFolder.value === NEW_FOLDER) copyNewFolder.focus();
});
copyNewFolder.addEventListener("input", updateCopyPreview);
available.addEventListener("change", () => {
  if (copyBeforeAdd.checked) resetCopyDefaults();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !pageDirectory) return;
  setBusy(true);
  createdLink.hidden = true;
  try {
    const slug = pageSlug(name.value);
    const assignments = selected.map(
      ({ component, values, sectionId, styleClass }) => {
        const typed = Object.create(null);
        for (const property of component.properties) {
          const value = values[property.name] ?? "";
          typed[property.name] =
            value === ""
              ? ""
              : property.type === "boolean"
                ? value === "true"
                : property.type === "number"
                  ? Number(value)
                  : value;
        }
        return { component, values: typed, sectionId, styleClass };
      },
    );
    const content = generatePage(
      name.value,
      description.value,
      assignments,
      pageStyleClass.value,
    );
    for (const { component } of selected) {
      const latest = await (await component.handle.getFile()).text();
      if (latest !== component.source)
        throw new Error(
          `${component.path} changed. Choose the project folder again before creating a page.`,
        );
    }
    await saveNewPage(pageDirectory, `${slug}.astro`, content);
    createdLink.href = pageRoute(slug);
    createdLink.hidden = false;
    status.textContent = `Created src/pages/${slug}.astro.`;
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});
