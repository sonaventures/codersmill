import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Serves src/styles/themes/sitewide.css to the Theme Builder. It is read on
// each request in development (not imported), so saving the file never
// reloads an open builder page.
export async function GET() {
  let body = "";
  try {
    body = await readFile(
      join(process.cwd(), "src/styles/themes/sitewide.css"),
      "utf8",
    );
  } catch {
    // No sitewide styles saved yet.
  }
  return new Response(body, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
