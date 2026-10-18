import { pageAt } from "../../content/pages";
import { twins } from "../../lib/twins";

// Markdown twin of the home page.
export const dynamic = "force-static";

export function GET() {
  const page = pageAt("/");
  const body = page
    ? twins.document({ title: page.title, path: page.path, facts: { "Last updated": page.updated }, body: page.body })
    : null;
  return twins.response(body, "/");
}
