/** @param {string} input */
export function googleFontIds(input) {
  const names = input
    .split(/[,\r\n]+/)
    .map((name) => name.trim())
    .filter(Boolean);
  if (!names.length)
    throw new Error("Enter at least one Google Font family name.");
  if (names.some((name) => !/^[a-z0-9][a-z0-9 -]{0,99}$/i.test(name))) {
    throw new Error(
      "Use font family names only: letters, numbers, spaces, and hyphens.",
    );
  }
  return [
    ...new Set(
      names.map((name) =>
        name.toLowerCase().replace(/[ -]+/g, "-").replace(/-$/, ""),
      ),
    ),
  ];
}
