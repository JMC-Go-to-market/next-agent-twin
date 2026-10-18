import { DOCS, docAt } from "../../../../content/pages";
import { twins } from "../../../../lib/twins";

// Markdown twin of /docs/[slug]. Unknown slugs answer the package's plain-text 404.
export const dynamic = "force-static";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.path.split("/").pop() }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = docAt(slug);
  const body = doc
    ? twins.document({ title: doc.title, path: doc.path, facts: { "Last updated": doc.updated }, body: doc.body })
    : null;
  return twins.response(body, `/docs/${slug}`);
}
