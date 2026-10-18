#!/usr/bin/env bash
# Build the package, install its tarball into the example, then build, start and
# smoke-test the example once per twin URL style. Run from the repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="$ROOT/examples/app-router"
PORT="${PORT:-3123}"

cd "$ROOT"
npm run build
rm -rf "$APP/.pack" && mkdir -p "$APP/.pack"
npm pack --silent --pack-destination "$APP/.pack" >/dev/null

cd "$APP"
npm ci --no-audit --no-fund
npm install --no-save --no-audit --no-fund ./.pack/next-agent-twin-*.tgz

for style in index suffix; do
  rm -rf .next
  TWIN_STYLE="$style" npx next build
  TWIN_STYLE="$style" npx next start -p "$PORT" &
  pid=$!
  trap 'kill $pid 2>/dev/null || true' EXIT
  for _ in $(seq 1 60); do
    curl -fsS -o /dev/null "http://localhost:$PORT/llms.txt" && break
    sleep 0.5
  done
  node scripts/smoke.mjs "http://localhost:$PORT" "$style"
  kill "$pid"; wait "$pid" 2>/dev/null || true
done
