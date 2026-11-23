import type { AstroComponentFactory } from "astro/runtime/server/index.js";

/**
 * The blocks in src/components/blocks/<library>/<category>/<name>.astro, for
 * Display Blocks. Each one's id is its path there without ".astro", e.g.
 * "flowbite/hero/hero_17".
 */
const modules = import.meta.glob<{ default: AstroComponentFactory }>(
  "/src/components/blocks/*/*/*.astro",
);

export interface BlockEntry {
  id: string;
  library: string;
  category: string;
  name: string;
  /** Headers and footers are styled sitewide, not by a theme group. */
  slot: "header" | "footer" | null;
  load: () => Promise<{ default: AstroComponentFactory }>;
}

const compare = new Intl.Collator("en", { numeric: true }).compare;

export const blocks: BlockEntry[] = Object.entries(modules)
  .map(([path, load]) => {
    const id = path
      .replace("/src/components/blocks/", "")
      .replace(/\.astro$/, "");
    const [library, category, name] = id.split("/");
    const slot =
      category === "header"
        ? "header"
        : category === "footer"
          ? "footer"
          : null;
    return { id, library, category, name, slot, load } as BlockEntry;
  })
  .sort((a, b) => compare(a.id, b.id));

/** The blocks grouped by library, then category, for the directory. */
export function blockDirectory() {
  const libraries = new Map<string, Map<string, BlockEntry[]>>();
  for (const block of blocks) {
    const categories = libraries.get(block.library) ?? new Map();
    libraries.set(block.library, categories);
    categories.set(block.category, [
      ...(categories.get(block.category) ?? []),
      block,
    ]);
  }
  return [...libraries].map(([library, categories]) => ({
    library,
    categories: [...categories].map(([category, entries]) => ({
      category,
      blocks: entries,
    })),
  }));
}

export const blockViewPath = (id: string) =>
  `/website-builder/display-blocks/view/${id}/`;
