import type { Metadata } from "next";
import { pageAt } from "../../content/pages";
import { twins } from "../../lib/twins";

const page = pageAt("/about")!;

// Emits <link rel="canonical"> and <link rel="alternate" type="text/markdown" href=".../about/index.md">.
export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: twins.alternates("/about", { "text/plain": "https://example.com/llms.txt" }),
};

export default function AboutPage() {
  return (
    <main>
      <h1>{page.title}</h1>
      <p>{page.description}</p>
    </main>
  );
}
