#!/usr/bin/env bash
# Schedule process-ai-job sweep every 3 minutes (pg_cron + pg_net).
#
# Prerequisites:
#   - Migration 20260520010000_enable_pg_cron_pg_net.sql applied (db push)
#   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in supabase/.env.local (for cron HTTP headers)
#   - Either: `npx supabase link` (recommended — no DATABASE_URL needed)
#     Or: DATABASE_URL in supabase/.env.local (must be pasted from Dashboard → Connect → URI)
#
# Usage (from repo root):
#   npm run setup:ai-job-cron
#
# Never commit the service role key. Run locally or in CI with secrets only.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"
# shellcheck source=scripts/lib/validate-database-url.sh
source "$ROOT/scripts/lib/validate-database-url.sh"

ENV_FILE="${SUPABASE_ENV_FILE:-supabase/.env.local}"
LINKED_REF_FILE="supabase/.temp/project-ref"

if [[ -f "$ENV_FILE" ]]; then
  load_env_file "$ENV_FILE"
fi

DATABASE_URL="${DATABASE_URL:-}"
SUPABASE_URL="${SUPABASE_URL:-${EXPO_PUBLIC_SUPABASE_URL:-}}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

USE_LINKED=false
if [[ -f "$LINKED_REF_FILE" ]]; then
  USE_LINKED=true
fi

if [[ -z "$SUPABASE_URL" || -z "$SERVICE_ROLE_KEY" ]]; then
  echo "error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required" >&2
  echo "       Add to $ENV_FILE or export before running:" >&2
  echo "         SUPABASE_URL=https://sgxtyxvithlmuuofkzlk.supabase.co" >&2
  echo "         SUPABASE_SERVICE_ROLE_KEY=...  (Dashboard → API → service_role)" >&2
  exit 1
fi

if [[ "$USE_LINKED" == false ]]; then
  if [[ -z "$DATABASE_URL" ]]; then
    echo "error: not linked and DATABASE_URL missing" >&2
    echo "       Option A (easiest): npx supabase login && npx supabase link --project-ref sgxtyxvithlmuuofkzlk" >&2
    echo "       Option B: add DATABASE_URL from Dashboard → Connect → URI (encoded password)" >&2
    exit 1
  fi

  if ! validate_database_url "$DATABASE_URL"; then
    exit 1
  fi
else
  echo "==> Using linked Supabase project ($(tr -d '\n' < "$LINKED_REF_FILE")) — DATABASE_URL not required."
fi

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
else
  SUPABASE_CMD=(npx supabase)
fi

# Escape single quotes for SQL string literals
SQL_URL="${SUPABASE_URL//\'/\'\'}"
SQL_KEY="${SERVICE_ROLE_KEY//\'/\'\'}"

SQL_FILE="$(mktemp -t tailo-ai-cron.XXXXXX.sql)"
trap 'rm -f "$SQL_FILE"' EXIT

cat >"$SQL_FILE" <<SQL
select cron.unschedule(jobid)
from cron.job
where jobname = 'tailo-process-ai-job-sweep';

select cron.schedule(
  'tailo-process-ai-job-sweep',
  '*/3 * * * *',
  \$\$
  select net.http_post(
    url := '${SQL_URL}/functions/v1/process-ai-job',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ${SQL_KEY}',
      'apikey', '${SQL_KEY}'
    ),
    body := '{"sweep":true,"max_jobs":5}'::jsonb,
    timeout_milliseconds := 120000
  ) as request_id;
  \$\$
);
SQL

run_cron_sql() {
  if [[ "$USE_LINKED" == true ]]; then
    echo "==> Running cron SQL via Supabase CLI (--linked)..."
    "${SUPABASE_CMD[@]}" db query -f "$SQL_FILE" --linked
    return
  fi

  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
    return
  fi

  echo "==> psql not found; using Supabase CLI (db query --db-url)..."
  "${SUPABASE_CMD[@]}" db query -f "$SQL_FILE" --db-url "$DATABASE_URL"
}

echo "==> Scheduling tailo-process-ai-job-sweep (every 3 minutes)..."
run_cron_sql

echo "==> Done. Verify in Dashboard → SQL editor, or:"
echo "    npx supabase db query \"select jobid, jobname, schedule, active from cron.job where jobname = 'tailo-process-ai-job-sweep';\" --linked"
