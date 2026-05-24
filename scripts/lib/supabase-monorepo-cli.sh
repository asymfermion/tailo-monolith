# Shared Supabase CLI helpers for this monorepo.
# shellcheck shell=bash
#
# The CLI loads supabase/config.toml from the repo root but resolves
# auth template content_path values against the repo root too. An ephemeral
# templates -> supabase/templates symlink satisfies both config validation and
# linked-project discovery (supabase/.temp/project-ref) without --workdir,
# which breaks `db push --linked` in current CLI versions.

supabase_monorepo_init() {
  ROOT="$(cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd)"
  SUPABASE_DIR="$ROOT/supabase"
  SUPABASE_TEMPLATES_LINK="$ROOT/templates"
  SYMLINK_CREATED=0

  cd "$ROOT"

  if [[ ! -d "$SUPABASE_DIR" ]]; then
    echo "error: supabase/ not found — run from the monorepo root" >&2
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

  trap supabase_monorepo_cleanup EXIT

  if [[ -e "$SUPABASE_TEMPLATES_LINK" && ! -L "$SUPABASE_TEMPLATES_LINK" ]]; then
    echo "error: $SUPABASE_TEMPLATES_LINK exists and is not a symlink to supabase/templates" >&2
    exit 1
  fi

  if [[ ! -e "$SUPABASE_TEMPLATES_LINK" ]]; then
    ln -sf supabase/templates "$SUPABASE_TEMPLATES_LINK"
    SYMLINK_CREATED=1
  fi
}

supabase_monorepo_cleanup() {
  if [[ "${SYMLINK_CREATED:-0}" == 1 ]]; then
    rm -f "${SUPABASE_TEMPLATES_LINK:-}"
  fi
}

supabase_cli() {
  "${SUPABASE_CMD[@]}" "$@"
}

supabase_linked_project_ref() {
  local ref="${SUPABASE_PROJECT_REF:-}"
  if [[ -z "$ref" && -f "$SUPABASE_DIR/.temp/project-ref" ]]; then
    ref="$(tr -d '[:space:]' < "$SUPABASE_DIR/.temp/project-ref")"
  fi
  printf '%s' "$ref"
}

supabase_require_linked_project() {
  local ref
  ref="$(supabase_linked_project_ref)"
  if [[ -z "$ref" ]]; then
    echo "error: no linked Supabase project." >&2
    echo "       Run: supabase login && supabase link --project-ref <ref>" >&2
    echo "       Or set SUPABASE_PROJECT_REF." >&2
    exit 1
  fi
  echo "==> Using linked project: $ref"
}

supabase_link_for_ci() {
  local project_ref="${SUPABASE_PROJECT_REF:-sgxtyxvithlmuuofkzlk}"
  if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    return 0
  fi
  if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
    echo "error: SUPABASE_DB_PASSWORD is required when SUPABASE_ACCESS_TOKEN is set" >&2
    exit 1
  fi
  echo "==> CI mode: linking project $project_ref..."
  export SUPABASE_ACCESS_TOKEN
  supabase_cli link --project-ref "$project_ref" --password "$SUPABASE_DB_PASSWORD"
}
