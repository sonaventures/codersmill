import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Serves the project's saved theme groups to the builders. It is read on each
// request in development (not imported), so saving the file never reloads an
// open builder page.
export async function GET() {
  let body = '{"version":17,"groups":[]}';
  try {
    body = await readFile(
      join(process.cwd(), "src/styles/themes/theme-groups.json"),
      "utf8",
    );
  } catch {
    // No groups saved to the project yet.
  }
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
