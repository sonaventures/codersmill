---
title: "The tools, in order"
description: "Which tool does what, and which files each one saves."
sidebar:
  order: 2
---

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
