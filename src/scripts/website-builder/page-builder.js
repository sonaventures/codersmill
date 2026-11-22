import idCssFallback from "../../styles/themes/id.css?raw";
import groupsCssFallback from "../../styles/themes/groups.css?raw";
import { parseGroupClasses } from "../../data/website-builder/group-classes";
import { readTextFile, themesDirectory } from "./project-themes";
import {
  componentFolders,
  componentSavePath,
  generatePage,
  inspectComponent,
  isSlotComponent,
  pageRoute,
  pageSlug,
  parseIdsFromCss,
  readComponents,
  readThemeIds,
  rebaseComponentImports,
  saveComponentCopy,
  parseGeneratedPage,
  saveNewPage,
  updatePage,
  validateSectionId,
} from "../../data/website-builder/page-builder.js";

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
const headerComponent = get("#header-component");
const footerComponent = get("#footer-component");
const slotControls = {
  header: { select: headerComponent, copy: get("#header-component-copy-box") },
  footer: { select: footerComponent, copy: get("#footer-component-copy-box") },
};
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
const loadPageSelect = get("#load-page");
const loadPageButton = get("#load-page-button");
const submitButton = get("#create-page");
// The page loaded for editing; saving under the same name updates it.
let loadedSlug = "";
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

// Fills a dropdown with theme group classes: the page classes ("page"), or
// every other area's classes (grouped by theme group) for components
// ("component").
function fillStyleClassSelect(select, kind, current = select.value) {
  const classes = availableClasses.filter(({ area }) =>
    kind === "component" ? area !== "page" : area === kind,
  );
  const options = [
    new Option(
      classes.length
        ? "No theme group"
        : "No theme groups yet (save classes in the theme builder)",
      "",
    ),
  ];
  if (kind !== "component")
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
  fillStyleClassSelect(pageStyleClass, "page");
  fillStyleClassSelect(componentStyleClass, "component");
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
    const updating = loadedSlug && slug === loadedSlug;
    path.textContent = `File: src/pages/${slug}.astro · Route: ${pageRoute(slug)}${
      loadedSlug && !updating
        ? ` · Saves a new page; src/pages/${loadedSlug}.astro stays as it is.`
        : ""
    }`;
    submitButton.textContent = updating ? "Update page" : "Create page";
  } catch (error) {
    name.setCustomValidity(error.message);
    path.textContent = error.message;
  }
}

// Lists the pages in src/pages; only those the Page Builder can read can be
// chosen.
async function renderPageList() {
  const pages = [];
  for await (const [fileName, handle] of pageDirectory.entries()) {
    if (handle.kind !== "file" || !fileName.endsWith(".astro")) continue;
    let reason = "";
    try {
      parseGeneratedPage(await (await handle.getFile()).text());
    } catch (error) {
      reason = error.message;
    }
    pages.push({ fileName, reason });
  }
  pages.sort((a, b) => a.fileName.localeCompare(b.fileName));
  loadPageSelect.replaceChildren(
    new Option(pages.length ? "Choose a page…" : "No pages yet", ""),
    ...pages.map(({ fileName, reason }) => {
      const option = new Option(
        reason ? `${fileName} (not made by the Page Builder)` : fileName,
        fileName,
      );
      option.disabled = Boolean(reason);
      option.title = reason;
      return option;
    }),
  );
}

loadPageButton.addEventListener("click", async () => {
  if (busy || !pageDirectory) return;
  const fileName = loadPageSelect.value;
  if (!fileName) {
    status.textContent = "Choose a page to load.";
    return;
  }
  if (
    (selected.length || name.value.trim()) &&
    !window.confirm(
      `Load ${fileName}? The page and components you are building now will be replaced.`,
    )
  )
    return;
  setBusy(true);
  try {
    const source = await (
      await (await pageDirectory.getFileHandle(fileName)).getFile()
    ).text();
    const page = parseGeneratedPage(source);
    const missing = [
      ...page.items.map(({ path }) => path),
      ...[page.header, page.footer].filter(
        (choice) => choice && choice !== "none",
      ),
    ].filter((path) => !components.some((item) => item.path === path));
    if (missing.length)
      throw new Error(
        `${fileName} uses components that are missing or cannot be edited: ${[...new Set(missing)].join(", ")}.`,
      );
    selected = page.items.map(({ path, values, sectionId, styleClass }) => {
      const component = components.find((item) => item.path === path);
      if (component.error)
        throw new Error(`${path} cannot be edited: ${component.error}`);
      const strings = Object.create(null);
      for (const [key, value] of Object.entries(values))
        strings[key] = String(value);
      return { component, values: strings, sectionId, styleClass };
    });
    name.value = page.name;
    description.value = page.description;
    fillStyleClassSelect(pageStyleClass, "page", page.pageClass);
    fillSlotSelect(headerComponent, "header", page.header);
    fillSlotSelect(footerComponent, "footer", page.footer);
    loadedSlug = fileName.replace(/\.astro$/, "");
    createdLink.href = pageRoute(loadedSlug);
    createdLink.hidden = false;
    updatePath();
    renderSelection();
    status.textContent = `Loaded ${fileName} with ${selected.length} component${selected.length === 1 ? "" : "s"}. Edit it, then select Update page.`;
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});

// Header / footer pickers: the layout's site header ("") or footer, none,
// or a component with "header" / "footer" in its path.
function fillSlotSelect(select, slot, current = select.value) {
  const label = slot === "header" ? "Header" : "Footer";
  select.replaceChildren(
    new Option(`Site ${slot} from the layout (default)`, ""),
    new Option(`No ${slot}`, "none"),
  );
  const matching = components.filter(
    (component) =>
      isSlotComponent(component) &&
      component.path.toLowerCase().includes(slot),
  );
  if (matching.length) {
    const group = document.createElement("optgroup");
    group.label = `${label} components`;
    group.append(...matching.map(({ path }) => new Option(path, path)));
    select.append(group);
  }
  // A loaded page may use a component outside the usual names.
  if (current && ![...select.options].some(({ value }) => value === current)) {
    const component = components.find(({ path }) => path === current);
    const option = new Option(
      isSlotComponent(component) ? current : `${current} (cannot be used)`,
      current,
    );
    option.disabled = !isSlotComponent(component);
    select.append(option);
  }
  select.value = current;
  renderSlotCopy(slot);
}

// "Save a copy" for the chosen header or footer component: saves the copy,
// then this page uses it, so it can be edited without changing the original.
function renderSlotCopy(slot) {
  const { select, copy: box } = slotControls[slot];
  box.replaceChildren();
  const component = components.find(({ path }) => path === select.value);
  if (!isSlotComponent(component)) return;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn btn-outline justify-self-start";
  toggle.textContent = `Save a copy of this ${slot}`;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", `${slot}-component-copy`);
  const panel = copyPanel(component, `${slot}-component`, toggle, (copy, from) => {
    fillSlotSelect(select, slot, copy.path);
    box.querySelector("button")?.focus();
    status.textContent = `Saved src/components/${copy.path} as a copy of ${from}. This page's ${slot} now uses the copy.`;
  });
  box.append(toggle, panel);
}

// The header / footer choice for generatePage: "", "none", or a component.
function slotChoice(select) {
  if (select.value === "" || select.value === "none") return select.value;
  const component = components.find(({ path }) => path === select.value);
  if (!isSlotComponent(component))
    throw new Error(`${select.value} cannot be used as a header or footer.`);
  return component;
}

function renderComponents() {
  fillSlotSelect(headerComponent, "header");
  fillSlotSelect(footerComponent, "footer");
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

// "Make a copy" form for a component: choose a new name and folder, save the
// copy, then `onCopied(copy, fromPath)` switches whatever used it to the copy.
// `id` prefixes the form's element IDs; `toggle` is the button that opens it.
function copyPanel(component, id, toggle, onCopied) {
  const panel = document.createElement("div");
  panel.id = `${id}-copy`;
  panel.className = "grid gap-3 rounded border border-canvas-page-border p-3";
  panel.hidden = true;
  const segments = component.path.split("/");
  const original = segments.pop().replace(/\.astro$/, "");
  const name = copyField(
    `${id}-copy-name`,
    "Name",
    `${original}Copy`,
    "For example, HomeHero",
  );
  // Where to save it: any folder in src/components, or a new one.
  const folderWrapper = document.createElement("div");
  folderWrapper.className = "grid min-w-[180px] flex-1 gap-1";
  const folderLabel = document.createElement("label");
  folderLabel.htmlFor = `${id}-copy-folder`;
  folderLabel.className = "text-sm font-semibold";
  folderLabel.textContent = "Folder in src/components";
  const folderSelect = document.createElement("select");
  folderSelect.id = `${id}-copy-folder`;
  folderSelect.className =
    "w-full rounded border border-canvas-page-border bg-canvas-page p-3 text-ink-page";
  folderSelect.append(
    ...componentFolders(components).map(
      (folder) => new Option(folder || "(top level of src/components)", folder),
    ),
    new Option("New folder…", NEW_FOLDER),
  );
  folderSelect.value = segments.join("/");
  folderWrapper.append(folderLabel, folderSelect);
  const newFolder = copyField(
    `${id}-copy-new-folder`,
    "New folder",
    "",
    "For example, custom/headers",
  );
  newFolder.wrapper.hidden = true;
  const chosenFolder = () =>
    folderSelect.value === NEW_FOLDER
      ? newFolder.input.value
      : folderSelect.value;
  const preview = document.createElement("p");
  preview.className = "text-sm";
  preview.setAttribute("aria-live", "polite");
  const fields = document.createElement("div");
  fields.className = "flex flex-wrap gap-3";
  fields.append(name.wrapper, folderWrapper, newFolder.wrapper);

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
      if (folderSelect.value === NEW_FOLDER && !newFolder.input.value.trim())
        throw new Error("Enter a name for the new folder.");
      const path = copyPath(chosenFolder(), name.input.value);
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
  folderSelect.addEventListener("change", () => {
    newFolder.wrapper.hidden = folderSelect.value !== NEW_FOLDER;
    if (!newFolder.wrapper.hidden) newFolder.input.focus();
    updatePreview();
  });
  newFolder.input.addEventListener("input", updatePreview);
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
    const from = component.path;
    try {
      const copy = await copyComponent(
        component,
        copyPath(chosenFolder(), name.input.value),
      );
      onCopied(copy, from);
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
    fillStyleClassSelect(styleSelect, "component", item.styleClass ?? "");
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
    row.append(
      actions,
      copyPanel(item.component, `component-${index}`, copyToggle, (copy, from) => {
        item.component = copy;
        renderSelection();
        list.children[index]
          ?.querySelector('button[data-action="copy"]')
          ?.focus();
        status.textContent = `Saved src/components/${copy.path} as a copy of ${from}. This component now uses the copy.`;
      }),
    );
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
    loadedSlug = "";
    await renderPageList();
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
for (const slot of ["header", "footer"])
  slotControls[slot].select.addEventListener("change", () =>
    renderSlotCopy(slot),
  );
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
      {
        header: slotChoice(headerComponent),
        footer: slotChoice(footerComponent),
      },
    );
    const slotComponents = [headerComponent, footerComponent]
      .map(slotChoice)
      .filter((choice) => typeof choice === "object")
      .map((component) => ({ component }));
    for (const { component } of [...selected, ...slotComponents]) {
      const latest = await (await component.handle.getFile()).text();
      if (latest !== component.source)
        throw new Error(
          `${component.path} changed. Choose the project folder again before creating a page.`,
        );
    }
    if (loadedSlug && slug === loadedSlug) {
      if (
        !window.confirm(
          `Update src/pages/${slug}.astro? Its current content will be replaced.`,
        )
      ) {
        status.textContent = "Update cancelled. No files changed.";
        return;
      }
      await updatePage(pageDirectory, `${slug}.astro`, content);
      status.textContent = `Updated src/pages/${slug}.astro.`;
    } else {
      await saveNewPage(pageDirectory, `${slug}.astro`, content);
      status.textContent = `Created src/pages/${slug}.astro.`;
    }
    // Keep editing the saved page: later saves update it.
    loadedSlug = slug;
    updatePath();
    await renderPageList();
    loadPageSelect.value = `${slug}.astro`;
    createdLink.href = pageRoute(slug);
    createdLink.hidden = false;
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});
