// llms.txt and llms-full.txt (https://llmstxt.org): an H1, an optional blockquote
// summary, optional detail prose, then H2 sections of "- [name](url): description"
// links. A section named "Optional" holds links an agent may skip; it comes last.

export type LlmsLink = { title: string; url: string; description?: string };
export type LlmsSection = { title: string; links: LlmsLink[] };

export type LlmsTxtInput = {
  title: string;
  /** One-line summary, rendered as a blockquote. */
  summary?: string;
  /** Free Markdown between the summary and the sections (no headings). */
  details?: string;
  sections: LlmsSection[];
  /** Links an agent can skip when context is short; rendered as the "Optional" section, last. */
  optional?: LlmsLink[];
};

export type LlmsFullInput = {
  title: string;
  summary?: string;
  docs: { title: string; url: string; body: string; facts?: Record<string, string> }[];
};

const escapeLinkText = (s: string) => s.replace(/([[\]])/g, "\\$1");
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

function linkLine({ title, url, description }: LlmsLink): string {
  const d = description ? oneLine(description) : "";
  return `- [${escapeLinkText(oneLine(title))}](${url})${d ? `: ${d}` : ""}`;
}

function section(title: string, links: LlmsLink[]): string {
  return `## ${title}\n\n${links.map(linkLine).join("\n")}`;
}

export function buildLlmsTxt({ title, summary, details, sections, optional }: LlmsTxtInput): string {
  const parts = [`# ${oneLine(title)}`];
  if (summary) parts.push(`> ${oneLine(summary)}`);
  if (details?.trim()) parts.push(details.trim());
  for (const s of sections) if (s.links.length) parts.push(section(s.title, s.links));
  if (optional?.length) parts.push(section("Optional", optional));
  return `${parts.join("\n\n")}\n`;
}

/** Every document in full, for agents that want the whole corpus in one fetch. */
export function buildLlmsFullTxt({ title, summary, docs }: LlmsFullInput): string {
  const parts = [`# ${oneLine(title)}`];
  if (summary) parts.push(`> ${oneLine(summary)}`);
  for (const d of docs) {
    const head = [`URL: ${d.url}`, ...Object.entries(d.facts ?? {}).map(([k, v]) => `${k}: ${v}`)];
    parts.push(`---\n\n## ${oneLine(d.title)}\n\n${head.join("\n")}\n\n${d.body.trim()}`);
  }
  return `${parts.join("\n\n")}\n`;
}

/** Longest text used whole as a link name. */
const NAME_MAX = 80;
const linkable = (name: string) => name.length <= NAME_MAX && !/[[\]]/.test(name);

function linkPath(origin: string, path: string, text: string): string {
  const url = `${origin}${path}`;
  const split = text.indexOf(": ");
  if (split > 0 && linkable(text.slice(0, split)))
    return `- [${text.slice(0, split)}](${url}): ${text.slice(split + 2)}`;
  if (linkable(text)) return `- [${text}](${url})`;
  return `- [${path}](${url}): ${text}`;
}

/**
 * Turn hand-written page bullets into llmstxt.org links without dropping a word:
 * "- /path - text" and "- Name: /path". Anything else is returned unchanged
 * (URL patterns with a <placeholder>, prose, headings, lines already linked).
 */
export function linkifyLlmsBullets(body: string, origin: string): string {
  const o = origin.replace(/\/+$/, "");
  return body
    .split("\n")
    .map((line) => {
      const page = line.match(/^- (\/[^\s<>]*) - (.+)$/);
      if (page) return linkPath(o, page[1]!, page[2]!);
      const named = line.match(/^- ([^:/[\]<>]+): (\/[^\s<>]*)$/);
      if (named) return `- [${named[1]}](${o}${named[2]})`;
      return line;
    })
    .join("\n");
}

/** Structural problems in an llms.txt body; an empty list means it follows the llmstxt.org shape. */
export function lintLlmsTxt(text: string): string[] {
  const problems: string[] = [];
  const lines = text.split("\n");
  if (!/^# \S/.test(lines[0] ?? "")) problems.push("first line must be an H1 (# Title)");
  const h1s = lines.filter((l) => /^# /.test(l)).length;
  if (h1s > 1) problems.push(`exactly one H1 expected, found ${h1s}`);
  const h2 = lines.map((l, i) => [l, i] as const).filter(([l]) => /^## /.test(l));
  if (!h2.length) problems.push("no H2 sections");
  const optionalAt = h2.findIndex(([l]) => l.trim() === "## Optional");
  if (optionalAt !== -1 && optionalAt !== h2.length - 1) problems.push('"## Optional" must be the last section');
  const firstH2 = h2[0]?.[1] ?? lines.length;
  if (lines.slice(1, firstH2).some((l) => /^#{3,} /.test(l))) problems.push("headings before the first H2 section");
  lines.forEach((l, i) => {
    if (i < firstH2) return;
    const url = l.match(/^- \[[^\]]*\]\(([^)]*)\)/)?.[1];
    if (url !== undefined && !/^https?:\/\//.test(url))
      problems.push(`line ${i + 1}: link URL is not absolute: ${url}`);
  });
  return problems;
}
