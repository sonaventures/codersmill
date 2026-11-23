import {
  cardCanvasRoles,
  colorRoles,
  createDefaultColors,
  defaultColorReference,
  defaultContentWidth,
  defaultRadii,
  getColor,
  globalColorRoles,
  isGlobalColorRole,
  isColorRoleVisible,
  isSitewideColorRole,
  paletteColors,
  paletteFamilies,
  paletteShades,
  parseThemeGroups,
  radiusPresets,
  radiusTargets,
  regions,
  regionColorRoles,
  roleGroups,
  semanticToken,
  setPaletteFamilies,
  setColor,
  serializeThemeGroups,
  sitewideColorFallbacks,
  sitewideColorRoles,
  mergeThemeGroups,
  themeGroupsStorageKey,
  type GroupTypography,
  type SectionIdRegion,
  cardTargets,
  cardTypographyKey,
  type Region,
  type GroupWidths,
  type ThemeGroup,
  type Theme,
  type ColorRole,
} from "../../data/website-builder/theme-groups";
import {
  typographyElements,
  typographyLabel,
  typographySelector,
  validateTypographyValue,
} from "../../data/website-builder/typography-builder.js";
import css from "../../styles/themes/colors.css?raw";
import { readPalette } from "../../data/website-builder/palette.js";
import {
  applyTailwindPaletteOnly,
  usesTailwindPaletteOnly,
} from "./palette-preference";
import {
  fetchProjectThemeGroups,
  getThemesFolder,
  removeGroupFromProject,
  readTextFile,
  saveGroupToProject,
  writeTextFile,
} from "./project-themes";
import {
  createDefaultSitewideAreas,
  createDefaultSitewideThemes,
  isSitewideArea,
  parseSitewideAreas,
  parseSitewideCss,
  parseSitewideLayout,
  sitewideAreas,
  sitewideAreasCss,
  sitewideCss,
  sitewideCssFile,
  sitewideLayoutCss,
  writeSitewideSection,
  type SitewideAreaStyles,
  type SitewideThemes,
} from "../../data/website-builder/sitewide";
import { classGroupAreas, groupClassSlug } from "../../data/website-builder/group-classes";

setPaletteFamilies(readPalette(css));
const root = document.querySelector<HTMLElement>("[data-selector]");
if (root) {
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
  const form = get<HTMLFormElement>("#theme-group-form");
  const area = get<HTMLSelectElement>("#editing-region");
  const preview = get<HTMLElement>(".preview-column");
  const controlPanel = get<HTMLElement>(".selector-panel");
  const saved = get<HTMLSelectElement>("#saved-group");
  const name = get<HTMLInputElement>("#group-name");
  const status = get<HTMLParagraphElement>("#selector-status");
  const saveButton = get<HTMLButtonElement>("#save-group");
  const deleteButton = get<HTMLButtonElement>("#delete-group");
  const exportButton = get<HTMLButtonElement>("#export-groups");
  const publishButton = get<HTMLButtonElement>("#publish-group-classes");
  let themesFolder: FileSystemDirectoryHandle | undefined;
  const importButton = get<HTMLButtonElement>("#import-groups");
  const fileInput = get<HTMLInputElement>("#import-file");
  const paletteFamily = get<HTMLSelectElement>("#palette-family");
  const tailwindOnly = usesTailwindPaletteOnly();
  if (tailwindOnly) {
    applyTailwindPaletteOnly(paletteFamily);
    const availableFamilies = new Set(
      Array.from(paletteFamily.options, (option) => option.value),
    );
    for (const group of root.querySelectorAll<HTMLOptGroupElement>(
      "optgroup[data-palette-family]",
    )) {
      if (!availableFamilies.has(group.dataset.paletteFamily ?? ""))
        group.remove();
    }
  }
  const selectableFamilies = paletteFamilies.filter(({ key }) =>
    Array.from(paletteFamily.options).some((option) => option.value === key),
  );
  const paletteTarget = get<HTMLSelectElement>("#palette-target");
  const radiusTarget = get<HTMLSelectElement>("#radius-target");
  const radiusSwatches = root.querySelectorAll<HTMLButtonElement>(
    "[data-radius-preset]",
  );
  const currentTheme = (): Theme =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  let themes: ThemeGroup["themes"] = {
    light: createDefaultColors(),
    dark: createDefaultColors(),
  };
  let colors = themes[currentTheme()];
  // Sitewide colors (the Global area) are saved to sitewide.css, not with a
  // theme group. While this page previews them, sitewide.css is turned off
  // so "Theme default" shows the theme's color, not the saved one.
  let sitewide: SitewideThemes = createDefaultSitewideThemes();
  // The header and footer are sitewide too: colors and typography.
  let sitewideStyles: SitewideAreaStyles = createDefaultSitewideAreas();
  let sitewideDirty = false;
  let sitewideReady = false;
  document.documentElement.dataset.sitewidePreview = "";
  let radii = { ...defaultRadii };
  // Content widths (--container-site, used by max-w-site): the sitewide
  // width is saved to sitewide.css, area widths with the theme group, and the
  // header and footer's in sitewideStyles. "" means not set.
  let siteWidth = "";
  let widths: GroupWidths = {};
  let groups: ThemeGroup[] = [];
  let selectedId = "";
  let dirty = false;
  let storageReady = true;
  // The Typography tab repeats the status, since the panel's is out of
  // sight while the tab is open.
  const typographyStatus = root.querySelector<HTMLElement>(
    "#theme-typography-status",
  );
  const message = (text: string) => {
    status.textContent = text;
    if (typographyStatus) typographyStatus.textContent = text;
  };
  const reportError = (text: string, error: unknown) => {
    console.error(text, error);
    message(
      `${text} ${error instanceof Error ? error.message : "Please try again."}`,
    );
  };
  // Each area's bar shows the class it becomes in groups.css, from the name.
  const renderClassNames = () => {
    let slug = "";
    try {
      slug = name.value.trim() ? groupClassSlug(name.value) : "";
    } catch {
      slug = "";
    }
    for (const code of root.querySelectorAll<HTMLElement>("[data-group-class]"))
      code.textContent = slug
        ? `.sg-${slug}-${code.dataset.groupClass}`
        : "Name the group to see it";
  };
  // The Global area edits sitewide colors; every other area is a theme
  // group area.
  type EditingArea = Region | "global";
  const isGlobalArea = () => area.value === "global";
  // The theme group area being edited; the page while editing Global.
  const editingArea = (): Region =>
    isGlobalArea() ? "page" : (area.value as Region);
  const areaLabel = (key: EditingArea) =>
    key === "global"
      ? "Global"
      : (regions.find((region) => region.key === key)?.label ?? key);
  const roleVisibleIn = (key: EditingArea, role: ColorRole) =>
    key === "global"
      ? isSitewideColorRole(role)
      : isColorRoleVisible(key, role);
  const roleVisible = (role: ColorRole) =>
    roleVisibleIn(area.value as EditingArea, role);
  // An area's colors: the header and footer's are sitewide.
  const areaColors = (region: Region) =>
    isSitewideArea(region)
      ? sitewideStyles.colors[currentTheme()][region]
      : colors[region];
  // Whether editing this role changes sitewide.css rather than the group.
  const isSitewideEdit = (role: ColorRole) =>
    isSitewideColorRole(role) ||
    (isSitewideArea(editingArea()) && !isGlobalColorRole(role));
  const readColor = (role: ColorRole) =>
    isSitewideColorRole(role)
      ? sitewide[currentTheme()][role]
      : isGlobalColorRole(role)
        ? getColor(colors, editingArea(), role)
        : areaColors(editingArea())[role];
  const writeColor = (role: ColorRole, value: string) => {
    if (isSitewideColorRole(role)) sitewide[currentTheme()][role] = value;
    else if (isGlobalColorRole(role))
      setColor(colors, editingArea(), role, value);
    else areaColors(editingArea())[role] = value;
  };
  // Set by the Typography tab, which shows whether its changes are saved.
  let onGroupChange = () => {};
  const markDirty = () => {
    dirty = true;
    onGroupChange();
    message("Unsaved changes. Save a theme group to keep these styles.");
  };
  let onSitewideChange = () => {};
  const markSitewideDirty = () => {
    sitewideDirty = true;
    onSitewideChange();
    message(
      "Unsaved sitewide changes (content width, CTA colors, header, or footer). Select Save to sitewide.css to keep them; they are not saved with a theme group.",
    );
  };
  const markChanged = (role: ColorRole) =>
    isSitewideEdit(role) ? markSitewideDirty() : markDirty();
  const confirmDiscard = () =>
    !dirty || window.confirm("Discard unsaved style changes?");

  const paletteTabs = [
    get<HTMLButtonElement>("#palette-color-tab"),
    get<HTMLButtonElement>("#palette-global-tab"),
    get<HTMLButtonElement>("#palette-typography-tab"),
  ];
  const palettePanels = [
    get<HTMLElement>("#palette-color-panel"),
    get<HTMLElement>("#palette-global-panel"),
    get<HTMLElement>("#palette-typography-panel"),
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
          next = (i - 1 + paletteTabs.length) % paletteTabs.length;
          break;
        case "ArrowRight":
          next = (i + 1) % paletteTabs.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = paletteTabs.length - 1;
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

  const widthArea = get<HTMLSelectElement>("#content-width-area");
  const widthValue = get<HTMLSelectElement>("#content-width-value");
  const widthDefault = widthValue.options[0];
  const widthFor = (area: string) =>
    area === "site"
      ? siteWidth
      : isSitewideArea(area)
        ? (sitewideStyles.widths[area] ?? "")
        : (widths[area as keyof GroupWidths] ?? "");

  function renderWidths() {
    const area = widthArea.value;
    widthDefault.textContent =
      area === "site"
        ? `Default / ${defaultContentWidth}`
        : `Sitewide width / ${siteWidth || defaultContentWidth}`;
    widthValue.value = widthFor(area);
    // Preview the widths: the whole preview takes the sitewide width, and
    // each area its own, the same way the classes nest on the site.
    if (siteWidth) preview.style.setProperty("--container-site", siteWidth);
    else preview.style.removeProperty("--container-site");
    for (const element of preview.querySelectorAll<HTMLElement>(
      "[data-region]",
    )) {
      const region = element.dataset.region ?? "";
      const width = region === "global" ? "" : widthFor(region);
      if (width) element.style.setProperty("--container-site", width);
      else element.style.removeProperty("--container-site");
    }
  }

  widthArea.addEventListener("change", renderWidths);
  widthValue.addEventListener("change", () => {
    const area = widthArea.value;
    const value = widthValue.value;
    if (widthFor(area) === value) return;
    if (area === "site") siteWidth = value;
    else if (isSitewideArea(area)) {
      if (value) sitewideStyles.widths[area] = value;
      else delete sitewideStyles.widths[area];
    } else {
      const key = area as keyof GroupWidths;
      if (value) widths[key] = value;
      else delete widths[key];
    }
    renderWidths();
    if (area === "site" || isSitewideArea(area)) markSitewideDirty();
    else markDirty();
  });

  // Page-wide and sitewide colors left on "Theme default" may have no
  // variable of their own (CTA text, border, hover); show the color
  // components fall back to.
  function globalSwatchColor(key: ColorRole, token: string | null): string {
    const page = get<HTMLElement>(
      `[data-region="${isSitewideColorRole(key) ? "global" : "page"}"]`,
    );
    const value = token
      ? getComputedStyle(page).getPropertyValue(`--${token}`).trim()
      : "";
    const fallback =
      sitewideColorFallbacks[key as keyof typeof sitewideColorFallbacks];
    if (value || !fallback) return value;
    const probe = document.createElement("span");
    probe.style.color = fallback;
    page.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }

  function renderColors() {
    const editing = area.value as EditingArea;
    const selectedLabel = areaLabel(editing);
    if (!roleVisible(paletteTarget.value as ColorRole)) {
      paletteTarget.value = isGlobalArea() ? "ctaPrimary" : "background";
    }
    // Copying to all sections is for theme group areas only.
    get<HTMLElement>("#group-area-actions").hidden = isGlobalArea();
    get<HTMLElement>("#sitewide-actions").hidden =
      !isGlobalArea() && !isSitewideArea(editingArea());
    for (const group of roleGroups) {
      const visible = colorRoles.some(
        ({ key, group: roleGroup }) =>
          roleGroup === group.key && roleVisible(key),
      );
      const fieldset = get<HTMLFieldSetElement>(
        `[data-control-group="${group.key}"]`,
      );
      fieldset.hidden = !visible;
      fieldset.disabled = !visible;
      get<HTMLElement>(
        `[data-control-group="${group.key}"] legend`,
      ).textContent =
        group.key === "brand" || group.key === "cta" || group.key === "contrast"
          ? group.label
          : `${group.label} / ${selectedLabel}`;
      const targetGroup = get<HTMLOptGroupElement>(
        `[data-target-group="${group.key}"]`,
      );
      targetGroup.hidden = !visible;
      targetGroup.disabled = !visible;
    }
    // Only the page preview takes the page's colors: the builder's own panels
    // keep their --builder-* colors whatever the theme picks.
    const page = get<HTMLElement>('[data-region="page"]');
    for (const { key, token } of globalColorRoles) {
      const color = colors.global[key];
      if (color === "theme") page.style.removeProperty(`--${token}`);
      else page.style.setProperty(`--${token}`, color);
    }
    const globalArea = get<HTMLElement>('[data-region="global"]');
    for (const { key, token } of sitewideColorRoles) {
      const color = sitewide[currentTheme()][key];
      if (color === "theme") globalArea.style.removeProperty(`--${token}`);
      else globalArea.style.setProperty(`--${token}`, color);
    }
    for (const { key: region } of regions) {
      const element = get<HTMLElement>(`[data-region="${region}"]`);
      for (const { key: role } of regionColorRoles) {
        const color = areaColors(region)[role];
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
    const element = get<HTMLElement>(`[data-region="${editingArea()}"]`);
    const computed = getComputedStyle(element);
    for (const { key } of colorRoles) {
      const visible = roleVisible(key);
      get<HTMLElement>(`[data-color-field="${key}"]`).hidden = !visible;
      const color = readColor(key);
      const custom = color.startsWith("#");
      const control = get<HTMLSelectElement>(`[data-role-value="${key}"]`);
      const optionValue = custom ? "custom" : color;
      if (tailwindOnly) {
        control.querySelector("[data-current-palette-color]")?.remove();
        if (
          !Array.from(control.options).some(
            (option) => option.value === optionValue,
          )
        ) {
          const current = new Option(
            `Current: ${color.slice(12, -1)}`,
            optionValue,
          );
          current.disabled = true;
          current.dataset.currentPaletteColor = "";
          control.add(current, 0);
        }
      }
      control.value = optionValue;
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
      let swatchColor =
        color === "transparent"
          ? ""
          : isGlobalColorRole(key) || isSitewideColorRole(key)
            ? globalSwatchColor(key, token)
            : computed.getPropertyValue(`--sample-${key}`).trim();
      // Text formatting defaults to "currentColor": show the area's text.
      if (/^currentcolor$/i.test(swatchColor))
        swatchColor = computed.getPropertyValue("--sample-text").trim();
      swatch.dataset.transparent = String(
        color === "transparent" || swatchColor === "transparent",
      );
      swatch.style.backgroundColor =
        swatchColor === "transparent" ? "" : swatchColor;
    }
    get<HTMLElement>("#theme-context").textContent =
      `Editing ${currentTheme()} theme. Use the site theme switch to edit the other theme.`;
    syncPaletteFamily();
  }

  function focusedPaletteColor(): string {
    const role = paletteTarget.value as ColorRole;
    const color = readColor(role);
    if (color !== "theme") return color;

    const sitewideRole = isSitewideColorRole(role);
    const global = isGlobalColorRole(role) || sitewideRole;
    const element = get<HTMLElement>(
      `[data-region="${sitewideRole ? "global" : global ? "page" : editingArea()}"]`,
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
    const family = selectableFamilies.find(({ key }) =>
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
    if (isSitewideColorRole(role) && !isGlobalArea()) {
      area.value = "global";
      renderColors();
    } else if (isGlobalColorRole(role) && area.value !== "page") {
      area.value = "page";
      renderColors();
    } else {
      syncPaletteFamily();
    }
  }

  function previewTargetRole(target: HTMLElement): ColorRole {
    // A heading level label edits the heading after it.
    if (
      target.matches(".sample-heading-level") &&
      target.nextElementSibling instanceof HTMLElement
    ) {
      target = target.nextElementSibling;
    }
    const sampleRole = colorRoles.find(
      ({ key }) => key === target.dataset.sampleRole,
    );
    if (sampleRole) return sampleRole.key;
    if (target.matches(".sample-logo .text-brand-01")) return "brandFirst";
    if (target.matches(".sample-logo .text-brand-02")) return "brandSecond";
    if (target.matches('[data-cta="primary"]')) return "ctaPrimary";
    if (target.matches('[data-cta="secondary"]')) return "ctaSecondary";
    if (target.matches('[data-cta="tertiary"]')) return "ctaTertiary";
    if (target.matches(".sample-primary")) return "accent1";
    if (target.matches(".sample-secondary")) return "accent2";
    if (target.matches(".sample-action-link")) return "accent3";
    if (target.matches(".sample-social-icons a")) return "iconBorder";
    // The menu headers are Accent 1; their arrows (Nav SVG) have their own
    // sample role.
    if (target.matches(".sample-navigation summary")) return "accent1";
    if (target.matches(".sample-submenu a")) return "text";
    if (target.matches("a")) return "linkColor";
    if (target.matches("h1")) return "h1";
    if (target.matches("h2")) return "h2";
    if (target.matches("h3")) return "h3";
    if (target.matches("h4")) return "h4";
    if (target.matches("p, .sample-code")) return "text";
    if (target.matches(".sample-subsection")) return "subsectionBorder";

    if (target.matches(".sample-card")) {
      const role = cardCanvasRoles.find(
        ({ card: number, part }) =>
          number === target.dataset.sampleCard && part === "border",
      );
      if (!role)
        throw new Error("Unable to identify the selected sample card.");
      return role.key;
    }

    if (target.matches(".sample-buttons button")) return "accent1Border";
    if (target.matches(".sample-section")) return "border";
    return "background";
  }

  function previewRegion(target: HTMLElement, role: ColorRole): EditingArea {
    if (isSitewideColorRole(role)) return "global";
    if (isGlobalColorRole(role)) return "page";
    const regionName =
      target.closest<HTMLElement>("[data-region]")?.dataset.region;
    const region = regions.find(({ key }) => key === regionName);
    if (!region)
      throw new Error("Unable to identify the preview's style area.");
    return region.key;
  }

  const nativePreviewControls = "button, a, summary";
  // In the Global area only the CTA buttons have controls.
  const previewTargets = [
    ...preview.querySelectorAll<HTMLElement>(
      "[data-region], [data-sample-role], .sample-card, .sample-subsection, .sample-buttons button, .sample-logo .text-brand-01, .sample-logo .text-brand-02, .sample-navigation summary, a:not(.sample-logo), p, .sample-code, .sample-heading-level, h1, h2, h3, h4",
    ),
  ].filter(
    (target) =>
      !target.closest('[data-region="global"]') || target.matches("[data-cta]"),
  );
  for (const target of previewTargets) {
    const role = previewTargetRole(target);
    const region = previewRegion(target, role);
    const regionLabel = areaLabel(region);
    const roleLabel = colorRoles.find(({ key }) => key === role)?.label;
    if (!regionLabel || !roleLabel)
      throw new Error("Unable to label the preview control.");
    target.dataset.controlTarget = "true";
    target.title = `Click to edit ${regionLabel} / ${roleLabel}`;
    target.setAttribute(
      "aria-description",
      "Press Enter or Space to open these color controls.",
    );
    if (!target.matches(nativePreviewControls)) target.tabIndex = 0;
  }

  let selectedPreviewTarget: HTMLElement | null = null;
  const activatePreviewTarget = (target: HTMLElement) => {
    const role = previewTargetRole(target);
    const region = previewRegion(target, role);
    if (!roleVisibleIn(region, role)) {
      throw new Error(`The ${role} control is unavailable for ${region}.`);
    }
    if (area.value !== region) {
      area.value = region;
      renderColors();
    }
    focusColorRole(role);
    selectTypographyTarget(target, region);

    selectedPreviewTarget?.removeAttribute("data-control-selected");
    target.dataset.controlSelected = "true";
    selectedPreviewTarget = target;
    const field = get<HTMLElement>(`[data-color-field="${role}"]`);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "instant"
      : "smooth";
    if (getComputedStyle(controlPanel).position === "fixed") {
      const fieldBounds = field.getBoundingClientRect();
      const panelTop =
        controlPanel.getBoundingClientRect().top + controlPanel.clientTop;
      controlPanel.scrollBy({
        top:
          fieldBounds.top +
          fieldBounds.height / 2 -
          (panelTop + controlPanel.clientHeight / 2),
        behavior,
      });
    } else {
      field.scrollIntoView({ block: "center", inline: "nearest", behavior });
    }
  };

  preview.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    // The sitewide save buttons in the preview's area bars are not colors.
    if (event.target.closest("[data-save-sitewide]")) return;
    const target = event.target.closest<HTMLElement>("[data-control-target]");
    if (!target) return;
    if (event.target.closest("a")) event.preventDefault();
    activatePreviewTarget(target);
  });
  preview.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    // Element, not HTMLElement, so the sample SVG's shapes work too.
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>("[data-control-target]");
    if (!target || target.matches(nativePreviewControls)) return;
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
    renderClassNames();
    // The collapsed Theme groups bar shows which group is loaded.
    get<HTMLElement>("[data-current-group]").textContent =
      groups.find(({ id }) => id === selectedId)?.name ?? "Unsaved palette";
    saved.replaceChildren(new Option("Unsaved palette", ""));
    for (const group of groups) saved.add(new Option(group.name, group.id));
    saved.value = selectedId;
    saveButton.textContent = selectedId ? "Update group" : "Save group";
    saveButton.disabled = !storageReady;
    deleteButton.disabled = !selectedId || !storageReady;
    importButton.disabled = !storageReady;
    exportButton.disabled = !groups.length;
    publishButton.disabled = !selectedId;
    onGroupChange();
  }

  function persist(next: ThemeGroup[], editedId = "") {
    if (!storageReady) {
      message(
        "Saving is disabled because saved theme groups could not be read.",
      );
      return false;
    }
    try {
      // Typography can also change in the Typography Builder. Keep the latest
      // saved typography for every group except the one saved from here.
      const stored = localStorage.getItem(themeGroupsStorageKey);
      const latest = stored ? parseThemeGroups(stored) : [];
      next = next.map((group) => ({
        ...group,
        typography:
          group.id === editedId
            ? group.typography
            : (latest.find(({ id }) => id === group.id)?.typography ??
              group.typography ??
              {}),
      }));
      localStorage.setItem(themeGroupsStorageKey, serializeThemeGroups(next));
    } catch (error) {
      reportError(
        "Unable to save theme groups. Your changes are still in the preview.",
        error,
      );
      return false;
    }
    groups = next;
    return true;
  }

  try {
    const stored = localStorage.getItem(themeGroupsStorageKey);
    if (stored !== null) groups = parseThemeGroups(stored);
  } catch (error) {
    storageReady = false;
    reportError(
      "Unable to read saved theme groups. Saving/importing is disabled to protect existing data.",
      error,
    );
  }
  renderColors();
  renderRadii();
  renderGroups();
  // Add groups saved to the project from other browsers.
  if (storageReady)
    void fetchProjectThemeGroups().then((project) => {
      const merged = mergeThemeGroups(groups, project);
      if (merged.length === groups.length) return;
      groups = merged;
      renderGroups();
    });

  // Typography tab: per-area typography saved with the theme group.
  let typography: GroupTypography = {};
  const typographyArea = get<HTMLSelectElement>("#theme-typography-area");
  const typographyElement = get<HTMLSelectElement>("#theme-typography-element");
  const typographyControls = [
    ...root.querySelectorAll<HTMLSelectElement>("[data-theme-typography]"),
  ];
  const typographyPreview = document.createElement("style");
  document.head.append(typographyPreview);
  const typographyRegion = () => typographyArea.value as keyof GroupTypography;
  // "Within": the whole area, or one of its cards or the subsection.
  const typographyCard = get<HTMLSelectElement>("#theme-typography-card");
  const typographyKey = (): keyof GroupTypography => {
    const region = typographyRegion();
    const card = cardTargets.find(({ key }) => key === typographyCard.value);
    return card && !isSitewideArea(region)
      ? cardTypographyKey(region as SectionIdRegion, card.key)
      : region;
  };
  // The sample card or subsection a card's preview rules apply to.
  const sampleCardSelector = (card: string) =>
    card === "subsection"
      ? ".sample-subsection"
      : `.sample-card[data-sample-card="${card.replace("card", "0")}"]`;
  const customInput = (key: string) =>
    root.querySelector<HTMLInputElement>(
      `[data-theme-typography-custom="${key}"]`,
    );

  // Typography rules for an area: the header and footer's are sitewide.
  type TypographyArea = keyof GroupTypography;
  const areaTypography = (region: TypographyArea) =>
    isSitewideArea(region)
      ? sitewideStyles.typography
      : (typography as Partial<Record<TypographyArea, Record<string, Record<string, string>>>>);
  const typographyAreas = [
    ...classGroupAreas.map(({ region }) => region),
    ...sitewideAreas.map(({ region }) => region),
  ] as TypographyArea[];
  const markTypographyChange = (region: TypographyArea) =>
    isSitewideArea(region) ? markSitewideDirty() : markDirty();

  function tidyTypography(source: GroupTypography): GroupTypography {
    const tidy: GroupTypography = {};
    for (const [region, rules] of Object.entries(source)) {
      // The header and footer are sitewide, not saved with a group.
      if (isSitewideArea(region)) continue;
      const kept = Object.fromEntries(
        Object.entries(rules ?? {}).filter(
          ([, styles]) => Object.keys(styles).length,
        ),
      );
      if (Object.keys(kept).length)
        tidy[region as keyof GroupTypography] = structuredClone(kept);
    }
    return tidy;
  }

  // Previews each area's typography. The page's rules cover the whole sample
  // page except the header, footer, and builder labels, because on the site
  // the page class wraps only what is between the header and footer. The
  // other areas' rules come later and are more specific, so they win, as in
  // groups.css.
  // The preview's accent buttons, for the Accent 1-3 typography elements.
  const sampleAccents: Record<string, string> = {
    accent1: ".sample-primary",
    accent2: ".sample-secondary",
    accent3: ".sample-action-link",
  };
  const previewSelector = (element: string) =>
    sampleAccents[element] ?? typographySelector(element);
  function renderTypographyPreview() {
    const rules: string[] = [];
    for (const region of typographyAreas) {
      const scope =
        region === "page"
          ? "#selector-sample-page"
          : `#selector-sample-page [data-region="${region}"]`;
      const excluded =
        region === "page"
          ? '[data-studio-chrome] *, [data-region="header"] *, [data-region="footer"] *'
          : "[data-studio-chrome] *";
      for (const element of typographyElements) {
        const styles = areaTypography(region)[region]?.[element] ?? {};
        const declarations = Object.entries(styles)
          .map(([key, value]) => `  ${key}: ${value};`)
          .join("\n");
        if (declarations)
          rules.push(
            `${scope} ${previewSelector(element)}:not(${excluded}) {\n${declarations}\n}`,
          );
      }
      // Card and subsection rules: more specific, so they win over the
      // area's. The page's sample cards are in its intro.
      if (isSitewideArea(region)) continue;
      const cardScope =
        region === "page" ? "#selector-sample-page .sample-page-intro" : scope;
      for (const card of cardTargets) {
        const cardRules =
          typography[cardTypographyKey(region as SectionIdRegion, card.key)];
        for (const element of typographyElements) {
          const declarations = Object.entries(cardRules?.[element] ?? {})
            .map(([key, value]) => `  ${key}: ${value};`)
            .join("\n");
          if (declarations)
            rules.push(
              `${cardScope} ${sampleCardSelector(card.key)} ${previewSelector(element)}:not([data-studio-chrome] *) {\n${declarations}\n}`,
            );
        }
      }
    }
    typographyPreview.textContent = rules.join("\n");
  }

  function renderTypography() {
    // The header and footer have no cards.
    typographyCard.disabled = isSitewideArea(typographyRegion());
    if (typographyCard.disabled) typographyCard.value = "";
    const styles =
      areaTypography(typographyRegion())[typographyKey()]?.[
        typographyElement.value
      ] ?? {};
    for (const control of typographyControls) {
      const key = control.dataset.themeTypography ?? "";
      const value = styles[key] ?? "";
      const custom = customInput(key);
      const listed = [...control.options].some(
        (option) => option.value === value,
      );
      control.value = !value || listed ? value : "custom";
      if (custom) {
        custom.hidden = control.value !== "custom";
        custom.value = control.value === "custom" ? value : "";
        custom.removeAttribute("aria-invalid");
      }
    }
    get<HTMLElement>("#theme-typography-context").textContent =
      `Typography for ${regions.find(({ key }) => key === typographyRegion())?.label ?? "this area"}${typographyCard.value ? ` / ${typographyCard.selectedOptions[0]?.text}` : ""} / ${typographyLabel(typographyElement.value)}, saved with the theme group. Blank fields follow ${typographyCard.value ? "the area's typography" : "the site-wide defaults from the Typography Builder"}.`;
    renderTypographyPreview();
  }

  function setTypographyValue(key: string, value: string) {
    const region = typographyRegion();
    const element = typographyElement.value;
    const areaRules = (areaTypography(region)[typographyKey()] ??= {});
    const styles = (areaRules[element] ??= {});
    if (value) styles[key] = value;
    else delete styles[key];
    renderTypographyPreview();
    markTypographyChange(region);
  }

  for (const control of typographyControls) {
    const key = control.dataset.themeTypography ?? "";
    const custom = customInput(key);
    control.addEventListener("change", () => {
      if (control.value === "custom") {
        if (custom) {
          custom.hidden = false;
          custom.focus();
        }
        return;
      }
      if (custom) custom.hidden = true;
      setTypographyValue(key, control.value);
    });
    custom?.addEventListener("input", () => {
      const value = custom.value.trim();
      try {
        validateTypographyValue(key, value);
        custom.removeAttribute("aria-invalid");
        setTypographyValue(key, value);
      } catch (error) {
        custom.setAttribute("aria-invalid", "true");
        message((error as Error).message);
      }
    });
  }
  typographyElement.addEventListener("change", renderTypography);
  typographyCard.addEventListener("change", renderTypography);
  // The Typography tab's area and the color controls' editing area match.
  typographyArea.addEventListener("change", () => {
    renderTypography();
    if (area.value !== typographyArea.value) {
      area.value = typographyArea.value;
      area.dispatchEvent(new Event("change"));
    }
  });
  // Saving from the Typography tab: an area's typography is saved with the
  // theme group (Update group), the header and footer's to sitewide.css.
  const typographySave = get<HTMLButtonElement>("#save-theme-typography");
  const typographyState = get<HTMLElement>("#theme-typography-state");
  const typographySaveHint = get<HTMLElement>("#theme-typography-save-hint");
  function renderTypographySave() {
    const region = typographyRegion();
    const label =
      regions.find(({ key }) => key === region)?.label ?? "this area";
    const sitewideArea = isSitewideArea(region);
    const unsaved = sitewideArea ? sitewideDirty : dirty;
    typographyState.textContent = unsaved ? "Unsaved changes" : "Saved";
    typographyState.dataset.state = unsaved ? "unsaved" : "saved";
    if (sitewideArea) {
      typographySave.textContent = "Save to sitewide.css";
      typographySave.disabled = !sitewideReady;
      typographySaveHint.textContent = `The ${label.toLowerCase()} is sitewide: its typography is saved to src/styles/themes/sitewide.css, with its colors and content width.`;
      return;
    }
    const group = groups.find(({ id }) => id === selectedId);
    typographySave.textContent = group
      ? `Update "${group.name}"`
      : "Save as a theme group";
    typographySave.disabled = !storageReady;
    typographySaveHint.textContent = group
      ? `Saves the ${label} typography with "${group.name}", along with the group's colors, to this browser and the project (groups.css and theme-groups.json).`
      : `${label} typography is saved with a theme group. Name the group in Theme groups, then save it here.`;
  }
  onGroupChange = renderTypographySave;

  // Clicking the preview also picks the area and element in this tab: the
  // area clicked in, and the element when the tab lists it (a heading's
  // level label picks the heading under it).
  function selectTypographyTarget(target: HTMLElement, region: EditingArea) {
    if (
      ![...typographyArea.options].some((option) => option.value === region)
    )
      return;
    typographyArea.value = region;
    const element =
      target.matches(".sample-heading-level") &&
      target.nextElementSibling instanceof HTMLElement
        ? target.nextElementSibling
        : target;
    // An accent button picks its accent, before its tag (Accent 3 is a link);
    // a form field picks Input label or Input text.
    const accent = Object.entries(sampleAccents).find(([, selector]) =>
      element.matches(selector),
    )?.[0];
    const tag =
      accent ??
      typographyElements.find(
        (name) =>
          !(name in sampleAccents) && element.matches(typographySelector(name)),
      );
    if (tag) typographyElement.value = tag;
    // Inside a sample card or the subsection, its own typography.
    const card = element.closest<HTMLElement>(".sample-card, .sample-subsection");
    typographyCard.value = !card
      ? ""
      : card.dataset.sampleCard === "subsection"
        ? "subsection"
        : `card${Number(card.dataset.sampleCard)}`;
    renderTypography();
    renderTypographySave();
  }
  typographyArea.addEventListener("change", renderTypographySave);
  typographySave.addEventListener("click", () => {
    if (isSitewideArea(typographyRegion())) {
      void saveSitewide();
      return;
    }
    if (!name.value.trim()) {
      const details = root.querySelector<HTMLDetailsElement>(
        ".saved-groups-details",
      );
      if (details) details.open = true;
      name.focus();
      message(
        "Name the theme group in Theme groups, then select Save as a theme group again.",
      );
      return;
    }
    form.requestSubmit();
  });
  renderTypographySave();

  get<HTMLButtonElement>("#reset-theme-typography-element").addEventListener(
    "click",
    () => {
      const region = typographyRegion();
      delete areaTypography(region)[typographyKey()]?.[typographyElement.value];
      renderTypography();
      markTypographyChange(region);
    },
  );
  renderTypography();

  area.addEventListener("change", () => {
    if (
      typographyAreas.some((region) => region === area.value) &&
      typographyArea.value !== area.value
    ) {
      typographyArea.value = area.value;
      renderTypography();
    }
    renderColors();

    // Reserve only the trailing space needed to top-align even the sample footer.
    root.style.setProperty("--selector-scroll-space", "0px");
    const sample = get<HTMLElement>(`[data-region="${area.value}"]`);
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
      const role = paletteTarget.value as ColorRole;
      writeColor(role, value);
      renderColors();
      markChanged(role);
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
      writeColor(key, value);
      renderColors();
      markChanged(key);
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
      writeColor(key, hex.value.toLowerCase());
      renderColors();
      markChanged(key);
    });
  }
  get<HTMLButtonElement>("#apply-all").addEventListener("click", () => {
    if (isGlobalArea()) return;
    if (
      !window.confirm(
        "Replace all six section palettes with this area's colors?",
      )
    )
      return;
    const palette = { ...areaColors(editingArea()) };
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
    widths = { ...(group?.widths ?? {}) };
    typography = structuredClone(group?.typography ?? {});
    renderTypography();
    name.value = group?.name ?? "";
    dirty = false;
    renderColors();
    renderRadii();
    renderWidths();
    renderGroups();
    message(group ? `Loaded "${group.name}".` : "Started a fresh palette.");
  });
  name.addEventListener("input", () => {
    renderClassNames();
    markDirty();
  });
  get<HTMLButtonElement>("#new-group").addEventListener("click", () => {
    selectedId = "";
    name.value = "";
    renderGroups();
    markDirty();
    name.focus();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const groupName = name.value.trim();
    if (!groupName) {
      message("Enter a name for your theme group.");
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
    // The header and footer are sitewide (sitewide.css), so a group keeps
    // only theme defaults for them.
    const groupThemes = structuredClone(themes);
    const defaults = createDefaultColors();
    for (const theme of ["light", "dark"] as const)
      for (const { region } of sitewideAreas)
        groupThemes[theme][region] = { ...defaults[region] };
    const group: ThemeGroup = {
      id: selectedId || crypto.randomUUID(),
      name: groupName,
      themes: groupThemes,
      radii: { ...radii },
      // Section IDs are set per page in the Page Builder now; keep any
      // saved with older groups as they were.
      sectionIds: structuredClone(
        groups.find(({ id }) => id === selectedId)?.sectionIds ?? {},
      ),
      typography: tidyTypography(typography),
      widths: { ...widths },
    };
    const next = selectedId
      ? groups.map((item) => (item.id === selectedId ? group : item))
      : [...groups, group];
    if (!persist(next, group.id)) return;
    selectedId = group.id;
    dirty = false;
    name.value = groupName;
    renderGroups();
    // Then update the group's classes in groups.css for the Page Builder.
    message(`Saved "${groupName}" in this browser. Updating groups.css...`);
    saveButton.disabled = true;
    publishButton.disabled = true;
    try {
      await writeGroupClasses(group);
      message(
        `Saved "${groupName}" to the project (groups.css and theme-groups.json in src/styles/themes) and in this browser.`,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        message(
          `Saved "${groupName}" in this browser. groups.css was not updated because no project folder was chosen; select Update group again to update it.`,
        );
      else
        reportError(
          `Saved "${groupName}" in this browser, but groups.css could not be updated.`,
          error,
        );
    } finally {
      renderGroups();
    }
  });
  deleteButton.addEventListener("click", async () => {
    const group = groups.find(({ id }) => id === selectedId);
    if (
      !group ||
      !window.confirm(
        `Delete "${group.name}"? This removes it from this browser and from the project's groups.css and theme-groups.json. The current preview will be kept.`,
      )
    )
      return;
    if (!persist(groups.filter(({ id }) => id !== selectedId))) return;
    selectedId = "";
    name.value = "";
    dirty = true;
    renderGroups();
    try {
      themesFolder ??= await getThemesFolder();
      await removeGroupFromProject(themesFolder, group);
      message(
        `Deleted "${group.name}" from this browser and the project. The preview is still available to save as a new group.`,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        message(
          `Deleted "${group.name}" from this browser. It is still in the project files because no folder was chosen.`,
        );
      else
        reportError(
          `Deleted "${group.name}" from this browser, but the project files could not be updated.`,
          error,
        );
    }
  });
  exportButton.addEventListener("click", () => {
    const blob = new Blob([serializeThemeGroups(groups)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "website-builder-theme-groups.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message(
      `Exported ${groups.length} saved theme group(s), including colors, global corner radii, and section IDs. Unsaved preview changes are not included.`,
    );
  });
  // Writes a saved group's classes to src/styles/themes/groups.css, using
  // the latest typography saved by the Typography Builder.
  async function writeGroupClasses(saved: ThemeGroup): Promise<string[]> {
    let group = saved;
    const stored = localStorage.getItem(themeGroupsStorageKey);
    const latest = stored
      ? parseThemeGroups(stored).find(({ id }) => id === saved.id)
      : undefined;
    if (latest) group = { ...group, typography: latest.typography };
    const slug = groupClassSlug(group.name);
    themesFolder ??= await getThemesFolder();
    // groups.css for the site and Page Builder; theme-groups.json so every
    // browser (and git) has the group, not only this browser's storage.
    await saveGroupToProject(themesFolder, group);
    return classGroupAreas.map(({ suffix }) => `sg-${slug}-${suffix}`);
  }

  publishButton.addEventListener("click", async () => {
    const group = groups.find(({ id }) => id === selectedId);
    if (!group) {
      message("Save or load a theme group first, then rewrite its project files.");
      return;
    }
    if (dirty) {
      message(
        `"${group.name}" has unsaved changes. Select Update group first so the classes match what you see.`,
      );
      return;
    }
    publishButton.disabled = true;
    try {
      const names = await writeGroupClasses(group);
      message(
        `Rewrote "${group.name}" in src/styles/themes/groups.css and theme-groups.json. Its classes: ${names[0]}, ${names[1]}, and ${names[2]} through ${names.at(-1)}.`,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        message("Folder selection cancelled. No files were rewritten.");
      else reportError("Unable to save the classes.", error);
    } finally {
      publishButton.disabled = !selectedId;
    }
  });
  importButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_000_000)
        throw new Error("Choose a JSON file smaller than 1 MB.");
      const imported = parseThemeGroups(await file.text());
      if (!imported.length)
        throw new Error("This file contains no theme groups.");
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
      reportError("Unable to import theme groups.", error);
    } finally {
      fileInput.value = "";
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty || sitewideDirty) event.preventDefault();
  });

  // Sitewide colors: read from the project's sitewide.css, saved back to it.
  // Two Save to sitewide.css buttons: in the Global section and the panel.
  const sitewideButtons = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-save-sitewide]"),
  ];
  const sitewideStates = [
    ...root.querySelectorAll<HTMLElement>("[data-sitewide-state]"),
  ];
  const renderSitewideSave = (saving = false) => {
    renderTypographySave();
    if (saving && isSitewideArea(typographyRegion()))
      typographySave.disabled = true;
    for (const button of sitewideButtons)
      button.disabled = saving || !sitewideReady;
    for (const state of sitewideStates) {
      state.textContent = !sitewideReady
        ? "Not loaded"
        : saving
          ? "Saving..."
          : sitewideDirty
            ? "Unsaved changes"
            : "Saved";
      state.dataset.state = sitewideDirty ? "unsaved" : "saved";
    }
  };
  renderSitewideSave();
  onSitewideChange = () => renderSitewideSave();
  void fetch("/website-builder/sitewide.css", { cache: "no-store" })
    .then((response) => (response.ok ? response.text() : ""))
    .then((css) => {
      const saved = parseSitewideCss(css);
      const savedStyles = parseSitewideAreas(css);
      const savedWidth = parseSitewideLayout(css);
      if (!sitewideDirty) {
        sitewide = saved;
        sitewideStyles = savedStyles;
        siteWidth = savedWidth;
      }
      sitewideReady = true;
      renderSitewideSave();
      renderColors();
      renderTypography();
      renderWidths();
    })
    .catch((error) =>
      reportError(
        "Unable to read src/styles/themes/sitewide.css, so saving sitewide colors is disabled to protect it.",
        error,
      ),
    );
  const saveSitewide = async () => {
    if (!sitewideReady) return;
    renderSitewideSave(true);
    try {
      themesFolder ??= await getThemesFolder();
      // Keep the Typography Builder's section of the file.
      const existing = await readTextFile(themesFolder, sitewideCssFile);
      const tidyStyles = {
        colors: sitewideStyles.colors,
        widths: sitewideStyles.widths,
        typography: Object.fromEntries(
          Object.entries(sitewideStyles.typography)
            .map(([region, rules]) => [
              region,
              Object.fromEntries(
                Object.entries(rules ?? {}).filter(
                  ([, styles]) => Object.keys(styles).length,
                ),
              ),
            ])
            .filter(([, rules]) => Object.keys(rules).length),
        ),
      };
      await writeTextFile(
        themesFolder,
        sitewideCssFile,
        writeSitewideSection(
          writeSitewideSection(
            sitewideCss(sitewide, existing),
            "areas",
            sitewideAreasCss(tidyStyles),
          ),
          "layout",
          sitewideLayoutCss(siteWidth),
        ),
      );
      sitewideDirty = false;
      message(
        "Saved the content width, CTA colors, header, and footer to src/styles/themes/sitewide.css (its typography section was kept). They apply on every page, whatever theme group is used.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        message("Folder selection cancelled. sitewide.css was not saved.");
      else reportError("Unable to save sitewide.css.", error);
    } finally {
      renderSitewideSave();
    }
  };
  for (const button of sitewideButtons)
    button.addEventListener("click", () => void saveSitewide());
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
