# Exclusive Group

A static Astro website for the Exclusive Group directory. Company destinations
and other content that has not been supplied are intentionally left pending.

## Development

```sh
npm install
npm run dev
```

## Validation

```sh
npm run format:check
npm test
npm run build
```

## Theme Maker

The template pages share `src/styles/template/template.css`, which uses
Tailwind utilities and keeps the individual page styles scoped. Inline styles
provide dynamic theme and palette values for the previews.

Use `/template/colors/` (linked from the theme template) to add or remove
11-shade color families directly in `src/styles/themes/colors.css`. Select the
`websitebuilder` project folder (the folder containing `src` and `public`), not
the CSS file or `themes` folder, in Chrome or Edge on localhost or HTTPS; files
are accessed locally. Enter numeric OKLCH values for each shade, or import a CSS
file with custom properties such as `--color-ocean-50: oklch(97% 0.01 240);`
through `--color-ocean-950`. The import fills the form without saving; review
the name and shades and select **Add family** to write them. CSS files with
multiple complete families offer a family selector. Built-in Tailwind family
names are reserved; the editor manages only custom families. The editor checks
`src`, `public`, and this browser's saved style groups before removal
and blocks explicit references it finds there. It cannot detect dynamically
constructed references or inspect groups in other browsers or exported files
outside those directories. Refresh the theme template or Theme Maker after a
change to see the updated palette.
The Color Editor uses the same `xl`-width studio header as Theme Maker, with
links aligned to the right, and omits the site footer.

Open `/template/themebuilder/` (also linked from `/template/template/`) to preview
color combinations. The left sample includes a header, footer, and six sections
with heading levels, paragraphs, two buttons, and three independently styled
cards in every section and on Page canvas. Section 05 also includes a two-column layout.
The separate **Hero** editing area includes its own sample hero with headings,
paragraph text, and primary/secondary buttons. Its `canvas-hero` (plus border
and shadow), `ink-hero` (plus heading variants), and `accent-hero-*` tokens are
available as Tailwind colors and are saved independently in each theme.
Existing hero-gradient and glow tokens remain unchanged.
The sample fills the available area without an outer frame or section borders.
Its header, page introduction, sections, and footer have full-width backgrounds
with centered content capped at the `lg` screen width (1024px).
On desktop, the controls are pinned to the right edge at full viewport height
with independent scrolling, and the preview reserves space beside them. On small
screens, the controls stack below the preview.
The full-width studio header has content capped at `xl` (1280px) and contains **Design System / Color Studio**,
**Theme Maker**, its introduction, and the light/dark toggle instead of the site's
logo and navigation. The sidebar sits below the visible header and fills the
viewport height as the header scrolls out of view.
The header uses compact typography and spacing, with a centered theme toggle
and right-aligned theme template and color editor links.

The controls include Tailwind's built-in color ramps and the custom ramps in
`src/styles/themes/colors.css`. The site's light and dark semantic defaults use
the closest built-in Tailwind colors to the previous custom palette, so custom
families can be removed when no longer referenced. Semantic tokens are grouped by area in the Tailwind mappings, light
defaults, and dark overrides, keeping each area's Canvas, Accent, Ink, and
navigation roles together. Choose an area, a target role, and a palette family, then click a
shade. You can also choose any palette color directly in a role's dropdown.
Section tokens use zero-padded numbers (`canvas-01`, `accent-01-*`, `ink-01-*`
through `06`). Saved style groups retain their existing section assignments;
page-heading token names are unchanged.
The compact palette spans the preview space at the bottom while scrolling, clear
of the controls sidebar. The area, target role, and family dropdowns share one row
with all shades, including white, black, and none. The title and theme description sit
above the row. Click **Tailwind palette** to collapse or reopen it; on narrow
screens the controls scroll horizontally without wrapping.
Selecting an editing area refreshes its current-theme color controls and brings
that sample area to the top of the viewport, including the footer. If a
page-wide brand/CTA role was selected, choosing another area switches the
palette target to that area's background.
Click anywhere in a color-control block (label, token, swatch, or padding) to
focus that color. The active block is highlighted; dropdowns and hex inputs
remain directly editable. Focusing a control synchronizes the floating palette's
area, target role, family, and selected shade. Brand/CTA controls select the
page-wide area. Theme defaults follow the currently resolved theme shade;
white/black, none, and custom hex colors are identified without guessing a family.

Controls are grouped by **Canvas**, **Accent**, and **Ink**, showing the actual
semantic tokens: `canvas-page`, `accent-page-*`, `ink-page-*`, then
`canvas-header`, `accent-header-*`, `ink-header-*`, and so on. Sections 1–6 map
to the `01`–`06` groups. Each section exposes `canvas-01-card-01` through
`canvas-01-card-03` (and equivalent `02`–`06` section tokens), with separate
`-border` and `-shadow` colors. Unassigned card colors follow their section's
canvas, border, and shadow, including live edits. Tailwind utilities support
the same fallback; dedicated card tokens can be overridden independently.
Shared card text and secondary-button overrides remain preview-only.
Page canvas has the same three cards, using `canvas-page-card-01` through
`canvas-page-card-03` and their border/shadow variants.
**Theme default** follows the site's light/dark theme token; explicit colors
store references such as `var(--color-sky-500)`, not flattened hex values.
**None** sets a transparent color, including for text and borders; it does not
revert to the theme default. For visibility, transparent page-wide overrides
affect the sample but not the studio controls or header. **Custom hex** remains available.
Only the selected area's groups are shown and labeled with that area: selecting
Section 1 shows Canvas, Accent, and Ink for Section 1, not the global brand/CTA
controls. The palette's assignment list is filtered the same way. Card canvas,
border, and shadow controls appear inside Canvas for Page canvas and every numbered section;
shared card text appears inside Ink. Secondary-button controls
appear inside Accent where those buttons exist. Hidden controls retain their
saved values and do not participate in form validation.

**Brand / page-wide** controls select `brand-01` through `brand-06`.
These and the CTA controls are available when **Page canvas** is selected.
The sample logo uses `brand-01` for **Exclusive** and `brand-02` for
**GROUP**. **CTA / page-wide** controls select `cta-01` and `cta-02`
for the two page-intro buttons. These controls affect the entire sample page,
regardless of the current editing area, and are saved separately for each theme.
Existing saved brand and CTA assignments are preserved when using the numbered tokens.

The sample header includes four dropdown navigation items. Click a heading or
use Enter/Space to toggle its submenu; Escape, clicking outside, or selecting a
link closes it. Links lead to the sample sections, not other site pages.

Use the site's theme switch to edit **light and dark assignments separately**.
Page canvas assignments also style the studio header, color controls, and palette
live, including their canvases, text, headings, borders, and accent treatments.
Section assignments remain local to the sample. All overrides are scoped to Theme
Maker and do not change other site pages. Header/footer ink aliases and the page
accent canvas are also exposed as Tailwind colors.

Save a named style group to keep the entire page palette in this browser. Select a saved
group to load/update it, or use **Save as new** to name a copy of the current
palette. A group includes both themes.

**Export JSON** downloads all saved groups (not unsaved preview changes).
**Import JSON** adds groups without replacing existing groups; duplicate names
receive a numeric suffix. Storage is local to this browser and origin, so export
a backup before clearing browser data or moving to another device. Invalid
imports are rejected without changing saved groups.
Exports use format version 6. Existing version 1 hex and version 2/3/4/5 theme groups
still load/import, retaining their explicit area colors. Assignments set to
**Theme default** now follow the new Tailwind-based defaults. Versions 1–3 adopt theme defaults
for the hero area; versions 1/2 also adopt theme defaults for brand and CTA controls.
Older groups' shared card backgrounds are copied to all three cards, preserving
card text. Their new card borders and shadows follow the section defaults.

## Updating content

Company names and configurable website destinations live in
`src/data/group.ts`. Replace a `null` `websiteUrl` only after a destination is
provided. Project, partner, and group-background content should be added only
when verified information is available.
