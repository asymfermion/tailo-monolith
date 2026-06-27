#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANDING_DIR="$ROOT_DIR/apps/landing"

if [[ ! -f "$LANDING_DIR/vercel.json" ]]; then
  echo "Missing apps/landing/vercel.json; refusing to deploy from the monorepo root." >&2
  exit 1
fi

cd "$LANDING_DIR"

if [[ ! -f ".vercel/project.json" ]]; then
  echo "apps/landing is not linked to Vercel yet." >&2
  echo "Run: npx vercel link --yes --project tailo-web" >&2
  exit 1
fi

npm run build
if [[ -n "${VERCEL_SCOPE:-}" ]]; then
  npx vercel deploy --prod --yes --scope "$VERCEL_SCOPE" "$@"
else
  npx vercel deploy --prod --yes "$@"
fi
