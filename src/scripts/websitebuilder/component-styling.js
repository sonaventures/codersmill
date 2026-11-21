import groupsCssFallback from "../../styles/themes/groups.css?raw";
import { parseGroupClasses } from "../../data/group-classes";
import {
  applyThemeClasses,
  elementKinds,
  findStyleableElements,
  parseClassList,
  stylePresets,
  themeClassesOf,
} from "../../data/component-styling.js";
import {
  pageRoute,
  parseGeneratedPage,
  readComponents,
} from "../../data/page-builder.js";
import { readTextFile, themesDirectory } from "./project-themes";

const root = document.querySelector("[data-component-styling]");
const get = (selector) => {
  const element = root.querySelector(selector);
  if (!element)
    throw new Error(`Missing component styling control: ${selector}`);
  return element;
};
const openButton = get("#open-styling-project");
const projectName = get("#styling-project-name");
const status = get("#styling-status");
const workspace = get("#styling-workspace");
const pageSelect = get("#styling-page");
const componentSelect = get("#styling-component");
const groupSelect = get("#styling-group");
const note = get("#styling-component-note");
const kindSelect = get("#styling-kind");
const styledOnly = get("#styling-styled-only");
const count = get("#styling-count");
const list = get("#styling-elements");
const saveButton = get("#styling-save");
const discardButton = get("#styling-discard");
const pendingLabel = get("#styling-pending");
const frame = get("#styling-frame");
const pageLink = get("#styling-page-link");

let components = []; // { path, handle, source }
let pages = []; // { fileName, slug, page } for pages made by the Page Builder
let groupClasses = parseGroupClasses(groupsCssFallback);
let current = null; // { component, source, elements }
let pending = new Map(); // element index -> theme classes
let busy = false;

const kindLabel = new Map(elementKinds.map(({ key, label }) => [key, label]));
const libraryFolders = ["flowbite/", "flyonui/"];

function report(error) {
  console.error("Component styling:", error);
  status.textContent = error instanceof Error ? error.message : String(error);
}

function setBusy(value) {
  busy = value;
  for (const control of [
    openButton,
    pageSelect,
    componentSelect,
    saveButton,
    discardButton,
  ])
    control.disabled = value;
  if (!value) renderPending();
  root.setAttribute("aria-busy", String(value));
}

function confirmDiscard() {
  return (
    !pending.size ||
    window.confirm(
      `Discard ${pending.size} unsaved change${pending.size === 1 ? "" : "s"} to ${current.component.path}?`,
    )
  );
}

openButton.addEventListener("click", async () => {
  if (busy) return;
  if (!("showDirectoryPicker" in window)) {
    status.textContent =
      "Folder access is not available in this browser. Use Chrome or Edge on localhost or HTTPS.";
    return;
  }
  if (current && !confirmDiscard()) return;
  setBusy(true);
  try {
    const project = await window.showDirectoryPicker({ mode: "readwrite" });
    let src;
    let componentDirectory;
    let pageDirectory;
    try {
      src = await project.getDirectoryHandle("src");
      componentDirectory = await src.getDirectoryHandle("components");
      pageDirectory = await src.getDirectoryHandle("pages");
      await (
        await pageDirectory.getDirectoryHandle("website-builder")
      ).getFileHandle("component-styling.astro");
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
    components = (await readComponents(componentDirectory)).filter(
      (component) => component.handle,
    );
    pages = [];
    for await (const [fileName, handle] of pageDirectory.entries()) {
      if (handle.kind !== "file" || !fileName.endsWith(".astro")) continue;
      try {
        const page = parseGeneratedPage(await (await handle.getFile()).text());
        pages.push({
          fileName,
          slug: fileName.slice(0, -".astro".length),
          page,
        });
      } catch {
        // Only pages made by the Page Builder list their components.
      }
    }
    pages.sort((a, b) => a.fileName.localeCompare(b.fileName));
    try {
      groupClasses = parseGroupClasses(
        await readTextFile(await themesDirectory(project), "groups.css"),
      );
    } catch (error) {
      console.warn("Component styling: could not read groups.css", error);
    }
    projectName.textContent = project.name;
    current = null;
    pending = new Map();
    renderPages();
    renderGroups();
    renderComponentOptions();
    renderElements();
    workspace.hidden = false;
    status.textContent = pages.length
      ? "Project opened. Choose a page, then one of its components."
      : "Project opened. No Page Builder pages yet; choose any component.";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      status.textContent = "Project selection cancelled.";
    else report(error);
  } finally {
    setBusy(false);
  }
});

function selectedPage() {
  return pages.find(({ fileName }) => fileName === pageSelect.value) ?? null;
}

function renderPages() {
  shownPage = "";
  pageSelect.replaceChildren(
    new Option(
      pages.length ? "No page (any component)" : "No Page Builder pages",
      "",
    ),
    ...pages.map(
      ({ fileName, page }) =>
        new Option(`${page.name} (${fileName})`, fileName),
    ),
  );
  renderFrame();
}

function renderGroups(preferred = "") {
  const options = [new Option("No theme group (site defaults)", "")];
  for (const groupName of new Set(groupClasses.map((item) => item.groupName))) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = groupName;
    for (const item of groupClasses.filter(
      (entry) => entry.groupName === groupName,
    ))
      optgroup.append(
        new Option(`${item.areaLabel} (${item.className})`, item.className),
      );
    options.push(optgroup);
  }
  groupSelect.replaceChildren(...options);
  if (
    preferred &&
    !groupClasses.some(({ className }) => className === preferred)
  )
    groupSelect.append(
      new Option(`${preferred} (not in groups.css)`, preferred),
    );
  groupSelect.value = preferred;
}

// Components on the chosen page first (with their theme group), then all.
function renderComponentOptions() {
  const page = selectedPage();
  const options = [new Option("Choose a component…", "")];
  if (page) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = `On ${page.page.name}`;
    page.page.items.forEach(({ path, styleClass, sectionId }, index) => {
      const details = [sectionId && `#${sectionId}`, styleClass]
        .filter(Boolean)
        .join(", ");
      optgroup.append(
        new Option(
          `${index + 1}. ${path}${details ? ` (${details})` : ""}`,
          `page:${index}`,
        ),
      );
    });
    options.push(optgroup);
  }
  const all = document.createElement("optgroup");
  all.label = "All components";
  for (const { path } of components)
    all.append(new Option(path, `path:${path}`));
  options.push(all);
  componentSelect.replaceChildren(...options);
}

function renderFrame() {
  const page = selectedPage();
  const route = page ? pageRoute(page.slug) : "";
  get("#styling-preview").hidden = !route;
  pageLink.href = route || "#";
  if (route && frame.getAttribute("src") !== route) frame.src = route;
}

let shownPage = "";
pageSelect.addEventListener("change", () => {
  if (current && !confirmDiscard()) {
    // Keep the page that the open component came from.
    pageSelect.value = shownPage;
    return;
  }
  shownPage = pageSelect.value;
  current = null;
  pending = new Map();
  renderComponentOptions();
  renderElements();
  renderFrame();
});

componentSelect.addEventListener("change", () => {
  if (current && !confirmDiscard()) {
    componentSelect.value = current.option;
    return;
  }
  const value = componentSelect.value;
  if (!value) {
    current = null;
    pending = new Map();
    renderElements();
    return;
  }
  const page = selectedPage();
  let path = value.slice("path:".length);
  let groupClass = "";
  if (value.startsWith("page:")) {
    const item = page.page.items[Number(value.slice("page:".length))];
    path = item.path;
    groupClass = item.styleClass ?? "";
  }
  if (!groupClass && page) groupClass = page.page.pageClass;
  const component = components.find((item) => item.path === path);
  if (!component) {
    report(
      new Error(
        `src/components/${path} is missing. Choose the project folder again.`,
      ),
    );
    return;
  }
  loadComponent(component, value, groupClass);
});

function loadComponent(component, option, groupClass) {
  current = {
    component,
    option,
    source: component.source,
    elements: findStyleableElements(component.source),
  };
  pending = new Map();
  renderGroups(groupClass);
  const usedOn = pages.filter(({ page }) =>
    page.items.some(({ path }) => path === component.path),
  );
  const notes = [
    `Editing src/components/${component.path}.`,
    usedOn.length
      ? `Used on ${usedOn.length} page${usedOn.length === 1 ? "" : "s"}: ${usedOn.map(({ fileName }) => fileName).join(", ")}.`
      : "Not used on a Page Builder page yet.",
  ];
  if (libraryFolders.some((folder) => component.path.startsWith(folder)))
    notes.push(
      "This is a library original: make a copy in the Page Builder if only one page should change.",
    );
  note.textContent = notes.join(" ");
  note.hidden = false;
  renderElements();
  status.textContent = `Loaded ${component.path} with ${current.elements.length} elements.`;
}

// The theme classes an element has now: unsaved choices, else the file's.
function classesFor(element) {
  return pending.has(element.index)
    ? pending.get(element.index)
    : themeClassesOf(element.classValue).classes.join(" ");
}

function presetSelect(element, value) {
  const select = document.createElement("select");
  select.className =
    "w-full rounded border border-canvas-page-border bg-canvas-page p-2 text-ink-page";
  select.setAttribute(
    "aria-label",
    `Style for <${element.tag}> on line ${element.line}`,
  );
  const { preset } = themeClassesOf(value);
  select.append(new Option("No theme colors", "none"));
  const custom = new Option("Custom classes", "");
  custom.disabled = true;
  select.append(custom);
  // The element's own kind first, then the rest.
  const order = [
    element.kind,
    ...elementKinds.map(({ key }) => key).filter((key) => key !== element.kind),
  ];
  for (const kind of order) {
    const presets = stylePresets.filter(({ group }) => group === kind);
    if (!presets.length) continue;
    const optgroup = document.createElement("optgroup");
    optgroup.label = kindLabel.get(kind);
    for (const { key, label } of presets)
      optgroup.append(new Option(label, key));
    select.append(optgroup);
  }
  select.value = preset;
  return select;
}

// A small sample of the element with its classes, in the chosen theme group.
function previewFor(element, classes) {
  const wrapper = document.createElement("div");
  wrapper.className = `${groupSelect.value} bg-canvas-01 text-ink-01 grid min-h-14 place-items-center rounded p-2`;
  const sample = document.createElement(
    element.kind === "fields"
      ? "input"
      : element.kind === "actions"
        ? "button"
        : "div",
  );
  const base = {
    actions:
      "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium",
    headings: "text-lg font-bold",
    text: "text-sm",
    surfaces: "w-full rounded-lg border p-3 text-sm",
    fields: "w-full rounded-lg border px-3 py-2 text-sm",
  }[element.kind];
  sample.className = `${base} ${classes}`;
  const label = element.text || `<${element.tag}>`;
  if (sample instanceof HTMLInputElement) {
    sample.placeholder = label;
    sample.tabIndex = -1;
  } else {
    sample.textContent = label.length > 32 ? `${label.slice(0, 31)}…` : label;
    if (sample instanceof HTMLButtonElement) sample.type = "button";
  }
  wrapper.append(sample);
  return wrapper;
}

function elementRow(element) {
  const value = classesFor(element);
  const row = document.createElement("div");
  row.className =
    "grid items-center gap-3 rounded border border-canvas-page-border p-3 md:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1.4fr)]";
  if (pending.has(element.index)) row.dataset.changed = "true";

  const about = document.createElement("div");
  about.className = "grid min-w-0 gap-1";
  const title = document.createElement("strong");
  title.textContent = `<${element.tag}> · line ${element.line}${pending.has(element.index) ? " · changed" : ""}`;
  const text = document.createElement("span");
  text.className = "truncate text-sm";
  text.textContent = element.text || "(no text)";
  text.title = element.text;
  about.append(title, text);

  const preview = previewFor(element, value);

  const controls = document.createElement("div");
  controls.className = "grid gap-2";
  if (!element.editable) {
    const reason = document.createElement("p");
    reason.className = "text-sm";
    reason.textContent =
      "Its class is set with an expression, so edit this element in the file.";
    controls.append(reason);
  } else {
    const select = presetSelect(element, value);
    const input = document.createElement("input");
    input.type = "text";
    input.className =
      "w-full rounded border border-canvas-page-border bg-canvas-page p-2 font-mono text-xs text-ink-page";
    input.value = value;
    input.placeholder = "Theme classes, e.g. bg-cta-01 text-cta-01-text";
    input.spellcheck = false;
    input.setAttribute(
      "aria-label",
      `Theme classes for <${element.tag}> on line ${element.line}`,
    );
    const update = (classes) => {
      const saved = themeClassesOf(element.classValue).classes.join(" ");
      if (classes === saved) pending.delete(element.index);
      else pending.set(element.index, classes);
      row.replaceWith(elementRow(element));
      renderPending();
    };
    select.addEventListener("change", () => {
      const preset = stylePresets.find(({ key }) => key === select.value);
      update(preset ? preset.classes : "");
    });
    input.addEventListener("change", () => {
      try {
        update(parseClassList(input.value).join(" "));
      } catch (error) {
        input.setAttribute("aria-invalid", "true");
        report(error);
      }
    });
    controls.append(select, input);
  }
  row.append(about, preview, controls);
  return row;
}

function renderElements() {
  if (!current) {
    list.replaceChildren();
    count.textContent = "";
    note.hidden = true;
    renderPending();
    return;
  }
  const kind = kindSelect.value;
  const shown = current.elements.filter(
    (element) =>
      (!kind || element.kind === kind) &&
      (!styledOnly.checked || classesFor(element)),
  );
  list.replaceChildren(...shown.map(elementRow));
  count.textContent = `${shown.length} of ${current.elements.length} elements`;
  renderPending();
}

function renderPending() {
  const changes = pending.size;
  pendingLabel.textContent = changes
    ? `${changes} unsaved change${changes === 1 ? "" : "s"}.`
    : "No unsaved changes.";
  saveButton.disabled = busy || !changes;
  discardButton.disabled = busy || !changes;
}

kindSelect.addEventListener("change", renderElements);
styledOnly.addEventListener("change", renderElements);
groupSelect.addEventListener("change", renderElements);

discardButton.addEventListener("click", () => {
  if (!current || !confirmDiscard()) return;
  pending = new Map();
  renderElements();
  status.textContent = "Changes discarded.";
});

saveButton.addEventListener("click", async () => {
  if (busy || !current || !pending.size) return;
  setBusy(true);
  try {
    const { component } = current;
    const latest = await (await component.handle.getFile()).text();
    if (latest !== current.source)
      throw new Error(
        `${component.path} changed on disk since it was loaded. Choose it again to load the latest version; your unsaved changes here are kept until then.`,
      );
    const next = applyThemeClasses(current.source, Object.fromEntries(pending));
    const writable = await component.handle.createWritable();
    try {
      await writable.write(next);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => {});
      throw error;
    }
    const saved = pending.size;
    component.source = next;
    current.source = next;
    current.elements = findStyleableElements(next);
    pending = new Map();
    renderElements();
    status.textContent = `Saved ${saved} change${saved === 1 ? "" : "s"} to src/components/${component.path}.`;
    // The dev server usually reloads the preview itself; make sure it does.
    if (!get("#styling-preview").hidden)
      setTimeout(() => frame.contentWindow?.location.reload(), 600);
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});

window.addEventListener("beforeunload", (event) => {
  if (pending.size) event.preventDefault();
});
