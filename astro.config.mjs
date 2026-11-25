import { defineConfig } from "astro/config";
import alpine from "@astrojs/alpinejs";
import tailwindcss from "@tailwindcss/vite";

import partytown from "@astrojs/partytown";
import starlight from "@astrojs/starlight";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { access, d1, r2 } from "@emdash-cms/cloudflare";
import emdash from "emdash/astro";
import { existsSync } from "node:fs";

// Static pages are prerendered in Node, where Cloudflare's runtime module
// (cloudflare:workers, imported by EmDash) does not exist. They never use
// EmDash's database, so while prerendering it is replaced with a stand-in;
// the Worker build uses the real module.
const stubId = "\0codersmill:cloudflare-workers-prerender";
// The builder tools save files from Chrome, which writes a temporary .crswap
// file and renames it over the original. The dev server can see that as the
// file being deleted and created again, and a delete reloads the whole page
// (losing the Theme Builder's place). A delete of a file that is back a
// moment later is ignored; the create that follows updates it as usual.
function ignoreReplacedFileDeletes() {
  return {
    name: "ignore-replaced-file-deletes",
    apply: "serve",
    enforce: "pre",
    async hotUpdate({ type, file }) {
      if (type !== "delete") return;
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (existsSync(file)) return [];
    },
  };
}

// Component Styling tells the dev server which component it is about to save
// (the "codersmill:saving-component" event). Changing a component normally
// reloads every open page, which threw Component Styling back to its start
// screen after each save. For that file only, the server's copy is refreshed
// without a reload; Component Styling reloads its own preview. Edits made
// anywhere else still reload the page as usual.
function quietComponentSaves() {
  const saving = new Map(); // file -> when the save was announced
  return {
    name: "codersmill:quiet-component-saves",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      server.environments.client.hot.on(
        "codersmill:saving-component",
        ({ path }) => {
          if (typeof path !== "string" || path.includes("..")) return;
          saving.set(
            `${server.config.root}/src/components/${path}`,
            Date.now(),
          );
        },
      );
    },
    hotUpdate({ file, modules, timestamp }) {
      const announced = saving.get(file);
      if (!announced || Date.now() - announced > 10_000) return;
      // The client's own updates (such as Tailwind's CSS) go ahead.
      if (this.environment.name === "client") return;
      const graph = this.environment.moduleGraph;
      const invalidated = new Set();
      for (const mod of modules)
        graph.invalidateModule(mod, invalidated, timestamp, true);
      // The per-page dev CSS, so the reloaded preview has the new styles.
      for (const [id, mod] of graph.idToModuleMap)
        if (id.startsWith("\0virtual:astro:dev-css:"))
          graph.invalidateModule(mod, invalidated, timestamp, true);
      const runner = this.environment.runner?.evaluatedModules;
      if (runner)
        for (const { id } of invalidated) {
          const cached = id && runner.getModuleById(id);
          if (cached) runner.invalidateModule(cached);
        }
      return [];
    },
  };
}

function cloudflareWorkersPrerenderStub() {
  return {
    name: "codersmill:cloudflare-workers-prerender",
    enforce: "pre",
    resolveId(source) {
      if (
        source === "cloudflare:workers" &&
        this.environment?.name === "prerender"
      )
        return stubId;
    },
    load(id) {
      if (id === stubId)
        return [
          "export const env = {};",
          "export const exports = {};",
          "export const cache = undefined;",
          "export function waitUntil() {}",
          "export class DurableObject {}",
          "export class WorkerEntrypoint {}",
          "export class RpcTarget {}",
        ].join("\n");
    },
  };
}

export default defineConfig({
  // CodersMill is hosted by Coders Mill at codersmill.com.
  site: "https://codersmill.com",
  // Pages are prerendered (static) unless they opt out with
  // `export const prerender = false`: EmDash's admin (/_emdash) and the blog,
  // which read the CMS on request, run in the Cloudflare Worker.
  output: "static",
  adapter: cloudflare({
    // Prerender (and, in dev, serve) the static pages in Node, so the builder
    // pages keep reading the project's files.
    prerenderEnvironment: "node",
  }),
  // No Astro dev toolbar on any page.
  devToolbar: { enabled: false },
  redirects: {
    "/about/": "/us/who-we-are/",
    "/blocks/": "/website-builder/display-blocks/",
    "/tools/": "/website-builder/",
    "/resources/docs/": "/docs/",
    "/pagebuilder/pagebuilder/": "/website-builder/page-builder/",
    "/themebuilder/colors/": "/website-builder/custom-colors/",
    "/website-builder/colors/": "/website-builder/custom-colors/",
    "/themebuilder/themebuilder/": "/website-builder/theme-builder/",
    "/typographybuilder/typograhybuilding/":
      "/website-builder/typography-builder/",
    "/website-builder/typograhybuilding/":
      "/website-builder/typography-builder/",
    "/website-builder/formbuilder/": "/website-builder/form-builder/",
    "/website-builder/pagebuilder/": "/website-builder/page-builder/",
    "/website-builder/sitenavbuilder/": "/website-builder/sitenav-builder/",
    "/website-builder/themebuilder/": "/website-builder/theme-builder/",
    "/website-builder/typographybuilder/":
      "/website-builder/typography-builder/",
  },
  integrations: [
    alpine({ entrypoint: "/src/entrypoint" }),
    react(),
    // EmDash, the CMS for the blog: content in D1 (DB), media in R2 (MEDIA),
    // both in wrangler.jsonc. Its schema and first post are in seed/seed.json.
    emdash({
      database: d1({ binding: "DB", session: "auto", coalesce: true }),
      storage: r2({ binding: "MEDIA" }),
      // Sign-in to the admin through Cloudflare Access (Google Workspace),
      // the "codersmill.com/_emdash/admin" Access application. EmDash checks
      // its token on every admin request in production; the first user to
      // sign in is the admin, matched to existing users by email. In dev,
      // EmDash's own session login (and dev bypass) still works.
      auth: access({
        teamDomain: "sonaventures.cloudflareaccess.com",
        // The application's Audience (AUD) tag: it identifies the app, and
        // is not a secret.
        audience:
          "e2311597b7e471a419866fa7137d84c222f31525d78170c1078d0f406e011137",
      }),
    }),
    partytown(),
    // Documentation at /docs/, from src/content/docs/docs/.
    starlight({
      title: "CodersMill Docs",
      // The CodersMill fonts and colors (src/styles/docs.css).
      customCss: ["./src/styles/docs.css"],
      // Links the docs' light / dark choice to the site's.
      components: {
        ThemeProvider: "./src/components/docs/ThemeProvider.astro",
      },
      logo: {
        light: "./src/assets/logos/codersmill-logo.svg",
        dark: "./src/assets/logos/codersmill-logo-dark.svg",
        alt: "CodersMill",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/sonaventures",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/docs/" },
        {
          label: "Website Builder",
          items: [{ autogenerate: { directory: "docs/website-builder" } }],
        },
      ],
      // The rest of the site keeps its own 404 page.
      disable404Route: true,
    }),
  ],
  vite: {
    plugins: [
      ignoreReplacedFileDeletes(),
      quietComponentSaves(),
      tailwindcss(),
      cloudflareWorkersPrerenderStub(),
    ],
    server: {
      watch: {
        // theme-groups.json is only read from disk (never imported), and the
        // .crswap files are Chrome's temporary copies while saving; watching
        // either made the dev server reload the whole page.
        ignored: ["**/src/styles/themes/theme-groups.json", "**/*.crswap"],
      },
    },
  },
});
