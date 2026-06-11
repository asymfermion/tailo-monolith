#!/usr/bin/env bash
# EAS Build + Submit for Tailo iOS (TestFlight / App Store).
#
# Prerequisites:
#   - Free Expo account: https://expo.dev/signup (required for EAS cloud builds)
#   - Apple Developer Program membership
#   - App Store Connect app for bundle id com.mtxforge.tailo
#
# Usage (from repo root):
#   npm run eas:ios -- setup
#   npm run eas:ios -- secrets --environment production
#   npm run eas:ios -- build [--profile production|preview|development]
#   npm run eas:ios -- submit [--profile production] [--latest|--id BUILD_ID]
#   npm run eas:ios -- release   # production build + submit --latest
#   npm run eas:ios -- credentials
#
# Env files (gitignored):
#   apps/mobile/.env.local       — EXPO_PUBLIC_SUPABASE_* (used by secrets + local dev)
#   apps/mobile/eas.local.env    — optional ASC_APP_ID, APPLE_TEAM_ID for submit

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"

# shellcheck source=lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"

load_env_file "$MOBILE/.env.local"
load_env_file "$MOBILE/eas.local.env"

EAS=(npx --yes eas-cli@16.17.4)

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: missing required command: $1" >&2
    exit 1
  fi
}

require_eas_login() {
  if ! "${EAS[@]}" whoami >/dev/null 2>&1; then
    echo "error: not logged in to Expo. Run:" >&2
    echo "  ${EAS[*]} login" >&2
    echo "" >&2
    echo "You need a free Expo account for EAS Build — https://expo.dev/signup" >&2
    exit 1
  fi
}

has_eas_project() {
  node -e "
    const fs = require('fs');
    const app = JSON.parse(fs.readFileSync('$MOBILE/app.json', 'utf8'));
    process.exit(app?.expo?.extra?.eas?.projectId ? 0 : 1);
  " 2>/dev/null
}

cmd_setup() {
  require_cmd node
  require_cmd npm
  require_eas_login

  echo "==> Expo account"
  "${EAS[@]}" whoami

  cd "$MOBILE"

  if ! has_eas_project; then
    echo "==> Linking this app to an EAS project (creates project on expo.dev)..."
    "${EAS[@]}" init
  else
    echo "==> EAS project already linked in app.json"
  fi

  cat <<'EOF'

Next steps:
  1. Create the App Store Connect app (bundle id com.mtxforge.tailo) if needed.
  2. Copy apps/mobile/.env.example → apps/mobile/.env.local and fill Supabase keys.
  3. Optional: copy apps/mobile/eas.local.env.example → eas.local.env (ASC_APP_ID).
  4. Push build env to EAS:
       npm run eas:ios -- secrets --environment production
  5. Configure Apple credentials (first time):
       npm run eas:ios -- credentials
  6. Build + submit to TestFlight:
       npm run eas:ios -- release

Docs: docs/DEVELOPER.md#testflight-eas-build--submit
EOF
}

cmd_secrets() {
  local environment="production"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --environment)
        environment="${2:?missing value for --environment}"
        shift 2
        ;;
      *)
        echo "error: unknown secrets arg: $1" >&2
        exit 1
        ;;
    esac
  done

  require_eas_login

  if [[ ! -f "$MOBILE/.env.local" ]]; then
    echo "error: missing $MOBILE/.env.local (copy from .env.example)" >&2
    exit 1
  fi

  if [[ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" || -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
    echo "error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local" >&2
    exit 1
  fi

  cd "$MOBILE"

  echo "==> Pushing EXPO_PUBLIC_* vars to EAS environment: $environment"
  "${EAS[@]}" env:push "$environment" --path .env.local

  echo "==> Done. Cloud builds using profile '$environment' will receive these values."
}

cmd_build() {
  local profile="production"
  local extra_args=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --profile)
        profile="${2:?missing value for --profile}"
        shift 2
        ;;
      *)
        extra_args+=("$1")
        shift
        ;;
    esac
  done

  require_eas_login

  if ! has_eas_project; then
    echo "error: EAS project not linked. Run: npm run eas:ios -- setup" >&2
    exit 1
  fi

  cd "$MOBILE"

  echo "==> EAS iOS build (profile: $profile)"
  if ((${#extra_args[@]} > 0)); then
    "${EAS[@]}" build --platform ios --profile "$profile" "${extra_args[@]}"
  else
    "${EAS[@]}" build --platform ios --profile "$profile"
  fi
}

cmd_submit() {
  local profile="production"
  local use_latest=0
  local build_id=""
  local extra_args=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --profile)
        profile="${2:?missing value for --profile}"
        shift 2
        ;;
      --latest)
        use_latest=1
        shift
        ;;
      --id)
        build_id="${2:?missing value for --id}"
        shift 2
        ;;
      *)
        extra_args+=("$1")
        shift
        ;;
    esac
  done

  require_eas_login
  cd "$MOBILE"

  local submit_args=(submit --platform ios --profile "$profile")

  if [[ -n "$build_id" ]]; then
    submit_args+=(--id "$build_id")
  elif [[ "$use_latest" -eq 1 ]]; then
    submit_args+=(--latest)
  else
    submit_args+=(--latest)
  fi

  if [[ -n "${ASC_APP_ID:-}" ]]; then
    submit_args+=(--asc-app-id "$ASC_APP_ID")
  fi

  if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
    submit_args+=(--apple-team-id "$APPLE_TEAM_ID")
  fi

  echo "==> EAS iOS submit (profile: $profile)"
  if ((${#extra_args[@]} > 0)); then
    "${EAS[@]}" "${submit_args[@]}" "${extra_args[@]}"
  else
    "${EAS[@]}" "${submit_args[@]}"
  fi
}

cmd_release() {
  cmd_build --profile production "$@"
  cmd_submit --profile production --latest
}

cmd_credentials() {
  require_eas_login
  cd "$MOBILE"
  "${EAS[@]}" credentials --platform ios
}

main() {
  local command="${1:-}"

  case "$command" in
    setup) shift; cmd_setup "$@" ;;
    secrets) shift; cmd_secrets "$@" ;;
    build) shift; cmd_build "$@" ;;
    submit) shift; cmd_submit "$@" ;;
    release) shift; cmd_release "$@" ;;
    credentials) shift; cmd_credentials "$@" ;;
    -h | --help | help | '') usage 0 ;;
    *)
      echo "error: unknown command: $command" >&2
      usage 1
      ;;
  esac
}

main "$@"
