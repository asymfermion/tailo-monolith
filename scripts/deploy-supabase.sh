#!/usr/bin/env bash
# Apply remote migrations and deploy all Edge Functions to the linked Supabase project.
# Prerequisites: supabase login && supabase link --project-ref <ref>
# Usage (from repo root): npm run deploy:supabase
#
# CI: uses supabase from supabase/setup-cli on PATH (not npx — avoids duplicate CLI + upgrade noise).

set -euo pipefail

# shellcheck source=lib/supabase-monorepo-cli.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/supabase-monorepo-cli.sh"
supabase_monorepo_init

if [[ ! -d "$SUPABASE_DIR/functions" ]]; then
  echo "error: supabase/functions not found — run from the monorepo root" >&2
  exit 1
fi

supabase_link_for_ci

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  supabase_require_linked_project
fi

echo "==> Applying database migrations (supabase db push)..."
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  supabase_cli --yes db push --linked
else
  supabase_cli db push --linked
fi

echo "==> Deploying Edge Functions..."
deployed=0
for dir in "$SUPABASE_DIR"/functions/*/; do
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
    if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
      supabase_cli --yes functions deploy "$name" --no-verify-jwt
    else
      supabase_cli functions deploy "$name" --no-verify-jwt
    fi
  elif [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    supabase_cli --yes functions deploy "$name"
  else
    supabase_cli functions deploy "$name"
  fi
  deployed=$((deployed + 1))
done

if [[ "$deployed" -eq 0 ]]; then
  echo "warning: no functions deployed (expected index.ts under supabase/functions/<name>/)" >&2
  exit 1
fi

echo "==> Done. Deployed $deployed function(s). Optional: npm run verify:supabase"
