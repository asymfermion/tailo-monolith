#!/usr/bin/env bash
# B2.6.3 — Dependency audit for monorepo packages used by Edge Functions (Deno npm: imports).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== npm audit (root workspaces; includes @supabase/supabase-js, @tailo/shared, @tailo/backend-core, @tailo/ai) ==="
npm audit --audit-level=moderate

echo ""
echo "Edge Functions import pinned npm packages via each function's deno.json."
echo "Re-run after changing package.json or deno.json import maps."
echo "See supabase/STAGING_CHECKLIST.md before promoting to staging/prod."
