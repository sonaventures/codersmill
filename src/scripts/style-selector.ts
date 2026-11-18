import {
  cardCanvasRoles,
  colorRoles,
  createDefaultColors,
  defaultColorReference,
  defaultRadii,
  getColor,
  globalColorRoles,
  isGlobalColorRole,
  isColorRoleVisible,
  paletteColors,
  paletteFamilies,
  paletteShades,
  parseStyleGroups,
  radiusPresets,
  radiusTargets,
  regions,
  regionColorRoles,
  roleGroups,
  semanticToken,
  setPaletteFamilies,
  setColor,
  serializeStyleGroups,
  styleGroupsStorageKey,
  type Region,
  type StyleGroup,
  type Theme,
  type ColorRole,
} from "../data/style-groups";
import css from "../styles/themes/colors.css?raw";
import { readPalette } from "../data/palette.js";

setPaletteFamilies(readPalette(css));
const root = document.querySelector<HTMLElement>("[data-selector]");
if (root) {
  const studioChrome = document.querySelectorAll<HTMLElement>(
    "[data-studio-chrome]",
  );
  const studioHeader = document.querySelector<HTMLElement>(
    "[data-studio-header]",
  );
  if (studioHeader) {
    const updateHeaderOffset = () => {
      const offset = Math.max(0, studioHeader.getBoundingClientRect().bottom);
      root.style.setProperty("--selector-header-offset", `${offset}px`);
    };
    updateHeaderOffset();
    new ResizeObserver(updateHeaderOffset).observe(studioHeader);
    window.addEventListener("scroll", updateHeaderOffset, { passive: true });
  }
  const get = <T extends HTMLElement>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing selector control: ${selector}`);
    return element;
  };
  const form = get<HTMLFormElement>("#style-group-form");
  const area = get<HTMLSelectElement>("#editing-region");
  const preview = get<HTMLElement>(".preview-column");
  const saved = get<HTMLSelectElement>("#saved-group");
  const name = get<HTMLInputElement>("#group-name");
  const status = get<HTMLParagraphElement>("#selector-status");
  const saveButton = get<HTMLButtonElement>("#save-group");
  const deleteButton = get<HTMLButtonElement>("#delete-group");
  const exportButton = get<HTMLButtonElement>("#export-groups");
  const importButton = get<HTMLButtonElement>("#import-groups");
  const fileInput = get<HTMLInputElement>("#import-file");
  const paletteFamily = get<HTMLSelectElement>("#palette-family");
  const paletteTarget = get<HTMLSelectElement>("#palette-target");
  const radiusTarget = get<HTMLSelectElement>("#radius-target");
  const radiusSwatches = root.querySelectorAll<HTMLButtonElement>(
    "[data-radius-preset]",
  );
  const currentTheme = (): Theme =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  let themes: StyleGroup["themes"] = {
    light: createDefaultColors(),
    dark: createDefaultColors(),
  };
  let colors = themes[currentTheme()];
  let radii = { ...defaultRadii };
  let groups: StyleGroup[] = [];
  let selectedId = "";
  let dirty = false;
  let storageReady = true;
  const message = (text: string) => {
    status.textContent = text;
  };
  const reportError = (text: string, error: unknown) => {
    console.error(text, error);
    message(
      `${text} ${error instanceof Error ? error.message : "Please try again."}`,
    );
  };
  const editingArea = () => area.value as Region;
  const markDirty = () => {
    dirty = true;
    message("Unsaved changes. Save a style group to keep these styles.");
  };
  const confirmDiscard = () =>
    !dirty || window.confirm("Discard unsaved style changes?");

  const paletteTabs = [
    get<HTMLButtonElement>("#palette-color-tab"),
    get<HTMLButtonElement>("#palette-global-tab"),
  ];
  const palettePanels = [
    get<HTMLElement>("#palette-color-panel"),
    get<HTMLElement>("#palette-global-panel"),
  ];
  function activatePaletteTab(index: number) {
    paletteTabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    palettePanels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  }
  paletteTabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activatePaletteTab(i));
    tab.addEventListener("keydown", (event) => {
      let next: number;
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowRight":
          next = 1 - i;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      activatePaletteTab(next);
      paletteTabs[next]?.focus();
    });
  });

  function selectedRadiusTarget() {
    const target = radiusTargets.find(({ key }) => key === radiusTarget.value);
    if (!target) throw new Error("Unknown corner radius target.");
    return target.key;
  }

  function renderRadiusSwatches() {
    const selected = radii[selectedRadiusTarget()];
    for (const swatch of radiusSwatches) {
      swatch.setAttribute(
        "aria-pressed",
        String(swatch.dataset.radiusPreset === selected),
      );
    }
  }

  function renderRadii() {
    for (const { key } of radiusTargets) {
      const preset = radiusPresets.find((preset) => preset.key === radii[key]);
      if (!preset) throw new Error(`Unknown corner radius preset for ${key}.`);
      preview.style.setProperty(`--sample-${key}-radius`, preset.size);
    }
    renderRadiusSwatches();
  }

  radiusTarget.addEventListener("change", renderRadiusSwatches);
  for (const swatch of radiusSwatches) {
    swatch.addEventListener("click", () => {
      const preset = radiusPresets.find(
        ({ key }) => key === swatch.dataset.radiusPreset,
      );
      if (!preset) throw new Error("Unknown corner radius preset.");
      const target = selectedRadiusTarget();
      if (radii[target] === preset.key) return;
      radii[target] = preset.key;
      renderRadii();
      markDirty();
    });
  }

  function renderColors() {
    const region = editingArea();
    const selectedArea = regions.find(({ key }) => key === region);
    if (!selectedArea) throw new Error(`Unknown editing area: ${region}`);
    get<HTMLElement>("#color-controls-title").textContent =
      `Color controls / ${selectedArea.label}`;
    if (!isColorRoleVisible(region, paletteTarget.value as ColorRole)) {
      paletteTarget.value = "background";
    }
    for (const group of roleGroups) {
      const visible = colorRoles.some(
        ({ key, group: roleGroup }) =>
          roleGroup === group.key && isColorRoleVisible(region, key),
      );
      const fieldset = get<HTMLFieldSetElement>(
        `[data-control-group="${group.key}"]`,
      );
      fieldset.hidden = !visible;
      fieldset.disabled = !visible;
      get<HTMLElement>(
        `[data-control-group="${group.key}"] legend`,
      ).textContent =
        group.key === "brand" || group.key === "cta"
          ? group.label
          : `${group.label} / ${selectedArea.label}`;
      const targetGroup = get<HTMLOptGroupElement>(
        `[data-target-group="${group.key}"]`,
      );
      targetGroup.hidden = !visible;
      targetGroup.disabled = !visible;
    }
    const page = get<HTMLElement>('[data-region="page"]');
    const pageCanvases = [page, ...studioChrome];
    for (const element of pageCanvases) {
      for (const { key, token } of globalColorRoles) {
        const color = colors.global[key];
        if (color === "theme" || (element !== page && color === "transparent"))
          element.style.removeProperty(`--${token}`);
        else element.style.setProperty(`--${token}`, color);
      }
    }
    for (const { key: region } of regions) {
      const elements =
        region === "page"
          ? pageCanvases
          : [get<HTMLElement>(`[data-region="${region}"]`)];
      for (const element of elements) {
        for (const { key: role } of regionColorRoles) {
          const selected = colors[region][role];
          const color =
            region === "page" && element !== page && selected === "transparent"
              ? "theme"
              : selected;
          const token = semanticToken(region, role);
          if (token) {
            if (color === "theme") element.style.removeProperty(`--${token}`);
            else element.style.setProperty(`--${token}`, color);
          }
          element.style.setProperty(
            `--sample-${role}`,
            color === "theme" || token
              ? defaultColorReference(region, role)
              : color,
          );
        }
      }
    }
    const element = get<HTMLElement>(`[data-region="${editingArea()}"]`);
    const computed = getComputedStyle(element);
    for (const { key } of colorRoles) {
      const visible = isColorRoleVisible(region, key);
      get<HTMLElement>(`[data-color-field="${key}"]`).hidden = !visible;
      const color = getColor(colors, editingArea(), key);
      const custom = color.startsWith("#");
      const control = get<HTMLSelectElement>(`[data-role-value="${key}"]`);
      control.value = custom ? "custom" : color;
      control.disabled = !visible;
      const targetOption = get<HTMLOptionElement>(
        `#palette-target option[value="${key}"]`,
      );
      targetOption.hidden = !visible;
      targetOption.disabled = !visible;
      const hex = get<HTMLInputElement>(`[data-custom-role="${key}"]`);
      hex.value = custom ? color : "";
      hex.hidden = !custom;
      hex.disabled = !custom || !visible;
      hex.removeAttribute("aria-invalid");
      hex.setCustomValidity("");
      const token = semanticToken(editingArea(), key);
      get<HTMLElement>(`[data-role-token="${key}"]`).textContent =
        token ?? "Preview-only override";
      const swatch = get<HTMLElement>(`[data-role-swatch="${key}"]`);
      swatch.dataset.transparent = String(color === "transparent");
      swatch.style.backgroundColor =
        color === "transparent"
          ? ""
          : isGlobalColorRole(key)
            ? getComputedStyle(page).getPropertyValue(`--${token}`).trim()
            : computed.getPropertyValue(`--sample-${key}`).trim();
    }
    get<HTMLElement>("#theme-context").textContent =
      `Editing ${currentTheme()} theme. Use the site theme switch to edit the other theme.`;
    syncPaletteFamily();
  }

  function focusedPaletteColor(): string {
    const role = paletteTarget.value as ColorRole;
    const color = getColor(colors, editingArea(), role);
    if (color !== "theme") return color;

    const global = isGlobalColorRole(role);
    const element = get<HTMLElement>(
      `[data-region="${global ? "page" : editingArea()}"]`,
    );
    const token = global
      ? semanticToken(editingArea(), role)
      : `sample-${role}`;
    const resolved = getComputedStyle(element)
      .getPropertyValue(`--${token}`)
      .trim();
    const primitives = getComputedStyle(document.documentElement);
    const primitive = paletteColors.find(
      (key) =>
        primitives.getPropertyValue(`--color-${key}`).trim() === resolved,
    );
    return primitive ? `var(--color-${primitive})` : "theme";
  }

  function syncPaletteFamily() {
    const color = focusedPaletteColor();
    const family = paletteFamilies.find(({ key }) =>
      paletteShades.some((shade) => color === `var(--color-${key}-${shade})`),
    );
    paletteFamily.value =
      family?.key ??
      (color === "transparent"
        ? "none"
        : color === "var(--color-white)" || color === "var(--color-black)"
          ? "solid"
          : color.startsWith("#")
            ? "custom"
            : "theme");
    renderPalette();
  }

  function focusColorRole(role: ColorRole) {
    paletteTarget.value = role;
    if (isGlobalColorRole(role) && editingArea() !== "page") {
      area.value = "page";
      renderColors();
    } else {
      syncPaletteFamily();
    }
  }

  function previewTargetRole(target: HTMLElement): ColorRole {
    if (target.closest(".sample-subsection")) return "subsectionBorder";

    const card = target.closest<HTMLElement>(".sample-card");
    if (card) {
      const role = cardCanvasRoles.find(
        ({ card: number, part }) =>
          number === card.dataset.sampleCard && part === "border",
      );
      if (!role)
        throw new Error("Unable to identify the selected sample card.");
      return role.key;
    }

    if (target.closest(".sample-social-icons a")) return "iconBorder";
    if (target.closest(".sample-buttons button, .sample-action-link"))
      return "accentBorder";
    if (target.closest(".sample-section")) return "border";
    return "background";
  }

  function previewRegion(target: HTMLElement): Region {
    const regionName =
      target.closest<HTMLElement>("[data-region]")?.dataset.region;
    const region = regions.find(({ key }) => key === regionName);
    if (!region)
      throw new Error("Unable to identify the preview's style area.");
    return region.key;
  }

  const previewTargets = preview.querySelectorAll<HTMLElement>(
    "[data-region], .sample-card, .sample-subsection, .sample-buttons button, .sample-action-link, .sample-social-icons a",
  );
  for (const target of previewTargets) {
    const region = previewRegion(target);
    const role = previewTargetRole(target);
    const regionLabel = regions.find(({ key }) => key === region)?.label;
    const roleLabel = colorRoles.find(({ key }) => key === role)?.label;
    if (!regionLabel || !roleLabel)
      throw new Error("Unable to label the preview control.");
    target.dataset.controlTarget = "true";
    target.title = `Click to edit ${regionLabel} / ${roleLabel}`;
    target.setAttribute(
      "aria-description",
      "Press Enter or Space to open these color controls.",
    );
    if (!target.matches("button, a")) target.tabIndex = 0;
  }

  let selectedPreviewTarget: HTMLElement | null = null;
  const activatePreviewTarget = (target: HTMLElement) => {
    const region = previewRegion(target);
    const role = previewTargetRole(target);
    if (!isColorRoleVisible(region, role)) {
      throw new Error(`The ${role} control is unavailable for ${region}.`);
    }
    if (editingArea() !== region) {
      area.value = region;
      area.dispatchEvent(new Event("change", { bubbles: true }));
    }
    focusColorRole(role);

    selectedPreviewTarget?.removeAttribute("data-control-selected");
    target.dataset.controlSelected = "true";
    selectedPreviewTarget = target;
    get<HTMLElement>(`[data-color-field="${role}"]`).scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  };

  preview.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>("[data-control-target]");
    if (!target) return;
    if (event.target.closest("a")) event.preventDefault();
    activatePreviewTarget(target);
  });
  preview.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!(event.target instanceof HTMLElement)) return;
    const target = event.target.closest<HTMLElement>("[data-control-target]");
    if (!target || target.matches("button, a")) return;
    event.preventDefault();
    activatePreviewTarget(target);
  });

  function renderPalette() {
    const family = paletteFamilies.find(
      ({ key }) => key === paletteFamily.value,
    );
    if (
      !family &&
      !["solid", "none", "custom", "theme"].includes(paletteFamily.value)
    ) {
      throw new Error("Unknown palette family.");
    }
    const selected = focusedPaletteColor();
    for (const { key } of colorRoles) {
      get<HTMLElement>(`[data-color-field="${key}"]`).dataset.active = String(
        key === paletteTarget.value,
      );
    }
    for (const shade of paletteShades) {
      const button = get<HTMLButtonElement>(`[data-palette-shade="${shade}"]`);
      button.hidden = !family;
      if (!family) {
        button.setAttribute("aria-pressed", "false");
        continue;
      }
      const token = `${family.key}-${shade}`;
      const value = `var(--color-${token})`;
      button.dataset.paletteValue = value;
      button.style.backgroundColor = value;
      button.title = token;
      button.setAttribute("aria-label", token);
      button.setAttribute("aria-pressed", String(selected === value));
    }
    for (const color of ["white", "black", "none"]) {
      get<HTMLButtonElement>(`[data-palette-solid="${color}"]`).setAttribute(
        "aria-pressed",
        String(
          selected ===
            (color === "none" ? "transparent" : `var(--color-${color})`),
        ),
      );
    }
  }

  function renderGroups() {
    saved.replaceChildren(new Option("Unsaved palette", ""));
    for (const group of groups) saved.add(new Option(group.name, group.id));
    saved.value = selectedId;
    saveButton.textContent = selectedId ? "Update group" : "Save group";
    saveButton.disabled = !storageReady;
    deleteButton.disabled = !selectedId || !storageReady;
    importButton.disabled = !storageReady;
    exportButton.disabled = !groups.length;
  }

  function persist(next: StyleGroup[]) {
    if (!storageReady) {
      message(
        "Saving is disabled because saved style groups could not be read.",
      );
      return false;
    }
    try {
      localStorage.setItem(styleGroupsStorageKey, serializeStyleGroups(next));
    } catch (error) {
      reportError(
        "Unable to save style groups. Your changes are still in the preview.",
        error,
      );
      return false;
    }
    groups = next;
    return true;
  }

  try {
    const stored = localStorage.getItem(styleGroupsStorageKey);
    if (stored !== null) groups = parseStyleGroups(stored);
  } catch (error) {
    storageReady = false;
    reportError(
      "Unable to read saved style groups. Saving/importing is disabled to protect existing data.",
      error,
    );
  }
  renderColors();
  renderRadii();
  renderGroups();

  area.addEventListener("change", () => {
    renderColors();

    // Reserve only the trailing space needed to top-align even the sample footer.
    root.style.setProperty("--selector-scroll-space", "0px");
    const sample = get<HTMLElement>(`[data-region="${editingArea()}"]`);
    const top = sample.getBoundingClientRect().top + window.scrollY;
    const extraSpace = Math.max(
      0,
      Math.ceil(
        top + window.innerHeight - document.documentElement.scrollHeight,
      ),
    );
    root.style.setProperty("--selector-scroll-space", `${extraSpace}px`);
    sample.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "instant",
    });
  });
  paletteFamily.addEventListener("change", renderPalette);
  paletteTarget.addEventListener("change", () =>
    focusColorRole(paletteTarget.value as ColorRole),
  );
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-palette-value]",
  )) {
    button.addEventListener("click", () => {
      const value = button.dataset.paletteValue;
      if (!value) throw new Error("Missing palette value.");
      setColor(colors, editingArea(), paletteTarget.value as ColorRole, value);
      renderColors();
      markDirty();
    });
  }
  for (const { key } of colorRoles) {
    const field = get<HTMLElement>(`[data-color-field="${key}"]`);
    const select = get<HTMLSelectElement>(`[data-role-value="${key}"]`);
    const hex = get<HTMLInputElement>(`[data-custom-role="${key}"]`);
    const syncFocus = () => {
      focusColorRole(key);
      if (document.activeElement === hex) {
        paletteFamily.value = "custom";
        renderPalette();
      }
    };
    select.addEventListener("focus", syncFocus);
    hex.addEventListener("focus", syncFocus);
    field.addEventListener("click", (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("select, input")
      )
        return;
      (hex.hidden || hex.disabled ? select : hex).focus();
      syncFocus();
    });
    select.addEventListener("change", () => {
      const value = select.value;
      focusColorRole(key);
      if (value === "custom") {
        hex.hidden = false;
        hex.disabled = false;
        hex.focus();
        message("Enter a six-digit hex color for this override.");
        return;
      }
      setColor(colors, editingArea(), key, value);
      renderColors();
      markDirty();
    });
    hex.addEventListener("input", () => {
      const valid = /^#[0-9a-f]{6}$/i.test(hex.value);
      hex.setAttribute("aria-invalid", String(!valid));
      hex.setCustomValidity(
        valid ? "" : "Enter a six-digit hex color, such as #317da6.",
      );
      if (!valid) {
        message("Enter a six-digit hex color, such as #317da6.");
        return;
      }
      setColor(colors, editingArea(), key, hex.value.toLowerCase());
      renderColors();
      markDirty();
    });
  }
  get<HTMLButtonElement>("#apply-all").addEventListener("click", () => {
    if (
      !window.confirm(
        "Replace all six section palettes with this area's colors?",
      )
    )
      return;
    const palette = { ...colors[editingArea()] };
    for (const { key } of regions) {
      if (key.startsWith("section")) colors[key] = { ...palette };
    }
    renderColors();
    markDirty();
  });
  saved.addEventListener("change", () => {
    if (!confirmDiscard()) {
      saved.value = selectedId;
      return;
    }
    selectedId = saved.value;
    const group = groups.find(({ id }) => id === selectedId);
    themes = group
      ? structuredClone(group.themes)
      : {
          light: createDefaultColors(),
          dark: createDefaultColors(),
        };
    colors = themes[currentTheme()];
    radii = { ...(group?.radii ?? defaultRadii) };
    name.value = group?.name ?? "";
    dirty = false;
    renderColors();
    renderRadii();
    renderGroups();
    message(group ? `Loaded "${group.name}".` : "Started a fresh palette.");
  });
  name.addEventListener("input", markDirty);
  get<HTMLButtonElement>("#new-group").addEventListener("click", () => {
    selectedId = "";
    name.value = "";
    renderGroups();
    markDirty();
    name.focus();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const groupName = name.value.trim();
    if (!groupName) {
      message("Enter a name for your style group.");
      name.focus();
      return;
    }
    if (
      groups.some(
        (group) =>
          group.id !== selectedId &&
          group.name.toLowerCase() === groupName.toLowerCase(),
      )
    ) {
      message(
        "That name is already in use. Choose another name or load that group to update it.",
      );
      return;
    }
    if (!selectedId && groups.length >= 100) {
      message(
        "You can save up to 100 groups. Export a backup and delete a group first.",
      );
      return;
    }
    const group: StyleGroup = {
      id: selectedId || crypto.randomUUID(),
      name: groupName,
      themes: structuredClone(themes),
      radii: { ...radii },
    };
    const next = selectedId
      ? groups.map((item) => (item.id === selectedId ? group : item))
      : [...groups, group];
    if (!persist(next)) return;
    selectedId = group.id;
    dirty = false;
    name.value = groupName;
    renderGroups();
    message(`Saved "${groupName}" in this browser.`);
  });
  deleteButton.addEventListener("click", () => {
    const group = groups.find(({ id }) => id === selectedId);
    if (
      !group ||
      !window.confirm(
        `Delete "${group.name}"? This cannot be undone. The current preview will be kept.`,
      )
    )
      return;
    if (!persist(groups.filter(({ id }) => id !== selectedId))) return;
    selectedId = "";
    name.value = "";
    dirty = true;
    renderGroups();
    message(
      "Group deleted. The preview is still available to save as a new group.",
    );
  });
  exportButton.addEventListener("click", () => {
    const blob = new Blob([serializeStyleGroups(groups)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exclusive-group-style-groups.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message(
      `Exported ${groups.length} saved style group(s), including colors and global corner radii. Unsaved preview changes are not included.`,
    );
  });
  importButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_000_000)
        throw new Error("Choose a JSON file smaller than 1 MB.");
      const imported = parseStyleGroups(await file.text());
      if (!imported.length)
        throw new Error("This file contains no style groups.");
      if (groups.length + imported.length > 100)
        throw new Error("Import would exceed the 100-group limit.");
      const names = new Set(groups.map((group) => group.name.toLowerCase()));
      const copies = imported.map((group) => {
        let nextName = group.name;
        let suffix = 2;
        while (names.has(nextName.toLowerCase())) {
          nextName = `${group.name.slice(0, 65)} (${suffix++})`;
        }
        names.add(nextName.toLowerCase());
        return { ...group, id: crypto.randomUUID(), name: nextName };
      });
      if (!persist([...groups, ...copies])) return;
      renderGroups();
      message(
        `Imported ${copies.length} group(s). Existing groups and the current preview were kept. Select a saved group to load it.`,
      );
    } catch (error) {
      reportError("Unable to import style groups.", error);
    } finally {
      fileInput.value = "";
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty) event.preventDefault();
  });
  new MutationObserver(() => {
    colors = themes[currentTheme()];
    renderColors();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const sampleNavigation = get<HTMLElement>(".sample-navigation");
  const closeSampleMenus = () => {
    for (const menu of sampleNavigation.querySelectorAll<HTMLDetailsElement>(
      "details[open]",
    )) {
      menu.open = false;
    }
  };
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openMenu =
      sampleNavigation.querySelector<HTMLDetailsElement>("details[open]");
    if (!openMenu) return;
    const focusInside = sampleNavigation.contains(document.activeElement);
    closeSampleMenus();
    if (focusInside) {
      event.preventDefault();
      openMenu.querySelector<HTMLElement>("summary")?.focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (
      event.target instanceof Node &&
      !sampleNavigation.contains(event.target)
    )
      closeSampleMenus();
  });
  document.addEventListener("focusin", (event) => {
    if (
      event.target instanceof Node &&
      !sampleNavigation.contains(event.target)
    )
      closeSampleMenus();
  });
  sampleNavigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a"))
      closeSampleMenus();
  });
}
