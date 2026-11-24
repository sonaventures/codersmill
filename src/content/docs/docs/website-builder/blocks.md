---
title: "Blocks"
description: "The ready-made blocks pages are built from, and the marker classes they carry."
sidebar:
  order: 11
---

Blocks are ready-made pieces of HTML (heroes, calls to action, features,
testimonials, headers, footers, and more) in `src/components/blocks/`:

- `flowbite/`: Flowbite blocks, including the headers and footers
- `flyonui/`: FlyonUI blocks
- `codersmill/`: Coders Mill blocks (folders ready to fill)

Each block's outer element is a `<div>`, because the Page Builder already
wraps it in a `<section>`. Content sits in a `max-w-site` container, so one
setting controls the site's width. Colors were removed from the blocks, so
they take their colors from your theme groups.

## Marker classes

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
