#!/usr/bin/env bash
# Build the package, install its tarball into the example, then build, start and
# smoke-test the example once per twin URL style. Run from the repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="$ROOT/examples/app-router"
BASE_PORT="${PORT:-3123}"

cd "$ROOT"
npm run build
rm -rf "$APP/.pack" && mkdir -p "$APP/.pack"
npm pack --silent --pack-destination "$APP/.pack" >/dev/null

cd "$APP"
npm ci --no-audit --no-fund
npm install --no-save --no-audit --no-fund ./.pack/next-agent-twin-*.tgz

port="$BASE_PORT"
for style in index suffix; do
  # A fresh port per style, so a server that outlives its kill can never answer for the next build.
  port=$((port + 1))
  rm -rf .next
  TWIN_STYLE="$style" ./node_modules/.bin/next build
  TWIN_STYLE="$style" ./node_modules/.bin/next start -p "$port" &
  pid=$!
  trap 'kill $pid 2>/dev/null || true' EXIT
  for _ in $(seq 1 60); do
    curl -fsS -o /dev/null "http://localhost:$port/llms.txt" && break
    sleep 0.5
  done
  node scripts/smoke.mjs "http://localhost:$port" "$style"
  kill "$pid"; wait "$pid" 2>/dev/null || true
done
