import {
  isSectionId,
  sectionIdRegions,
  type SectionIdRegion,
  type SectionIds,
} from "../../data/style-groups";

const CUSTOM = "__custom__";
const INVALID_ID =
  "Use a section ID of 1-120 characters without spaces or control characters. Enter the ID without a leading #.";

interface Area {
  region: SectionIdRegion;
  select: HTMLSelectElement;
  target: HTMLElement;
  defaultId: string;
  badge: HTMLElement | null;
}

export interface SectionIdController {
  /** IDs chosen in the dropdowns; areas on their default ID are left out. */
  get(): SectionIds;
  /** Applies saved IDs (missing areas return to default). Returns any problems. */
  set(ids: SectionIds): string[];
}

/**
 * Wires the "Apply CSS ID" dropdowns in the theme builder preview. Choosing an
 * ID renames that area's element so the matching rules in
 * src/styles/themes/id.css apply to it.
 */
export function initSectionIds(
  page: HTMLElement,
  options: { onChange(message: string): void; onError(message: string): void },
): SectionIdController {
  const areas: Area[] = [];
  for (const select of page.ownerDocument.querySelectorAll<HTMLSelectElement>(
    ".sample-id-select",
  )) {
    const region = sectionIdRegions.find(
      (key) => key === select.dataset.regionTarget,
    );
    if (!region) continue;
    const target =
      region === "page"
        ? page
        : page.querySelector<HTMLElement>(`[data-region="${region}"]`);
    if (!target) continue;
    const defaultId = select.dataset.defaultId || target.id;
    areas.push({
      region,
      select,
      target,
      defaultId,
      badge: page.ownerDocument.getElementById(`badge-${defaultId}`),
    });
  }

  // Rename an area and keep in-preview links (navigation, "back to top") on it.
  const rename = (area: Area, nextId: string) => {
    const previousId = area.target.id;
    if (previousId === nextId) return;
    area.target.id = nextId;
    for (const link of page.querySelectorAll<HTMLAnchorElement>(
      `a[href="#${CSS.escape(previousId)}"]`,
    ))
      link.setAttribute("href", `#${nextId}`);
    if (area.badge) area.badge.textContent = `#${nextId}`;
  };

  const isFree = (area: Area, id: string) => {
    const existing = page.ownerDocument.getElementById(id);
    return !existing || existing === area.target;
  };

  const selectValue = (area: Area, id: string) => {
    if (id === area.defaultId) {
      area.select.value = "";
      return;
    }
    let option = [...area.select.options].find((item) => item.value === id);
    if (!option) {
      option = new Option(`#${id} (custom)`, id);
      area.select.insertBefore(
        option,
        area.select.querySelector(`option[value="${CUSTOM}"]`),
      );
    }
    option.selected = true;
  };

  // An ID can only be used once on the page, so disable it in other dropdowns.
  const refreshOptions = () => {
    for (const area of areas) {
      const taken = new Set(
        areas.filter((other) => other !== area).map(({ target }) => target.id),
      );
      for (const option of area.select.options) {
        if (option.value && option.value !== CUSTOM)
          option.disabled = taken.has(option.value);
      }
    }
  };

  for (const area of areas) {
    area.select.addEventListener("change", () => {
      const current = area.target.id;
      let id = area.select.value;
      if (id === CUSTOM) {
        id =
          window
            .prompt("Enter a CSS ID for this area (without the leading #):", "")
            ?.trim()
            .replace(/^#/, "") ?? "";
        if (!id) {
          selectValue(area, current);
          return;
        }
        if (!isSectionId(id)) {
          selectValue(area, current);
          options.onError(INVALID_ID);
          return;
        }
      }
      const nextId = id || area.defaultId;
      if (!isFree(area, nextId)) {
        selectValue(area, current);
        options.onError(
          `#${nextId} is already used on this page. Choose another ID.`,
        );
        return;
      }
      rename(area, nextId);
      selectValue(area, nextId);
      refreshOptions();
      options.onChange(
        id
          ? `Applied #${nextId} to this area.`
          : `Restored the default ID #${area.defaultId}.`,
      );
    });
  }

  refreshOptions();

  return {
    get() {
      const ids: SectionIds = {};
      for (const area of areas)
        if (area.target.id !== area.defaultId)
          ids[area.region] = area.target.id;
      return ids;
    },
    set(ids) {
      const problems: string[] = [];
      // Clear every area first so IDs can move between areas without clashing.
      areas.forEach((area, index) => rename(area, `section-id-pending-${index}`));
      const desired = new Map(
        areas.map((area) => [area, ids[area.region] || area.defaultId]),
      );
      // Fall back to the default ID wherever a saved ID clashes with another
      // area or with another element on the page. Defaults never clash with
      // each other, so this settles within one pass per area.
      for (let pass = 0; pass <= areas.length; pass++) {
        let changed = false;
        for (const area of areas) {
          const id = desired.get(area)!;
          if (id === area.defaultId) continue;
          const clashes =
            !isSectionId(id) ||
            !isFree(area, id) ||
            areas.some((other) => other !== area && desired.get(other) === id);
          if (clashes) {
            problems.push(`#${id} could not be applied to ${area.region}.`);
            desired.set(area, area.defaultId);
            changed = true;
          }
        }
        if (!changed) break;
      }
      for (const area of areas) {
        const nextId = desired.get(area)!;
        rename(area, nextId);
        selectValue(area, nextId);
      }
      refreshOptions();
      return problems;
    },
  };
}
