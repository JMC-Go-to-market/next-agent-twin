import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS, docAt } from "../../../content/pages";
import { twins } from "../../../lib/twins";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.path.split("/").pop() }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = docAt((await params).slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.description, alternates: twins.alternates(doc.path) };
}

export default async function DocPage({ params }: Props) {
  const doc = docAt((await params).slug);
  if (!doc) notFound();
  return (
    <main>
      <h1>{doc.title}</h1>
      <p>{doc.description}</p>
    </main>
  );
}
