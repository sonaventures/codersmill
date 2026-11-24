---
title: "Add custom colors"
description: "Add, import, or remove OKLCH color families in colors.css."
sidebar:
  order: 3
---

Add, import, or remove 11-shade OKLCH color families (shades 50 through 950)
in `colors.css`. Families can be typed in or imported from `.txt` or `.css`
files with lines such as `--color-ocean-50: oklch(97% 0.01 240);`. A family
that is still referenced in `src`, `public`, or a saved theme group cannot be
removed. Tailwind's own families are never changed.
