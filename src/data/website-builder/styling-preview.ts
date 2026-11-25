import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import { inspectComponent } from "./page-builder.js";

/**
 * The components Component Styling can show on their own: the blocks and the
 * CodersMill components that need no props and have no slots (the ones the
 * Page Builder can place). Each one's id is its path in src/components
 * without ".astro", e.g. "codersmill/fp_hero-5".
 */
const modules = import.meta.glob<{ default: AstroComponentFactory }>([
  "/src/components/blocks/*/*/*.astro",
  "/src/components/codersmill/*.astro",
]);
const sources = import.meta.glob<string>(
  ["/src/components/blocks/*/*/*.astro", "/src/components/codersmill/*.astro"],
  { query: "?raw", import: "default", eager: true },
);

export interface StylingPreviewEntry {
  id: string;
  /** Headers and footers are styled sitewide (sw-header / sw-footer). */
  slot: "header" | "footer" | null;
  load: () => Promise<{ default: AstroComponentFactory }>;
}

export const stylingPreviews: StylingPreviewEntry[] = Object.entries(modules)
  .map(([file, load]) => {
    const path = file.replace("/src/components/", "");
    const inspected = inspectComponent(path, sources[file] ?? "");
    if (!inspected || inspected.error || inspected.properties?.length)
      return null;
    const id = path.replace(/\.astro$/, "");
    const slot = /(^|\/|_)header(\/|_|$)/.test(id)
      ? "header"
      : /(^|\/|_)footer(\/|_|$)/.test(id)
        ? "footer"
        : null;
    return { id, slot, load } as StylingPreviewEntry;
  })
  .filter((entry): entry is StylingPreviewEntry => Boolean(entry));

/** The preview page for a component path such as "codersmill/fp_hero-5.astro". */
export const stylingViewPath = (path: string) =>
  `/website-builder/component-styling/view/${path.replace(/\.astro$/, "")}/`;
