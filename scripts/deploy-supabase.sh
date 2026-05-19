#!/usr/bin/env bash
# Apply remote migrations and deploy all Edge Functions to the linked Supabase project.
# Prerequisites: supabase login && supabase link --project-ref <ref>
# Usage (from repo root): npm run deploy:supabase
#
# CI: uses supabase from supabase/setup-cli on PATH (not npx — avoids duplicate CLI + upgrade noise).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d supabase/functions ]]; then
  echo "error: supabase/functions not found — run from the monorepo root" >&2
  exit 1
fi

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
elif command -v npx >/dev/null 2>&1; then
  SUPABASE_CMD=(npx supabase)
else
  echo "error: install Supabase CLI (https://supabase.com/docs/guides/cli) or run from repo with npm ci" >&2
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
  "${SUPABASE_CMD[@]}" link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
elif ! "${SUPABASE_CMD[@]}" projects list 2>/dev/null | grep -q '●'; then
  echo "warning: no linked project (●) in 'supabase projects list'." >&2
  echo "         Run: supabase login && supabase link --project-ref $PROJECT_REF" >&2
  echo "         Continuing anyway — db push / deploy will fail if not linked." >&2
fi

echo "==> Applying database migrations (supabase db push)..."
"${SUPABASE_CMD[@]}" db push

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
  if [[ "$name" == "process-ai-job" ]]; then
    # Allow sync-event to invoke with service role (gateway JWT check off; in-function auth).
    "${SUPABASE_CMD[@]}" functions deploy "$name" --no-verify-jwt
  else
    "${SUPABASE_CMD[@]}" functions deploy "$name"
  fi
  deployed=$((deployed + 1))
done

if [[ "$deployed" -eq 0 ]]; then
  echo "warning: no functions deployed (expected index.ts under supabase/functions/<name>/)" >&2
  exit 1
fi

echo "==> Done. Deployed $deployed function(s). Optional: npm run verify:supabase"
