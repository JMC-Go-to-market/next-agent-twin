import type { Metadata } from "next";
import { pageAt } from "../content/pages";
import { twins } from "../lib/twins";

const page = pageAt("/")!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: twins.alternates("/", { "text/plain": "https://example.com/llms.txt" }),
};

export default function HomePage() {
  return (
    <main>
      <h1>{page.title}</h1>
      <p>{page.description}</p>
    </main>
  );
}
