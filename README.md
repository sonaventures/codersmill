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

## Website Builder

Open `/website-builder/` for the workspace. The scrollable guide sits to the
left of the selected tool at widths of 640px and above and stacks above it
on smaller screens. The guide lists the steps in order: custom colors,
custom fonts, page creation, themes, site navigation, and typography. The
workspace and its embedded tools omit the header and footer. **Open tool in
a new tab** opens the standalone page with its usual navigation. The
custom-fonts step generates a local npm install command and also explains how
to self-host your own font files. Form Builder is available as an optional tool.

In **Add custom fonts**, enter Google Font family names and copy the generated
command into the VS Code terminal at the project root. For example:

```shell
npm run fonts:add -- outfit playfair-display
```

The installer installs the corresponding Fontsource packages, adds imports
and tokens in [fonts.css](./src/styles/themes/fonts.css), and registers the
fonts in Typography Builder. It does not change the default site fonts.
Restart the dev server if it was running during installation.

On the Website Builder home page, **Reset to Tailwind colors** limits the
Theme, Form, and Site Nav Builder palette pickers to Tailwind families in this
browser. **Show custom colors** restores the full list. Neither button changes
the Color Family Editor, project CSS, or saved styles.

Builder controls, menus, and palettes use Tailwind white and gray surfaces,
green primary actions, Inter body text, and Montserrat headings. The existing
theme switch selects the light or dark version. Public pages and editable
preview styles are not changed by the builder UI theme.

The site self-hosts Inter, Plus Jakarta Sans, DM Sans, Montserrat, and Syne through
[the theme font stylesheet](./src/styles/themes/fonts.css). Use `font-inter`,
`font-plus-jakarta-sans`, `font-dm-sans`, `font-montserrat`, or `font-syne` in Tailwind markup.
These utilities are opt-in and do not replace the site's default fonts.
Syne supports weights 400-800 in normal style and has no native italic.
The other variable fonts include their full weight ranges in both normal and italic:
Inter and Montserrat support 100-900, Plus Jakarta Sans supports 200-800,
and DM Sans supports 100-1000. Combine the family utility with a weight
utility such as `font-thin` (100), `font-bold` (700), `font-extrabold` (800),
or `font-[1000]` (DM Sans).

Builder pages live in `src/pages/website-builder/` and use the shared Website
Builder layout. Builder-specific components live in `src/components/websitebuilder/`.
Standalone builder scripts live in `src/scripts/websitebuilder/`.
The header and footer link to the tools, the current page is
highlighted, and the header includes the light/dark toggle. Browser titles use
Website Builder rather than the main site's name. Previous builder URLs
redirect to their new locations.
Builder dropdowns use higher-contrast slate borders in light mode. Custom
dropdown borders in the Form Builder preview still take precedence.

Use `/website-builder/sitenav-builder/` to draft a site header and menu. In the
form below the live preview, enter your site name and choose full page width
or a Tailwind screen-width cap (SM through 2XL) for the header. Align the menu
horizontally (left, center, or right) and vertically (top, center, or bottom),
and add, edit, or remove links. Answer Yes to the menu-wide submenu question
to reveal a submenu checkbox for each top-level item. Switch back to No to
hide dropdowns without discarding their contents. Enable subsections to group
links under named headings after the ungrouped links. If the parent item has its
own destination, the dropdown
includes it as an overview link. Use **Menu styles** to set text size, case,
letter spacing, normal and hover/focus/pressed text colors, item padding,
and gaps for the menu and dropdowns. Pick colors from the Tailwind swatches
or enter a custom hex color. The builder doesn't save the draft or
change your published navigation.

Use `/website-builder/form-builder/` to style a live sample form. Click or tab to
a control in the left preview to highlight its settings in the scrollable
**Form styles** panel. You can also select the whole form or a control in the
panel's dropdown. **Style all controls** applies shared border, input text,
and placeholder colors or replaces the sample placeholder text. Padding,
corner radius, and border width use Tailwind presets. Blank bulk settings
leave existing styles alone, and individual controls can still be edited.
Depending on the element, you can also style labels,
placeholders, focus rings, accents, or button states. The sample includes
text and date inputs, dropdowns, uploads, choices, and more. It does not
send form entries or save style changes.

Use `/website-builder/typography-builder/` to set styles for `h1`–`h6`, `p`,
`em`, `strong`, `code`, `cite`, `pre`, and `blockquote`. All 13 elements appear
in the live preview, including a multiline preformatted sample.
Choose **Site-wide defaults**, select an existing section ID from [`src/styles/themes/id.css`](./src/styles/themes/id.css),
or enter a new ID (with the option to automatically add the new ID to `id.css`) to edit local overrides.
Each element has font family, size, weight, line height, letter spacing, style,
text transform, and color controls. Select Tailwind defaults by utility name:
`text-xs` through `text-9xl`, `font-thin` through `font-black`, `leading-*`,
`tracking-*`, font families, font style, text transform, and the built-in
`text-{color}-{shade}` palette (plus black, white, transparent, and current color).
Presets set only their labeled property, not the entire utility; choose line
height separately from font size. Font families and palette colors use site
theme tokens; the other presets use Tailwind's default values.
The **Font family** menu includes the self-hosted Inter, Plus Jakarta Sans,
DM Sans, Montserrat, and Syne for both site-wide defaults and section overrides.
Choose a supported weight in the **Font weight** menu, including 1000 for
DM Sans.
**Custom value** keeps manual sizes, line heights, letter spacing, and hex colors
available. Existing saved custom values still load and remain editable.
Blank fields leave existing styles
unchanged; blank section fields follow the site-wide element defaults.
The isolated live preview compares the defaults and selected section without
changing the builder controls.

The sticky bottom bar centers the file actions and keeps them visible while
editing.
The Typography Builder workspace uses the full screen width. Select
**Open typography guide** to show the editing and saving instructions in a
left-side panel beside the editor on wide screens or over it on smaller
screens. Select **Close typography guide** to hide it.
**Save to project** uses Chrome or Edge folder access on localhost or HTTPS,
like Page Builder. Choose the project root containing `src/styles/global.css`
to replace [`src/styles/themes/typography.css`](./src/styles/themes/typography.css),
which the shared layout imports globally.
If Chrome or Edge cannot open the project folder, use **Save directly to CSS**,
select the existing stylesheet in the project (not a downloaded copy), and
confirm the replacement.
If saving fails, check the red message in the bottom bar for the invalid setting
or the exact project path it could not open. Allow write access when Chrome or
Edge prompts.
The stylesheet stores the editable settings as well as CSS, so reloading the
builder restores saved project settings. Overrides apply to matching elements
inside the section, including nested sections; section IDs should be unique
within each page. Saved rules override Tailwind typography utilities. Inline
styles, `!important`, and more-specific unlayered CSS can still take priority.
Empty settings preserve the existing site.
Rebuild and deploy after saving to update the published site.
**Download CSS** provides the same file for manual replacement in other browsers;
**Import builder CSS** restores an exported builder file into the preview without
applying it until saved. Unsaved preview changes are not persisted.

Use `/website-builder/page-builder/` to create an Astro page from components. Choose
the project folder in Chrome or Edge on localhost or HTTPS, enter a page name,
and add, reorder, or remove components. The generated file is saved under
`src/pages/` without overwriting an existing file or duplicating an existing
page route. For example, **Our Services** becomes `src/pages/our-services.astro`
at `/our-services/`. The layout adds the site header and footer. The builder
discovers `.astro` components in `src/components/` and its subfolders,
excluding the shared site header, site footer, and builder header. It supports required
and optional `string`, `number`, and `boolean` properties declared directly in
an `interface Props`; components using other property declarations are listed
as unsupported, as are components with slots or files over 5 MB. These files
do not block other components from loading. Reopen the project folder after
changing a component. Existing pages are not moved.

When adding components to a page, an optional section ID can be assigned to the outer
`<section>` element from the IDs defined in [`src/styles/themes/id.css`](./src/styles/themes/id.css)
or via a custom ID input. In the generated page, components
with an assigned section ID are wrapped in `<section id="...">`, allowing theme overrides,
anchor navigation, and Typography Builder rules to target the section directly.

**Save component copy** saves the component selected in the list to a new file
under `src/components/`, so templates such as those in `src/components/flowbite/`
and `src/components/flyonui/` can be renamed and customized without changing
the originals. Enter a path such as `custom/my-hero` (the `.astro` extension is
added automatically, and missing folders are created), then select **Save
component copy**. The copy is selected in the list, ready to add to the page.
Existing files are never overwritten, and reserved names such as the shared
site header are refused.

FlyonUI components with markup use `<section>` for their outer wrapper;
inner layout containers can still use `<div>`.

The hero examples in `src/components/flyonui/hero/` use Section 01 theme
colors and the shared layout header. Their sample links, forms, and purchase
actions are not connected. Alpine powers local interactions such as the meal
carousel, quantity selector, and copy button.

The Flowbite hero examples in `src/components/flowbite/hero/` use Section 01
and CTA theme colors; image-backed overlays use the Hero theme colors. Their
light and dark mockups follow the shared Alpine-powered header theme switch.

The Website Builder layout loads
[`websitebuilder.css`](./src/styles/websitebuilder/websitebuilder.css) for
builder-specific styles. The public theme template keeps its own
[`template.css`](./src/styles/template/template.css). Tailwind utilities remain
in the markup, and live previews still apply their dynamic styles separately.

Use `/website-builder/custom-colors/` (linked from the theme template) to add or remove
11-shade color families directly in `src/styles/themes/colors.css`. The
workspace uses the full available width, with **Current families** centered
within the editor column and capped at the `lg` screen width. Use
**Hide color editor guide** or **Show color editor guide** to toggle the
scrollable guide. It sits to the
left of the editor on wide screens and above it
on smaller screens. Select the
`websitebuilder` project folder (the folder containing `src` and `public`) in
Chrome or Edge on localhost or HTTPS. Choose `src` itself to add or import
families without granting access to the full project. Under **Current
families**, select **Remove** next to a family. If you opened `src`, select its
parent project folder when prompted so the editor can check references in `src`
and `public`. Confirm **Remove family** after the checks pass. Use
**Remove all current families** to remove all listed custom families in one
save. If any family is still referenced, nothing is removed and the editor
lists the references. Tailwind defaults are not affected. Files are accessed
locally.
The Color Editor stores the chosen folder handle in this
browser's IndexedDB, scoped to the current tab through session storage. After a
development-server reload, it reopens the folder and rereads the palette so you
can continue removing or adding families without choosing the folder again.
If the browser needs permission again, use **Reconnect project** to approve
access to the saved folder. Browser storage must be available; no folder
contents are uploaded or automatically written during reconnection.
Enter numeric OKLCH values for each shade, or import
UTF-8 plain-text `.txt` or `.css` files totaling up to 1 MB with declarations such as
`--color-ocean-50: oklch(97% 0.01 240);` through `--color-ocean-950`.
Each family needs shades 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, and
950, with a semicolon after each declaration and no duplicate shades.
Multiple complete families can share a file using different family names.
Select **Choose File** to open the file chooser. It still accepts multiple
files at once using Ctrl-click (Command-click on Mac) or Shift-click; all
their families are loaded together.
The page includes format instructions and a complete, downloadable two-family
`.txt` example, visible before selecting a project folder. CSS wrappers are
optional; JSON and code fences are not required.
The import fills the form without saving. Imports with multiple complete families
offer a family selector; name and shade edits are retained when switching families.
Select **Save all imported families to colors.css** next to **Choose File**
to validate and save every family from the selected files in one write.
Select **Add family** to save only the family you are reviewing.
If any family is invalid or conflicts with an existing name,
nothing is written and the import remains available to correct.
This avoids reselecting the import when a source stylesheet save triggers a
development-server page reload. **Add family** still saves only the selected
family and loads the next remaining family for individual review.
Built-in Tailwind family
names are reserved; the editor manages only custom families. The editor checks
`src`, `public`, and this browser's saved style groups before removal
and blocks explicit references it finds there. It cannot detect dynamically
constructed references or inspect groups in other browsers or exported files
outside those directories. Refresh the theme template or Theme Builder after a
change to see the updated palette.
The Color Editor uses the shared `xl`-width Website Builder header and builder footer.

Open `/website-builder/theme-builder/` (also linked from `/template/`) to preview
color combinations. The left sample includes a header, footer, and six sections
with heading levels, paragraphs, two buttons, and three independently styled
cards in every section and on Page canvas. Section 05 also includes a two-column layout.
The separate **Hero** editing area includes its own sample hero with headings,
paragraph text, and primary/secondary buttons with arrows after their labels.
Its `canvas-hero` (plus border
and shadow), `ink-hero` (plus heading variants), and `accent-hero-*` tokens are
available as Tailwind colors and are saved independently in each theme.
The preview's light-mode hero defaults to a pale sky background and dark text;
saved hero colors still override those defaults. The dark-mode preview and the
site's hero-gradient and glow tokens remain unchanged.
The sample fills the available area without an outer frame.
Its header, page introduction, sections, and footer have full-width backgrounds
with centered content capped at the `lg` screen width (1024px).
On desktop, the controls are pinned to the right edge at full viewport height
with independent scrolling, and the preview reserves space beside them. On small
screens, the controls stack below the preview.
The full-width builder header has content capped at `xl` (1280px) and contains **Website Builder**,
**Theme Builder**, its introduction, and the light/dark toggle instead of the site's
logo and navigation. The sidebar sits below the visible header and fills the
viewport height as the header scrolls out of view.
The header uses compact typography and spacing, with a centered theme toggle
and right-aligned links to every builder and the theme template.
In light mode, the color controls use higher-contrast borders without changing
the borders of the sample canvas or its elements.

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
The compact **Color Picker** sits at the bottom of the preview and can be
collapsed. In **Color Swatches**, the area, target role, and family dropdowns
share a row with the shades, including white, black, and none. Custom families
appear before Tailwind defaults in the family and role color dropdowns when
custom colors are enabled. This row scrolls
horizontally on narrow screens. In **Global Styles**, choose Sections (including
the hero), Cards, or Subsections, then pick a visual corner-radius preset from
None through 3XL. Corner radii apply across the preview in both themes and are
saved and exported with the style group.
Selecting an editing area refreshes its current-theme color controls and brings
that sample area to the top of the viewport, including the footer. If a
page-wide brand/CTA role was selected, choosing another area switches the
palette target to that area's background.
Click a preview element to highlight it and center its matching color control
in the panel without moving the desktop preview. Header menu items and body
paragraphs select their area's text color. Header logo words select their
page-wide brand colors. Primary and secondary buttons select their own
background colors, and headings and their labels select the matching heading
color. Click the section itself to edit its border.
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
