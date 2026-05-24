#!/usr/bin/env bash
# Push auth email templates from supabase/templates/ to the linked hosted project.
# Requires: npx supabase login && npx supabase link --project-ref sgxtyxvithlmuuofkzlk
set -euo pipefail

# shellcheck source=lib/supabase-monorepo-cli.sh
source "$(cd "$(dirname "$0")" && pwd)/lib/supabase-monorepo-cli.sh"
supabase_monorepo_init

if [[ ! -d "$SUPABASE_DIR/templates" ]]; then
  echo "error: supabase/templates not found — run from the monorepo root" >&2
  exit 1
fi

supabase_require_linked_project

node scripts/verify-supabase-email-templates.mjs
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  supabase_cli --yes config push
else
  supabase_cli config push --yes
fi

echo "Auth email templates pushed to linked Supabase project."
