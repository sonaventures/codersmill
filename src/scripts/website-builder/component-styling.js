import groupsCssFallback from "../../styles/themes/groups.css?raw";
import { parseGroupClasses } from "../../data/website-builder/group-classes";
import {
  applyThemeClasses,
  elementKinds,
  findStyleableElements,
  markerOf,
  parseClassList,
  stylePresets,
  themeClassesOf,
} from "../../data/website-builder/component-styling.js";
import {
  pageRoute,
  parseGeneratedPage,
  readComponents,
} from "../../data/website-builder/page-builder.js";
import { readTextFile, themesDirectory } from "./project-themes";

const root = document.querySelector("[data-component-styling]");
const get = (selector) => {
  const element = root.querySelector(selector);
  if (!element)
    throw new Error(`Missing component styling control: ${selector}`);
  return element;
};
const intro = get("#styling-intro");
const introStatus = get("#styling-intro-status");
const openButton = get("#open-styling-project");
const changeProjectButton = get("#styling-change-project");
const projectName = get("#styling-project-name");
const projectLabel = get("#styling-project-label");
const status = get("#styling-status");
const stage = get("#styling-stage");
const frame = get("#styling-frame");
const noPreview = get("#styling-no-preview");
const palette = get("#styling-palette");
const paletteHandle = get("#styling-palette-handle");
const collapseButton = get("#styling-palette-collapse");
const paletteContent = get("#styling-palette-content");
const tabs = [...root.querySelectorAll("[data-tab]")];
const pageSelect = get("#styling-page");
const pageLink = get("#styling-page-link");
const componentSelect = get("#styling-component");
const groupSelect = get("#styling-group");
const modeSelect = get("#styling-mode");
const note = get("#styling-component-note");
const kindSelect = get("#styling-kind");
const styledOnly = get("#styling-styled-only");
const count = get("#styling-count");
const list = get("#styling-elements");
const elementPanel = get("#styling-element");
const elementEmpty = get("#styling-element-empty");
const saveButton = get("#styling-save");
const discardButton = get("#styling-discard");
const pendingLabel = get("#styling-pending");

// Components the view route can show on their own (no props or slots).
const previewIds = new Set(JSON.parse(root.dataset.previews || "[]"));
const viewPath = (path) =>
  `/website-builder/component-styling/view/${path.replace(/\.astro$/, "")}/`;

let components = []; // { path, handle, source }
let pages = []; // { fileName, slug, page } for pages made by the Page Builder
let groupClasses = parseGroupClasses(groupsCssFallback);
let current = null; // { component, option, source, elements }
let pending = new Map(); // element index -> theme classes
let selected = null; // the selected element's index
let rendered = new Map(); // element index -> its elements in the preview
let busy = false;

const kindLabel = new Map(elementKinds.map(({ key, label }) => [key, label]));
// Library originals: everything in src/components/blocks.
const libraryFolders = ["blocks/"];

function setStatus(text) {
  status.textContent = text;
  introStatus.textContent = text;
}

function report(error) {
  console.error("Component styling:", error);
  setStatus(error instanceof Error ? error.message : String(error));
}

function setBusy(value) {
  busy = value;
  for (const control of [
    openButton,
    changeProjectButton,
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

// --- Palette: tabs, collapsing, and dragging -------------------------------

function showTab(name) {
  for (const tab of tabs) {
    const active = tab.dataset.tab === name;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    get(`#${tab.getAttribute("aria-controls")}`).hidden = !active;
  }
}
for (const tab of tabs)
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
showTab("setup");

collapseButton.addEventListener("click", () => {
  const collapsed = !paletteContent.hidden;
  paletteContent.hidden = collapsed;
  collapseButton.setAttribute("aria-expanded", String(!collapsed));
  collapseButton.textContent = collapsed ? "+" : "–";
  collapseButton.setAttribute(
    "aria-label",
    collapsed ? "Expand the palette" : "Collapse the palette",
  );
});

// Drag the palette by its title bar, so it can sit wherever the component
// leaves room. The preview ignores the pointer meanwhile.
paletteHandle.addEventListener("pointerdown", (event) => {
  if (event.target.closest("a, button")) return;
  const box = palette.getBoundingClientRect();
  const offsetX = event.clientX - box.left;
  const offsetY = event.clientY - box.top;
  paletteHandle.setPointerCapture(event.pointerId);
  stage.classList.add("is-dragging");
  const move = (moveEvent) => {
    const left = Math.min(
      Math.max(0, moveEvent.clientX - offsetX),
      window.innerWidth - box.width,
    );
    const top = Math.min(
      Math.max(0, moveEvent.clientY - offsetY),
      window.innerHeight - 40,
    );
    Object.assign(palette.style, {
      left: `${left}px`,
      top: `${top}px`,
      right: "auto",
      bottom: "auto",
    });
  };
  const end = () => {
    stage.classList.remove("is-dragging");
    paletteHandle.removeEventListener("pointermove", move);
    paletteHandle.removeEventListener("pointerup", end);
    paletteHandle.removeEventListener("pointercancel", end);
  };
  paletteHandle.addEventListener("pointermove", move);
  paletteHandle.addEventListener("pointerup", end);
  paletteHandle.addEventListener("pointercancel", end);
});

// Full screen while a component is open; the intro otherwise.
function renderLayout() {
  const open = Boolean(current);
  intro.hidden = open;
  stage.hidden = !open;
  document.documentElement.style.overflow = open ? "hidden" : "";
}

// --- Project, page, and component ----------------------------------------

async function chooseProject() {
  if (busy) return;
  if (!("showDirectoryPicker" in window)) {
    setStatus(
      "Folder access is not available in this browser. Use Chrome or Edge on localhost or HTTPS.",
    );
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
    projectLabel.textContent = project.name;
    closeComponent();
    renderPages();
    renderGroups();
    renderComponentOptions();
    palette.hidden = false;
    showTab("setup");
    setStatus(
      pages.length
        ? "Project opened. Choose a page, then one of its components."
        : "Project opened. No Page Builder pages yet; choose any component.",
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      setStatus("Project selection cancelled.");
    else report(error);
  } finally {
    setBusy(false);
  }
}
openButton.addEventListener("click", chooseProject);
changeProjectButton.addEventListener("click", chooseProject);

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
  renderPageLink();
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

function renderPageLink() {
  const page = selectedPage();
  const route = page ? pageRoute(page.slug) : "";
  pageLink.hidden = !route;
  pageLink.href = route || "#";
}

let shownPage = "";
pageSelect.addEventListener("change", () => {
  if (current && !confirmDiscard()) {
    // Keep the page that the open component came from.
    pageSelect.value = shownPage;
    return;
  }
  shownPage = pageSelect.value;
  closeComponent();
  renderComponentOptions();
  renderPageLink();
});

componentSelect.addEventListener("change", () => {
  if (current && !confirmDiscard()) {
    componentSelect.value = current.option;
    return;
  }
  const value = componentSelect.value;
  if (!value) {
    closeComponent();
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

function closeComponent() {
  current = null;
  pending = new Map();
  selected = null;
  rendered = new Map();
  frame.removeAttribute("src");
  note.hidden = true;
  renderLayout();
  renderElements();
  renderSelected();
}

function loadComponent(component, option, groupClass) {
  current = {
    component,
    option,
    source: component.source,
    elements: findStyleableElements(component.source),
  };
  pending = new Map();
  selected = null;
  rendered = new Map();
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
  const id = component.path.replace(/\.astro$/, "");
  const canPreview = previewIds.has(id);
  noPreview.hidden = canPreview;
  frame.hidden = !canPreview;
  if (canPreview) frame.src = viewPath(component.path);
  else frame.removeAttribute("src");
  renderLayout();
  renderElements();
  renderSelected();
  showTab(canPreview ? "element" : "elements");
  setStatus(
    `Loaded ${component.path} with ${current.elements.length} elements.${canPreview ? " Click one to style it." : ""}`,
  );
}

// --- The preview ---------------------------------------------------------

const classNamesOf = (value) =>
  (value ?? "")
    .split(/\s+/)
    .filter((name) => name && !name.startsWith("astro-"))
    .join(" ");

// The component's source with the unsaved choices applied.
function currentElements() {
  if (!pending.size) return current.elements;
  return findStyleableElements(
    applyThemeClasses(current.source, Object.fromEntries(pending)),
  );
}

/**
 * Match the preview's elements to the source's, in order, by tag and class.
 * Elements a loop repeats take the source element of the first copy, so a
 * change shows on every copy.
 */
function mapPreview() {
  rendered = new Map();
  const doc = frame.contentDocument;
  const section = doc?.querySelector("[data-styling-section]");
  if (!current || !section) return;
  const nodes = [...section.querySelectorAll("*")];
  const signature = (tag, classes) => `${tag} ${classes}`;
  const owner = new Map(); // node -> element index
  let cursor = 0;
  for (const element of current.elements) {
    if (!element.editable) continue;
    const wanted = signature(element.tag, classNamesOf(element.classValue));
    for (let at = cursor; at < nodes.length; at++) {
      const node = nodes[at];
      if (
        signature(node.localName, classNamesOf(node.getAttribute("class"))) !==
        wanted
      )
        continue;
      owner.set(node, element.index);
      cursor = at + 1;
      break;
    }
  }
  // Copies from a loop: the closest earlier match with the same signature.
  const lastBySignature = new Map();
  for (const node of nodes) {
    const key = signature(
      node.localName,
      classNamesOf(node.getAttribute("class")),
    );
    if (owner.has(node)) lastBySignature.set(key, owner.get(node));
    else if (lastBySignature.has(key))
      owner.set(node, lastBySignature.get(key));
  }
  for (const [node, index] of owner) {
    node.dataset.stylingIndex = String(index);
    rendered.set(index, [...(rendered.get(index) ?? []), node]);
  }
}

function applyPreviewClasses() {
  if (!current) return;
  const elements = currentElements();
  for (const [index, nodes] of rendered) {
    const element = elements.find((item) => item.index === index);
    if (!element) continue;
    for (const node of nodes) {
      const scoped = (node.getAttribute("class") ?? "")
        .split(/\s+/)
        .filter((name) => name.startsWith("astro-"));
      node.setAttribute(
        "class",
        [classNamesOf(element.classValue), ...scoped].filter(Boolean).join(" "),
      );
    }
  }
}

function applyPreviewGroup() {
  const doc = frame.contentDocument;
  if (!doc || !current) return;
  const page = doc.querySelector("[data-styling-page]");
  const section = doc.querySelector("[data-styling-section]");
  const className = groupSelect.value;
  const group = groupClasses.find((item) => item.className === className);
  const slot = section?.dataset.stylingSlot;
  if (page) page.className = group ? `sg-${group.group}-page` : "";
  if (section) section.className = className || (slot ? `sw-${slot}` : "");
  const mode = modeSelect.value;
  if (mode) {
    doc.documentElement.dataset.theme = mode;
    doc.documentElement.style.colorScheme = mode;
  }
}

function markSelected() {
  const doc = frame.contentDocument;
  if (!doc) return;
  for (const node of doc.querySelectorAll("[data-styling-selected]"))
    delete node.dataset.stylingSelected;
  for (const node of rendered.get(selected) ?? [])
    node.dataset.stylingSelected = "";
}

const previewCss = `
  [data-styling-index] { cursor: pointer; }
  [data-styling-hover] { outline: 2px dashed #3b82f6 !important; outline-offset: 2px; }
  [data-styling-selected] { outline: 3px solid #f97316 !important; outline-offset: 2px; }
  body { padding-bottom: 50vh; }
`;

frame.addEventListener("load", () => {
  const doc = frame.contentDocument;
  if (!doc || !current) return;
  const style = doc.createElement("style");
  style.textContent = previewCss;
  doc.head.append(style);
  mapPreview();
  applyPreviewClasses();
  applyPreviewGroup();
  markSelected();
  renderElements();
  const target = (event) =>
    event.target instanceof doc.defaultView.Element
      ? event.target.closest("[data-styling-index]")
      : null;
  doc.addEventListener("mouseover", (event) => {
    for (const node of doc.querySelectorAll("[data-styling-hover]"))
      delete node.dataset.stylingHover;
    const node = target(event);
    if (node) node.dataset.stylingHover = "";
  });
  doc.addEventListener("mouseleave", () => {
    for (const node of doc.querySelectorAll("[data-styling-hover]"))
      delete node.dataset.stylingHover;
  });
  // Clicks choose elements instead of following links or sending forms.
  doc.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const node = target(event);
      if (node) select(Number(node.dataset.stylingIndex), false);
    },
    true,
  );
  doc.addEventListener("submit", (event) => event.preventDefault(), true);
});

function select(index, scroll = true) {
  selected = index;
  markSelected();
  renderSelected();
  renderElements();
  showTab("element");
  if (scroll)
    rendered
      .get(index)?.[0]
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
}

// --- Element editing -----------------------------------------------------

// The theme classes an element has now: unsaved choices, else the file's.
function classesFor(element) {
  return pending.has(element.index)
    ? pending.get(element.index)
    : themeClassesOf(element.classValue).classes.join(" ");
}

function presetSelect(element, value) {
  const select = document.createElement("select");
  select.className = "styling-input";
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

function markerHint(element) {
  const marker = markerOf(element.classValue);
  if (!marker) return "";
  const suggested = stylePresets.find(({ key }) => key === marker.preset);
  return `Marked ${marker.label} (.${marker.className})${
    suggested ? `; suggested style: ${suggested.label}` : ""
  }`;
}

function renderSelected() {
  const element = current?.elements.find((item) => item.index === selected);
  elementEmpty.hidden = Boolean(element);
  elementEmpty.textContent = current
    ? "Click an element in the component, or pick one in the Elements tab."
    : "Open a component in the Setup tab.";
  if (!element) {
    elementPanel.replaceChildren();
    return;
  }
  const value = classesFor(element);
  const wrapper = document.createElement("div");
  wrapper.className = "grid gap-2";

  const title = document.createElement("strong");
  title.textContent = `<${element.tag}> · ${kindLabel.get(element.kind)} · line ${element.line}${pending.has(element.index) ? " · changed" : ""}`;
  const text = document.createElement("span");
  text.className = "text-sm";
  text.textContent = element.text || "(no text)";
  wrapper.append(title, text);
  const hint = markerHint(element);
  if (hint) {
    const marker = document.createElement("span");
    marker.className = "text-sm";
    marker.dataset.marker = markerOf(element.classValue).className;
    marker.textContent = hint;
    wrapper.append(marker);
  }
  if (!rendered.has(element.index)) {
    const missing = document.createElement("span");
    missing.className = "text-sm";
    missing.textContent = "Not found in the preview (it may be hidden).";
    wrapper.append(missing);
  }

  if (!element.editable) {
    const reason = document.createElement("p");
    reason.className = "text-sm";
    reason.textContent =
      "Its class is set with an expression, so edit this element in the file.";
    wrapper.append(reason);
    elementPanel.replaceChildren(wrapper);
    return;
  }

  const select = presetSelect(element, value);
  const input = document.createElement("textarea");
  input.rows = 3;
  input.className = "styling-input font-mono text-xs";
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
    applyPreviewClasses();
    renderSelected();
    renderElements();
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
  const styleLabel = document.createElement("label");
  styleLabel.className = "grid gap-1 text-sm font-semibold";
  styleLabel.append("Style", select);
  const classLabel = document.createElement("label");
  classLabel.className = "grid gap-1 text-sm font-semibold";
  classLabel.append("Theme classes", input);
  wrapper.append(styleLabel, classLabel);
  elementPanel.replaceChildren(wrapper);
}

function renderElements() {
  if (!current) {
    list.replaceChildren();
    count.textContent = "";
    renderPending();
    return;
  }
  const kind = kindSelect.value;
  const shown = current.elements.filter(
    (element) =>
      (!kind || element.kind === kind) &&
      (!styledOnly.checked ||
        classesFor(element) ||
        markerOf(element.classValue)),
  );
  list.replaceChildren(
    ...shown.map((element) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      if (element.index === selected)
        button.setAttribute("aria-current", "true");
      if (pending.has(element.index)) button.dataset.changed = "true";
      const title = document.createElement("strong");
      title.textContent = `<${element.tag}> · line ${element.line}`;
      const text = document.createElement("span");
      text.className = "truncate";
      text.textContent = element.text || "(no text)";
      button.append(title, text);
      const details = [
        markerHint(element),
        classesFor(element) && "Has theme classes",
        !rendered.has(element.index) && "Not in the preview",
      ].filter(Boolean);
      if (details.length) {
        const extra = document.createElement("span");
        extra.className = "muted text-xs";
        extra.textContent = details.join(" · ");
        button.append(extra);
      }
      button.addEventListener("click", () => select(element.index));
      item.append(button);
      return item;
    }),
  );
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
groupSelect.addEventListener("change", applyPreviewGroup);
modeSelect.addEventListener("change", () => {
  if (modeSelect.value) applyPreviewGroup();
  // "Builder setting": reload so the preview reads the saved mode again.
  else if (current && frame.getAttribute("src"))
    frame.contentWindow?.location.reload();
});

discardButton.addEventListener("click", () => {
  if (!current || !confirmDiscard()) return;
  pending = new Map();
  applyPreviewClasses();
  renderSelected();
  renderElements();
  setStatus("Changes discarded.");
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
    renderSelected();
    renderElements();
    setStatus(
      `Saved ${saved} change${saved === 1 ? "" : "s"} to src/components/${component.path}.`,
    );
    // The dev server usually reloads the preview itself; make sure it does.
    if (frame.getAttribute("src"))
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
