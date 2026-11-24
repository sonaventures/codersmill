---
title: "Add custom fonts"
description: "Install Google Fonts and make them available to the builders."
sidebar:
  order: 4
---

Enter Google Font family names and copy the generated command, for example:

```sh
npm run fonts:add -- outfit playfair-display
```

It installs the matching Fontsource packages, adds their imports and tokens to
`fonts.css`, and makes them available in the Typography Builder. Restart the
dev server afterwards.
