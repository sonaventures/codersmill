import {
  parseThemeGroups,
  removeThemeGroupJson,
  upsertThemeGroupJson,
  type ThemeGroup,
} from "../../data/website-builder/theme-groups";
import { removeGroupCss, upsertGroupCss } from "../../data/website-builder/group-classes";

// Finds src/styles/themes in a folder chosen with the browser's folder picker.
// Accepts the project root or its src, styles or themes folder, because the
// Linux folder dialog often returns a highlighted subfolder.
const themesPath = ["src", "styles", "themes"];

export async function themesDirectory(
  selected: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  const start = themesPath.indexOf(selected.name);
  let folder = selected;
  try {
    for (const name of themesPath.slice(start + 1))
      folder = await folder.getDirectoryHandle(name);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "NotFoundError" || error.name === "TypeMismatchError")
    )
      throw new Error(
        `"${selected.name}" does not contain src/styles/themes. Choose the websitebuilder project folder (the one that contains src and public).`,
      );
    throw error;
  }
  return folder;
}

export async function chooseThemesDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!("showDirectoryPicker" in window))
    throw new Error(
      "This browser does not support project folder access. Use Chrome or Edge on localhost or HTTPS.",
    );
  const picker = (
    window as unknown as {
      showDirectoryPicker(options: object): Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  return themesDirectory(
    await picker({ id: "websitebuilder-project", mode: "readwrite" }),
  );
}

// The chosen src/styles/themes folder is remembered in this browser so later
// saves can write without asking again (the browser may ask to confirm).
const folderDatabase = "website-builder-project-folder";
const folderKey = "themes";

function folderStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(folderDatabase, 1);
    open.onupgradeneeded = () => open.result.createObjectStore("folders");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction("folders", mode);
      const request = operation(transaction.objectStore("folders"));
      transaction.oncomplete = () => {
        database.close();
        resolve(request.result);
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? request.error);
      };
    };
  });
}

type PermissionHandle = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
};

/**
 * The project's src/styles/themes folder: the remembered one when this
 * browser still has (or is granted) access, otherwise the folder picker.
 * Must be called from a click so the browser may show its prompts.
 */
export async function getThemesFolder(): Promise<FileSystemDirectoryHandle> {
  try {
    const saved = (await folderStore("readonly", (store) =>
      store.get(folderKey),
    )) as PermissionHandle | undefined;
    if (saved) {
      const mode = { mode: "readwrite" } as const;
      if (
        (await saved.queryPermission(mode)) === "granted" ||
        (await saved.requestPermission(mode)) === "granted"
      )
        return saved;
    }
  } catch (error) {
    console.warn("Could not use the remembered project folder:", error);
  }
  const folder = await chooseThemesDirectory();
  await folderStore("readwrite", (store) => store.put(folder, folderKey)).catch(
    (error) => console.warn("Could not remember the project folder:", error),
  );
  return folder;
}

/** Reads a text file in `folder`, or "" when it does not exist yet. */
export async function readTextFile(
  folder: FileSystemDirectoryHandle,
  name: string,
): Promise<string> {
  try {
    return await (await (await folder.getFileHandle(name)).getFile()).text();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError")
      return "";
    throw error;
  }
}

export async function writeTextFile(
  folder: FileSystemDirectoryHandle,
  name: string,
  content: string,
): Promise<void> {
  const file = await folder.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(content);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => undefined);
    throw error;
  }
}

export const themeGroupsFile = "theme-groups.json";

/**
 * Theme groups saved in the project (src/styles/themes/theme-groups.json),
 * served by /website-builder/theme-groups.json. Empty if unavailable.
 */
export async function fetchProjectThemeGroups(): Promise<ThemeGroup[]> {
  try {
    const response = await fetch("/website-builder/theme-groups.json", {
      cache: "no-store",
    });
    if (!response.ok) return [];
    return parseThemeGroups(await response.text());
  } catch (error) {
    console.warn("Could not read the project's theme groups:", error);
    return [];
  }
}

/** Writes the group's classes to groups.css and its data to theme-groups.json. */
export async function saveGroupToProject(
  folder: FileSystemDirectoryHandle,
  group: ThemeGroup,
): Promise<void> {
  const css = await readTextFile(folder, "groups.css");
  const json = await readTextFile(folder, themeGroupsFile);
  await writeTextFile(folder, "groups.css", upsertGroupCss(css, group));
  await writeTextFile(
    folder,
    themeGroupsFile,
    upsertThemeGroupJson(json, group),
  );
}

/** Removes the group from groups.css and theme-groups.json. */
export async function removeGroupFromProject(
  folder: FileSystemDirectoryHandle,
  group: ThemeGroup,
): Promise<void> {
  const css = await readTextFile(folder, "groups.css");
  const json = await readTextFile(folder, themeGroupsFile);
  await writeTextFile(folder, "groups.css", removeGroupCss(css, group.name));
  await writeTextFile(
    folder,
    themeGroupsFile,
    removeThemeGroupJson(json, group.id),
  );
}
