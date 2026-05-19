#!/usr/bin/env bash
# Apply remote migrations and deploy all Edge Functions to the linked Supabase project.
# Prerequisites: npx supabase login && npx supabase link --project-ref <ref>
# Usage (from repo root): npm run deploy:supabase

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx not found (Node.js required)" >&2
  exit 1
fi

if [[ ! -d supabase/functions ]]; then
  echo "error: supabase/functions not found — run from the monorepo root" >&2
  exit 1
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-sgxtyxvithlmuuofkzlk}"

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "==> CI mode: linking project $PROJECT_REF..."
  if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
    echo "error: SUPABASE_DB_PASSWORD is required when SUPABASE_ACCESS_TOKEN is set" >&2
    exit 1
  fi
  export SUPABASE_ACCESS_TOKEN
  npx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
elif ! npx supabase projects list 2>/dev/null | grep -q '●'; then
  echo "warning: no linked project (●) in 'supabase projects list'." >&2
  echo "         Run: npx supabase login && npx supabase link --project-ref $PROJECT_REF" >&2
  echo "         Continuing anyway — db push / deploy will fail if not linked." >&2
fi

echo "==> Applying database migrations (supabase db push)..."
npx supabase db push

echo "==> Deploying Edge Functions..."
deployed=0
for dir in supabase/functions/*/; do
  name="$(basename "$dir")"

  if [[ "$name" == "_shared" ]]; then
    continue
  fi

  if [[ ! -f "${dir}index.ts" ]]; then
    continue
  fi

  echo "    → $name"
  npx supabase functions deploy "$name"
  deployed=$((deployed + 1))
done

if [[ "$deployed" -eq 0 ]]; then
  echo "warning: no functions deployed (expected index.ts under supabase/functions/<name>/)" >&2
  exit 1
fi

echo "==> Done. Deployed $deployed function(s). Optional: npm run verify:supabase"
