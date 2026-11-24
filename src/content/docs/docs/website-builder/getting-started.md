---
title: "Getting started"
description: "Install Website Builder, open the workspace, and choose your project folder."
sidebar:
  order: 1
---

```sh
npm install
npm run dev
```

Open `/website-builder/` for the builder workspace. The public site is at `/`.

The tools read and write project files through the browser's File System
Access API, so use Chrome or Edge on `localhost` or HTTPS. When a tool asks,
choose the project folder (the one that contains `src`). Files are read and
written locally; nothing is uploaded.

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
