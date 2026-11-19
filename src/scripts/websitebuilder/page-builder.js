import {
  componentSavePath,
  generatePage,
  inspectComponent,
  pageRoute,
  pageSlug,
  readComponents,
  saveComponentCopy,
  saveNewPage,
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
const path = get("#page-path");
const available = get("#available-components");
const add = get("#add-component");
const savePath = get("#component-save-path");
const save = get("#save-component");
const list = get("#selected-components");
const empty = get("#selected-components-empty");
const createdLink = get("#created-page-link");
let pageDirectory;
let componentsRoot;
let components = [];
let selected = [];
let busy = false;

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
    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2";
    actions.append(
      actionButton("Move up", "up", index, index === 0),
      actionButton("Move down", "down", index, index === selected.length - 1),
      actionButton("Remove", "remove", index),
    );
    row.append(actions);
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
    form.reset();
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
add.addEventListener("click", () => {
  const component = components[Number(available.value)];
  if (!component || component.error) {
    status.textContent = "Choose a supported component.";
    return;
  }
  selected.push({ component, values: Object.create(null) });
  renderSelection();
  status.textContent = `Added ${component.path}.`;
});

save.addEventListener("click", async () => {
  if (busy || !componentsRoot) return;
  const component = components[Number(available.value)];
  if (!component || component.error) {
    status.textContent = "Choose a supported component to save a copy of.";
    return;
  }
  setBusy(true);
  try {
    const path = componentSavePath(savePath.value);
    if (components.some((existing) => existing.path === path))
      throw new Error(
        `src/components/${path} already exists. Choose a different name.`,
      );
    const handle = await saveComponentCopy(
      componentsRoot,
      path,
      component.source,
    );
    const copy = inspectComponent(path, component.source);
    if (!copy || copy.error)
      throw new Error(
        `Saved src/components/${path}, but it cannot be selected: ${copy?.error ?? "the file name is reserved."}`,
      );
    components.push({ ...copy, handle, source: component.source });
    components.sort((a, b) => a.path.localeCompare(b.path));
    renderComponents();
    available.value = String(
      components.findIndex((entry) => entry.path === path),
    );
    savePath.value = "";
    status.textContent = `Saved src/components/${path} and selected it in the component list.`;
  } catch (error) {
    report(error);
  } finally {
    setBusy(false);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !pageDirectory) return;
  setBusy(true);
  createdLink.hidden = true;
  try {
    const slug = pageSlug(name.value);
    const assignments = selected.map(({ component, values }) => {
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
      return { component, values: typed };
    });
    const content = generatePage(name.value, description.value, assignments);
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
