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
