# Maintaining

## Origin

Extracted in October 2026 from the agent-twin code that three production Next.js sites had each grown on their own. The package took the most complete of the three as its base (the one with Accept negotiation, `Vary` and `rel=alternate`) and generalised it; the other two contributed the `{path}.md` URL style, the optional `noindex` and Cache-Control, the document frame and the llms.txt link helper. Site-specific parts (data loading, page-type renderers, copy) stayed in the sites. The sites keep their own copies, so the two may drift; changes here are not synced back automatically.

## Checks

- `npm run check`: lint, typecheck, unit tests. Hermetic: no network, no env.
- `npm run smoke`: builds and starts the example app with Next for both URL styles and checks the responses over HTTP.
- `npm run secrets`: secretlint over the tree.

CI runs all three.

## Next.js versions

`NEXT_ROUTER_VARY` in `src/next.ts` lists Next 16's App Router request headers. When Next changes them, update that constant and the peer range together.

## Releasing

The package is `@jmc-gtm/next-agent-twin` on npm (org `jmc-gtm`, free plan, public).

1. Bump `version` in package.json and merge.
2. Tag the merge commit `v<version>` and push the tag.
3. `.github/workflows/release.yml` runs the checks and **stages** the release through npm trusted publishing (GitHub OIDC), with provenance. No npm token exists in the repo, the vault or Actions secrets.
4. A maintainer approves the staged release on npmjs.com (the package → staged releases) or with `npm stage approve <stage-id>`, using 2FA. Nothing goes live without that step.

The trusted publisher is set on npmjs.com → the package → Settings → Trusted publishing: GitHub Actions, repository `JMC-Go-to-market/next-agent-twin`, workflow `release.yml`, environment `npm`, allowed action: stage publish only (direct publish and dist-tag are off).
