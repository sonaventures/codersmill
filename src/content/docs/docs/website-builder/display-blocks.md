---
title: "Display Blocks"
description: "Preview every block with a theme group, area, and light or dark mode."
sidebar:
  order: 7
---

Browse every block in `src/components/blocks/` from the directory on the left,
filter it by name, and see the selected block with a theme group. The floating
**Theme Group Picker** chooses the group, the area the block is shown as (Hero
or Section 01–06), and light or dark mode. The block is wrapped as the Page
Builder wraps it: `sg-<group>-page` around a `<section>` with
`sg-<group>-<area>`. Headers and footers start on their sitewide styles
(`sw-header`, `sw-footer`, the **Sitewide header / footer** area); choose a
group or another area to try a theme group on them too. Groups are read from `groups.css`, so
reload the page after saving a new group.
