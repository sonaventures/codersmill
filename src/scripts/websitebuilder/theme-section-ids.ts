import { validateSectionId } from "../../data/typography-builder.js";

const CUSTOM = "__custom__";

/**
 * Wires the "Apply CSS ID" dropdowns in the theme builder preview. Choosing an
 * ID renames the sample area's element so the matching rules in
 * src/styles/themes/id.css apply to it. Preview only: nothing is saved.
 */
function initSectionIds() {
  const page = document.querySelector<HTMLElement>("#selector-sample-page");
  if (!page) return;
  const status = document.querySelector<HTMLElement>("#selector-status");
  const selects = [
    ...document.querySelectorAll<HTMLSelectElement>(".sample-id-select"),
  ];

  const announce = (message: string) => {
    if (status) status.textContent = message;
  };

  // Track each area's element and current ID; the page area is the
  // #selector-sample-page wrapper, the others are the [data-region] sections.
  const targets = new Map<HTMLSelectElement, HTMLElement>();
  for (const select of selects) {
    const region = select.dataset.regionTarget;
    const target =
      region === "page"
        ? page
        : page.querySelector<HTMLElement>(
            `[data-region="${CSS.escape(region ?? "")}"]`,
          );
    if (target) targets.set(select, target);
  }

  const appliedIds = (except?: HTMLSelectElement) =>
    new Set(
      [...targets]
        .filter(([select]) => select !== except)
        .map(([, target]) => target.id),
    );

  // An ID can only be used once on the page, so disable it in other dropdowns.
  const refreshOptions = () => {
    for (const select of targets.keys()) {
      const taken = appliedIds(select);
      for (const option of select.options) {
        if (option.value && option.value !== CUSTOM)
          option.disabled = taken.has(option.value);
      }
    }
  };

  const applyId = (select: HTMLSelectElement, nextId: string) => {
    const target = targets.get(select);
    if (!target) return false;
    const previousId = target.id;
    if (nextId === previousId) return true;
    const existing = document.getElementById(nextId);
    if (existing && existing !== target) {
      announce(`#${nextId} is already used on this page. Choose another ID.`);
      return false;
    }
    target.id = nextId;
    // Keep in-preview links (navigation, "back to top") pointing at the area.
    for (const link of page.querySelectorAll<HTMLAnchorElement>(
      `a[href="#${CSS.escape(previousId)}"]`,
    ))
      link.setAttribute("href", `#${nextId}`);
    const badge = document.getElementById(`badge-${select.dataset.defaultId}`);
    if (badge) badge.textContent = `#${nextId}`;
    return true;
  };

  const ensureOption = (select: HTMLSelectElement, id: string) => {
    let option = [...select.options].find((item) => item.value === id);
    if (!option) {
      option = new Option(`#${id} (custom)`, id);
      select.insertBefore(option, select.querySelector(`option[value="${CUSTOM}"]`));
    }
    return option;
  };

  for (const [select, target] of targets) {
    const defaultId = select.dataset.defaultId ?? target.id;
    let current = select.value;

    select.addEventListener("change", () => {
      let value = select.value;
      if (value === CUSTOM) {
        const entered = window.prompt(
          "Enter a CSS ID for this area (without the leading #):",
          "",
        );
        const id = entered?.trim().replace(/^#/, "") ?? "";
        if (!id) {
          select.value = current;
          return;
        }
        try {
          validateSectionId(id);
        } catch (error) {
          announce((error as Error).message);
          select.value = current;
          return;
        }
        value = id;
      }
      const nextId = value || defaultId;
      if (!applyId(select, nextId)) {
        select.value = current;
        return;
      }
      if (value && value !== select.value) ensureOption(select, value).selected = true;
      current = select.value;
      refreshOptions();
      announce(
        value
          ? `Applied #${nextId} to this area. Styles from id.css now preview here.`
          : `Restored the default ID #${defaultId}.`,
      );
    });
  }

  refreshOptions();
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initSectionIds, { once: true });
else initSectionIds();
