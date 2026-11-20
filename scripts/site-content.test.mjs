import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), "utf8");

test("all approved page routes exist", async () => {
  const routes = [
    "src/pages/index.astro",
    "src/pages/companies.astro",
    "src/pages/projects.astro",
    "src/pages/partners.astro",
    "src/pages/about.astro",
    "src/pages/template.astro",
    "src/pages/website-builder/custom-colors.astro",
    "src/pages/website-builder/theme-builder.astro",
    "src/pages/website-builder/page-builder.astro",
    "src/pages/website-builder/typography-builder.astro",
  ];

  for (const route of routes) {
    await assert.doesNotReject(readProjectFile(route), `${route} should exist`);
  }
});

test("company destinations remain configurable and deferred", async () => {
  const directory = await readProjectFile("src/data/group.ts");

  for (const name of [
    "Exclusive House Cleaning",
    "Exclusive Home Remodeling",
    "Exclusive Recycling",
    "Exclusive Carpet Cleaning",
  ]) {
    assert.ok(directory.includes(name), `${name} should be listed`);
  }

  assert.equal((directory.match(/websiteUrl: null/g) ?? []).length, 4);
});

test("company, project, and partner content have a shared data source", async () => {
  const [directory, companiesPage, projectsPage, partnersPage] =
    await Promise.all([
      readProjectFile("src/data/group.ts"),
      readProjectFile("src/pages/companies.astro"),
      readProjectFile("src/pages/projects.astro"),
      readProjectFile("src/pages/partners.astro"),
    ]);

  assert.match(directory, /export const projects: Project\[\] = \[\]/);
  assert.match(directory, /export const partners: Partner\[\] = \[\]/);
  assert.match(companiesPage, /from "\.\.\/data\/group"/);
  assert.match(projectsPage, /projects\.map/);
  assert.match(partnersPage, /partners\.map/);
});

test("empty content states do not invent projects or contact routes", async () => {
  const [projects, partners] = await Promise.all([
    readProjectFile("src/pages/projects.astro"),
    readProjectFile("src/pages/partners.astro"),
  ]);

  assert.match(projects, /No projects published yet/);
  assert.match(partners, /contact route have not been provided/);
  assert.doesNotMatch(partners, /mailto:|tel:/);
});

test("site metadata and copy are group-specific", async () => {
  const [layout, footer] = await Promise.all([
    readProjectFile("src/layouts/layout.astro"),
    readProjectFile("src/components/SiteFooter.astro"),
  ]);

  assert.match(layout, /Exclusive Group/);
  assert.match(footer, /Exclusive Group/);
  assert.doesNotMatch(layout, /LocalBusiness|telephone|address/);
  assert.doesNotMatch(footer, /BBB|Patch|703/);
});
