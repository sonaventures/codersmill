---
title: "Typography Builder"
description: "Set fonts, sizes, weights, and more, site-wide and for theme group areas."
sidebar:
  order: 6
---

Set fonts, sizes, weights, line height, letter spacing, case, and color for
headings, paragraphs, and other text. Site-wide defaults are saved to the
typography section of `sitewide.css`; typography for a theme group's areas is
saved with the group and written to `groups.css`.

The **Accent 1–3** elements set the font of the accent buttons everywhere: in
the site-wide defaults, in any area (the header and footer included), and in
any card or subsection from the Theme Builder's Typography tab. They target
the background class of the Accent presets (`bg-accent-01-01` and so on), so
an accent link keeps the accent's font rather than the link's.

The **Menu header** element sets the font of a site menu's top-level items
(the links with the `menu-header` class, which the CodersMill header's section
links have) in the same places; in the Theme Builder, click a menu header in
the header preview to select it.

The **Input label** and **Input text** elements set the typography of form
fields in the same places: `label`, and the text typed into `input`,
`textarea`, and `select`.
