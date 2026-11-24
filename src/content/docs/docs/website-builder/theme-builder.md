---
title: "Theme Builder"
description: "Build theme groups: colors, accents, cards, corner radii, widths, and SVG types for each area."
sidebar:
  order: 5
---

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
action links. Each accent has eight colors: background, border, text, and
shadow, a hover / focus background, border, and text, and an active
(pressed) border. Their variables
name the area and the accent, e.g. `--accent-01-02-hover-border` is Accent
2's hover / focus border in Section 01. Left on **Theme default**, hover /
focus colors use the accent's own colors, the active border uses the hover /
focus border, Accent 2 and 3 use Accent 1's
border and shadow, Accent 2 takes the area's background and text, and Accent
3 is a text link in the area's focus color.

Each card (Card 01–03) and the subsection in the page, hero, and section
areas also styles its own content: paragraph text, H2, H3, strong, em, pre,
muted, highlight, quote, and inline code colors, and inline code and code block backgrounds (`--ink-03-card-02-h2` is Card 02's H2 in
Section 03). Left on **Theme default**, they are the area's colors. A card is
found by the background class from Component Styling's card and subsection
presets (`bg-canvas-01-card-02`, `bg-canvas-01-subsection`), and
[`cards.css`](https://github.com/sonaventures/codersmill/blob/main/src/styles/utilities/cards.css) swaps the area's text colors
for the card's inside it.

Each card and the subsection also has its own **Accent 1 and Accent 2**, with
the same eight colors (`--accent-hero-card-01-02-hover` is Card 01's Accent 2
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
  the `svg` (SVG icon 1), `svg-2` (SVG icon 2), `nav-svg`, `button-svg`, or
  `anchor-svg` class. An SVG type left on **Theme default** keeps the SVG's
  own colors.

Some styles are **sitewide** instead, saved to `sitewide.css` with **Save to
sitewide.css** and applied whatever group a page uses: the Global area's CTA
01–03 colors, the header and footer (`sw-header`,
`sw-footer`), and the site's content width.

The header and footer also have form field colors (label, input text,
background, border, placeholder, and focus) and the SVG types, like a theme
group's areas. In the preview, the header's menu headers and the footer's menu
links show Accent 1 (the header's with Nav SVG arrows); Contact and Subscribe
are Accent 2 beside an Accent 3 link; and each has a field and two icons (SVG
icon 1 and 2). Click any of them to edit its colors.

Groups are kept in the browser and in the project's `theme-groups.json`, and
can be exported and imported as JSON (format version 34; older files still
load, with their accent colors moved to the new names and their card text
color given to every card).
