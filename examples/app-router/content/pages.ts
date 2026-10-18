// The example's page data. In a real app this is whatever the HTML page already reads
// (MDX, a CMS, a database); the twin renders the same data as Markdown.

export type Page = { path: string; title: string; description: string; body: string; updated: string };

export const PAGES: Page[] = [
  {
    path: "/",
    title: "Example Co",
    description: "Example Co makes example widgets.",
    body: "## What we do\n\nWe make example widgets for example teams.",
    updated: "2026-10-01",
  },
  {
    path: "/about",
    title: "About Example Co",
    description: "Who we are and how we work.",
    body: "## Who we are\n\nA small team that writes clear documentation.\n\n## How we work\n\nIn the open.",
    updated: "2026-10-02",
  },
];

export const pageAt = (path: string) => PAGES.find((p) => p.path === path) ?? null;

export const DOCS: Page[] = [
  {
    path: "/docs/getting-started",
    title: "Getting started",
    description: "Install and first steps.",
    body: "## Install\n\nRun the installer.\n\n## First steps\n\nOpen the app.",
    updated: "2026-10-03",
  },
];

export const docAt = (slug: string) => DOCS.find((d) => d.path === `/docs/${slug}`) ?? null;
