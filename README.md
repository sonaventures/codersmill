# CodersMill

CodersMill is the home of Website Builder, a set of browser tools for
building and styling [Astro](https://astro.build) websites from ready-made
blocks. You pick colors, group them into themes, set the typography, assemble
pages from blocks, and give their buttons, links, icons, and cards your theme.
Each tool writes plain CSS and Astro files into the project, so the site you
build stays yours.

CodersMill is hosted by [Coders Mill](https://codersmill.com) at
codersmill.com. The repository is
[sonaventures/codersmill](https://github.com/sonaventures/codersmill).

## Getting started

```sh
npm install
npm run dev
```

Open `/website-builder/` for the builder workspace. The public site is at `/`.

The tools read and write project files through the browser's File System
Access API, so use Chrome or Edge on `localhost` or HTTPS. When a tool asks,
choose the project folder (the one that contains `src`). Files are read and
written locally; nothing is uploaded.

## Checks

```sh
npm run format:check
npm test
npm run build
```

Tests use Node's built-in test runner. The builder's tests are in
`scripts/website-builder/`; `scripts/site-content.test.mjs` checks the public
site.

## The workspace

`/website-builder/` shows the **Builder guide** beside the selected tool. The
guide lists the tools in workflow order, and steps with instructions have a
guide underneath them, closed until you open it. Drag the handle between the
guide and the tool to make the guide wider or narrower, or focus the handle
and use the arrow keys, Home, and End; double-click it to reset. The width is
remembered in your browser. **Open tool in a new tab** opens the current tool
on its own page.

The workspace also switches between light and dark mode, and can limit the
palette pickers to Tailwind's colors in this browser (**Reset to Tailwind
colors** / **Show custom colors**).

## The tools, in order

| Step | Tool                    | Saves to                                                                      |
| ---- | ----------------------- | ----------------------------------------------------------------------------- |
| 1    | Add custom colors       | `src/styles/themes/colors.css`                                                |
| 2    | Add custom fonts        | `src/styles/themes/fonts.css` (through `npm run fonts:add`)                   |
| 3    | Theme Builder           | `theme-groups.json`, `groups.css`, and `sitewide.css` in `src/styles/themes/` |
| 4    | Typography Builder      | `sitewide.css`, and theme groups                                              |
| –    | Display Blocks          | Nothing (a preview)                                                           |
| 5    | Page Builder            | `src/pages/<page>.astro`, and component copies in `src/components/`           |
| 6    | Component Styling       | The component files in `src/components/`                                      |
| 7    | Site Nav Builder        | Nothing (a live draft)                                                        |
| –    | Form Builder (optional) | Nothing (a live draft)                                                        |

### 1. Add custom colors

Add, import, or remove 11-shade OKLCH color families (shades 50 through 950)
in `colors.css`. Families can be typed in or imported from `.txt` or `.css`
files with lines such as `--color-ocean-50: oklch(97% 0.01 240);`. A family
that is still referenced in `src`, `public`, or a saved theme group cannot be
removed. Tailwind's own families are never changed.

### 2. Add custom fonts

Enter Google Font family names and copy the generated command, for example:

```sh
npm run fonts:add -- outfit playfair-display
```

It installs the matching Fontsource packages, adds their imports and tokens to
`fonts.css`, and makes them available in the Typography Builder. Restart the
dev server afterwards.

### 3. Theme Builder

Build a **theme group**: colors for the page, the hero, and six sections, in
both light and dark mode. Click any element in the preview to jump to its
color control. Saving a group writes it to `theme-groups.json` and its classes
to `groups.css`: `sg-<group>-page`, `sg-<group>-hero`, and
`sg-<group>-section-1` through `sg-<group>-section-6`.

Each class sets its area's colors and maps them onto the elements inside it:
the outer element's background, border, and shadow color, then `p`, `h1`–`h4`,
`strong`, `em`, `code`, `pre`, `label`, form fields, placeholders, focus,
`blockquote`, and `hr`. These rules sit in Tailwind's base layer, so a color
utility on a component's element still wins.

Each area also has three **accents**, Accent 1–3, for its buttons and
action links. Each accent has seven colors: background, border, text, and
shadow, and a hover / focus background, border, and text. Their variables
name the area and the accent, e.g. `--accent-01-02-hover-border` is Accent
2's hover / focus border in Section 01. Left on **Theme default**, hover /
focus colors use the accent's own colors, Accent 2 and 3 use Accent 1's
border and shadow, Accent 2 takes the area's background and text, and Accent
3 is a text link in the area's focus color.

Each card (Card 01–03) and the subsection in the page, hero, and section
areas also styles its own content: paragraph text, H2, H3, strong, em, pre,
muted, highlight, quote, and inline code colors, and inline code and code block backgrounds (`--ink-03-card-02-h2` is Card 02's H2 in
Section 03). Left on **Theme default**, they are the area's colors. A card is
found by the background class from Component Styling's card and subsection
presets (`bg-canvas-01-card-02`, `bg-canvas-01-subsection`), and
[`cards.css`](./src/styles/utilities/cards.css) swaps the area's text colors
for the card's inside it.

Each card and the subsection also has its own **Accent 1 and Accent 2**, with
the same seven colors (`--accent-hero-card-01-02-hover` is Card 01's Accent 2
hover / focus background in the hero). Left on **Theme default**, they are
the area's accents. Inside a card, `cards.css` swaps the area's Accent 1 and 2
for the card's, so the Accent 1 and Accent 2 presets (`bg-accent-01-01`,
`bg-accent-01-02`, ...) follow the card. Accent 3 stays the area's.

A group also holds:

- **Corner radii** for sections, cards, subsections, accent buttons, and CTA
  buttons (`--radius-section` and the rest, used by `rounded-section`,
  `rounded-card`, `rounded-subsection`, `rounded-accent`, and `rounded-cta`).
- **Content widths** for any area (`--container-site`, used by `max-w-site`).
- **SVG types**: a fill, stroke, hover/focus, and active color for SVGs with
  the `svg`, `nav-svg`, `button-svg`, or `anchor-svg` class. An SVG type left
  on **Theme default** keeps the SVG's own colors.

Some styles are **sitewide** instead, saved to `sitewide.css` with **Save to
sitewide.css** and applied whatever group a page uses: the Global area's CTA
01–03 colors, the header and footer (`sw-header`,
`sw-footer`), and the site's content width.

Groups are kept in the browser and in the project's `theme-groups.json`, and
can be exported and imported as JSON (format version 32; older files still
load, with their accent colors moved to the new names and their card text
color given to every card).

### 4. Typography Builder

Set fonts, sizes, weights, line height, letter spacing, case, and color for
headings, paragraphs, and other text. Site-wide defaults are saved to the
typography section of `sitewide.css`; typography for a theme group's areas is
saved with the group and written to `groups.css`.

The **Accent 1–3** elements set the font of the accent buttons everywhere: in
the site-wide defaults, in any area (the header and footer included), and in
any card or subsection from the Theme Builder's Typography tab. They target
the background class of the Accent presets (`bg-accent-01-01` and so on), so
an accent link keeps the accent's font rather than the link's.

The **Input label** and **Input text** elements set the typography of form
fields in the same places: `label`, and the text typed into `input`,
`textarea`, and `select`.

### Display Blocks

Browse every block in `src/components/blocks/` from the directory on the left,
filter it by name, and see the selected block with a theme group. The floating
**Theme Group Picker** chooses the group, the area the block is shown as (Hero
or Section 01–06), and light or dark mode. The block is wrapped as the Page
Builder wraps it: `sg-<group>-page` around a `<section>` with
`sg-<group>-<area>`. Headers and footers use their sitewide styles
(`sw-header`, `sw-footer`) instead. Groups are read from `groups.css`, so
reload the page after saving a new group.

### 5. Page Builder

Create a page from components: name it, add and order components, and assign
theme group classes to the page and each section. Choose the page's header and
footer (or none), and save a copy of any of them, or of an added component, to
a folder of your choice in `src/components/` so it can be changed without
touching the original. Pages are saved to `src/pages/` and never overwrite an
existing page. The Page Builder wraps each component in a `<section>`.

### 6. Component Styling

Give the elements of a component the classes from your theme groups: CTA
buttons, accent buttons and links, buttons, icons, cards, and form fields.
Choose a style for an element from the presets, or type classes. The blocks
carry marker classes that say what each element is (see below); each element
shows its marker and a suggested style, and applying a style replaces the
marker.

### 7. Site Nav Builder and Form Builder

The Site Nav Builder drafts a header and menu (links, submenus, alignment, and
menu styles) with a live preview. The Form Builder styles a sample form. Both
are previews and do not save.

## Blocks

Blocks are ready-made pieces of HTML (heroes, calls to action, features,
testimonials, headers, footers, and more) in `src/components/blocks/`:

- `flowbite/`: Flowbite blocks, including the headers and footers
- `flyonui/`: FlyonUI blocks
- `codersmill/`: Coders Mill blocks (folders ready to fill)

Each block's outer element is a `<div>`, because the Page Builder already
wraps it in a `<section>`. Content sits in a `max-w-site` container, so one
setting controls the site's width. Colors were removed from the blocks, so
they take their colors from your theme groups.

### Marker classes

Blocks mark their elements with generic classes so Component Styling can give
them the right theme classes:

| Marker          | Marks                                                            |
| --------------- | ---------------------------------------------------------------- |
| `cta-anchor`    | The main call-to-action link in a group of button links          |
| `accent-anchor` | Other button links, and text links with an icon                  |
| `button`        | A `<button>` styled as a button                                  |
| `button-icon`   | An icon in a button                                              |
| `anchor-icon`   | An icon in a text link                                           |
| `nav-icon`      | An icon in a menu                                                |
| `icon`          | Any other small icon                                             |
| `card`          | A repeated box, such as one of a set of features or testimonials |
| `subsection`    | A single bordered or shadowed box, or a box inside a card        |

Icons can be SVGs or [Iconify](https://iconify.design) classes such as
`icon-[tabler--arrow-right]` or `icon-[lucide--house]`; the full Iconify
collection, including Tabler and Lucide, is installed.

## The public site

The main menu is in [`src/data/site.ts`](./src/data/site.ts): five sections
(Services, Projects, Tools, Resources, and Us), each with its own page that
lists its pages, and a submenu. The header and footer read it. A page in the
menu that is not written yet shows a "coming soon" placeholder
([`placeholder-page.astro`](./src/components/placeholder-page.astro)) with the
title and description from the menu; replace it with the page's content when
it is ready. `/about/` redirects to `/us/who-we-are/`.

The pages use [`layout.astro`](./src/layouts/layout.astro), with the shared
header and footer. The site's name, host, menu, and page descriptions are in
`site.ts`, and the site URL, `https://codersmill.com`, is set in
`astro.config.mjs`. The layout uses it for canonical links and structured data
naming Coders Mill as the publisher.

## Project layout

| Path                              | Contents                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/pages/website-builder/`      | The builder tools                                                                        |
| `src/components/website-builder/` | Builder components, including the guides                                                 |
| `src/scripts/website-builder/`    | Builder scripts                                                                          |
| `src/styles/website-builder/`     | Builder styles                                                                           |
| `src/data/website-builder/`       | Builder logic: theme groups, group CSS, sitewide CSS, page generation, component styling |
| `src/data/site.ts`                | The site's name, host, navigation, and page descriptions                                 |
| `src/styles/themes/`              | `colors.css`, `fonts.css`, `sitewide.css`, `groups.css`, `theme-groups.json`, `id.css`   |
| `src/styles/utilities/base.css`   | Base styles and the `max-w-site` and corner radius defaults                              |
| `src/components/blocks/`          | The block libraries                                                                      |
| `scripts/website-builder/`        | The font installer and the builder's tests                                               |
