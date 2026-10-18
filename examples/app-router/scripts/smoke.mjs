// Smoke test against a running build: node scripts/smoke.mjs <base-url> <index|suffix>
import assert from "node:assert/strict";
import { lintLlmsTxt } from "next-agent-twin";

const [base, style] = process.argv.slice(2);
const SITE = "https://example.com";
const twin = (path) => (path === "/" ? "/index.md" : style === "suffix" ? `${path}.md` : `${path}/index.md`);
let checks = 0;

async function get(path, accept) {
  const res = await fetch(base + path, { headers: accept ? { accept } : {}, redirect: "manual" });
  return { status: res.status, h: res.headers, body: await res.text() };
}

function isTwin(r, page, title) {
  assert.equal(r.status, 200, `${page}: status`);
  assert.equal(r.h.get("content-type"), "text/markdown; charset=utf-8", `${page}: content-type`);
  assert.equal(r.h.get("link"), `<${page === "/" ? SITE : SITE + page}>; rel="canonical"`, `${page}: link`);
  assert.match(r.h.get("vary") ?? "", /\bAccept\b/, `${page}: vary`);
  assert.ok(r.body.startsWith(`# ${title}\n\nURL: `), `${page}: body starts with title`);
  checks++;
}

const pages = [
  ["/", "Example Co"],
  ["/about", "About Example Co"],
  ["/docs/getting-started", "Getting started"],
];

for (const [page, title] of pages) {
  // Public twin URL in this style.
  isTwin(await get(twin(page)), page, title);
  // Same page URL, negotiated by Accept.
  isTwin(await get(page, "text/markdown"), page, title);
  // Browsers get HTML that varies on Accept and links the twin.
  const html = await get(page, "text/html");
  assert.equal(html.status, 200, `${page}: html status`);
  assert.match(html.h.get("content-type") ?? "", /^text\/html/, `${page}: html content-type`);
  assert.match(html.h.get("vary") ?? "", /\bAccept\b/, `${page}: html vary`);
  const alt = `<link rel="alternate" type="text/markdown" href="${SITE}${twin(page)}"/>`;
  assert.ok(html.body.includes(alt), `${page}: html has ${alt}`);
  checks++;
}

// A twin route with no content answers the package's plain-text 404.
for (const r of [await get(twin("/docs/missing")), await get("/docs/missing", "text/markdown")]) {
  assert.equal(r.status, 404, "missing doc twin: status");
  assert.match(r.h.get("content-type") ?? "", /^text\/plain/, "missing doc twin: content-type");
  checks++;
}

const llms = await get("/llms.txt");
assert.equal(llms.status, 200, "llms.txt status");
assert.match(llms.h.get("content-type") ?? "", /^text\/plain/, "llms.txt content-type");
assert.deepEqual(lintLlmsTxt(llms.body), [], "llms.txt lint");
assert.ok(llms.body.includes(`(${SITE}${twin("/about")})`), "llms.txt links the twin");
checks++;

console.log(`smoke ${style}: ${checks} checks passed`);
