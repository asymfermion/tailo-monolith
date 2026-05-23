#!/usr/bin/env bash
# Push auth email templates from supabase/templates/ to the linked hosted project.
# Requires: npx supabase login && npx supabase link --project-ref sgxtyxvithlmuuofkzlk
#
# Uses --workdir supabase so config.toml content_path values (templates/*.html)
# resolve to supabase/templates/ without a repo-root templates/ symlink.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUPABASE_DIR="$ROOT/supabase"
cd "$ROOT"

if [[ ! -d "$SUPABASE_DIR/templates" ]]; then
  echo "error: supabase/templates not found — run from the monorepo root" >&2
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

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [[ -z "$PROJECT_REF" && -f "$SUPABASE_DIR/.temp/project-ref" ]]; then
  PROJECT_REF="$(tr -d '[:space:]' < "$SUPABASE_DIR/.temp/project-ref")"
fi

if [[ -z "$PROJECT_REF" ]]; then
  echo "error: no linked project ref. Run: supabase link --project-ref <ref>" >&2
  echo "       Or set SUPABASE_PROJECT_REF." >&2
  exit 1
fi

node scripts/verify-supabase-email-templates.mjs
"${SUPABASE_CMD[@]}" --workdir "$SUPABASE_DIR" config push --yes --project-ref "$PROJECT_REF"

echo "Auth email templates pushed to linked Supabase project."
