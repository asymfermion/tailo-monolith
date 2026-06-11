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
#   npm run eas:ios -- build [--profile production|preview|development] [--bump|--no-bump]
#   npm run eas:ios -- submit [--profile production] [--latest|--id BUILD_ID]
#   npm run eas:ios -- release   # production build + submit --latest (prompts to bump version)
#   npm run eas:ios -- release --bump | --no-bump
#   npm run eas:ios -- credentials
#
# Env files (gitignored):
#   apps/mobile/.env.local       — EXPO_PUBLIC_SUPABASE_* (used by secrets + local dev)
#   apps/mobile/eas.local.env    — EXPO_APPLE_*, ASC_APP_ID, optional ASC API key
#
# Copy eas.local.env.example → eas.local.env. Set EXPO_APPLE_TEAM_ID + EXPO_APPLE_PROVIDER_ID
# to skip Apple login prompts; the script passes --non-interactive when those are set.

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

# eas.local.env may set EXPO_* directly (preferred) or shorter APPLE_* aliases below.
apply_eas_apple_env() {
  if [[ -z "${EXPO_APPLE_ID:-}" && -n "${APPLE_ID:-}" ]]; then
    export EXPO_APPLE_ID="$APPLE_ID"
  fi

  if [[ -z "${EXPO_APPLE_TEAM_ID:-}" && -n "${APPLE_TEAM_ID:-}" ]]; then
    export EXPO_APPLE_TEAM_ID="$APPLE_TEAM_ID"
  fi

  if [[ -z "${EXPO_APPLE_PROVIDER_ID:-}" && -n "${APPLE_PROVIDER_ID:-}" ]]; then
    export EXPO_APPLE_PROVIDER_ID="$APPLE_PROVIDER_ID"
  fi

  if [[ -z "${EXPO_APPLE_TEAM_TYPE:-}" && -n "${APPLE_TEAM_TYPE:-}" ]]; then
    export EXPO_APPLE_TEAM_TYPE="$APPLE_TEAM_TYPE"
  elif [[ -z "${EXPO_APPLE_TEAM_TYPE:-}" && -n "${EXPO_APPLE_TEAM_ID:-}" ]]; then
    export EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"
  fi

  if [[ -z "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
    export EXPO_APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD"
  fi

  if [[ -z "${EXPO_APPLE_PASSWORD:-}" && -n "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
    export EXPO_APPLE_PASSWORD="$EXPO_APPLE_APP_SPECIFIC_PASSWORD"
  fi

  if [[ -n "${EXPO_ASC_API_KEY_PATH:-}" && "${EXPO_ASC_API_KEY_PATH}" != /* ]]; then
    export EXPO_ASC_API_KEY_PATH="$MOBILE/$EXPO_ASC_API_KEY_PATH"
  fi
}

resolve_apple_team_id() {
  if [[ -n "${EXPO_APPLE_TEAM_ID:-}" ]]; then
    printf '%s' "$EXPO_APPLE_TEAM_ID"
    return
  fi

  if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
    printf '%s' "$APPLE_TEAM_ID"
  fi
}

has_eas_apple_automation_config() {
  if [[ "${EAS_NON_INTERACTIVE:-}" == "1" ]]; then
    return 0
  fi

  if [[ -n "${EXPO_APPLE_TEAM_ID:-}" && -n "${EXPO_APPLE_PROVIDER_ID:-}" ]]; then
    return 0
  fi

  if [[ -n "${EXPO_ASC_API_KEY_PATH:-}" && -n "${EXPO_ASC_KEY_ID:-}" && -n "${EXPO_ASC_ISSUER_ID:-}" ]]; then
    return 0
  fi

  return 1
}

# eas_interactive_mode: auto | yes (force --non-interactive) | no (never add flag)
# Prints --non-interactive when appropriate (bash 3.2–safe; no namerefs).
eas_non_interactive_flag() {
  local eas_interactive_mode="${1:-auto}"

  case "$eas_interactive_mode" in
    yes)
      echo "==> EAS --non-interactive" >&2
      printf '%s' '--non-interactive'
      ;;
    no) ;;
    auto)
      if has_eas_apple_automation_config; then
        echo "==> EAS --non-interactive (Apple team/provider from eas.local.env)" >&2
        printf '%s' '--non-interactive'
      fi
      ;;
    *)
      echo "error: invalid eas interactive mode: $eas_interactive_mode" >&2
      exit 1
      ;;
  esac
}

has_eas_project() {
  node -e "
    const fs = require('fs');
    const app = JSON.parse(fs.readFileSync('$MOBILE/app.json', 'utf8'));
    process.exit(app?.expo?.extra?.eas?.projectId ? 0 : 1);
  " 2>/dev/null
}

# Bump expo.version patch (1.0.0 → 1.0.1) and ios.buildNumber before store builds.
bump_app_version() {
  node - "$MOBILE/app.json" <<'NODE'
const fs = require('fs');

const file = process.argv[2];
const app = JSON.parse(fs.readFileSync(file, 'utf8'));

const bumpPatch = (version) => {
  const parts = version.split('.').map((part) => parseInt(part, 10) || 0);
  while (parts.length < 3) {
    parts.push(0);
  }
  parts[2] += 1;
  return parts.join('.');
};

const bumpBuildNumber = (buildNumber) => {
  const parts = String(buildNumber ?? '0')
    .split('.')
    .map((part) => parseInt(part, 10) || 0);
  if (parts.length === 0) {
    parts.push(0);
  }
  parts[parts.length - 1] += 1;
  return parts.join('.');
};

const previousVersion = app.expo.version;
const previousBuildNumber = app.expo.ios?.buildNumber ?? '0';

app.expo.version = bumpPatch(previousVersion);
app.expo.ios = {
  ...app.expo.ios,
  buildNumber: bumpBuildNumber(previousBuildNumber),
};

fs.writeFileSync(file, `${JSON.stringify(app, null, 2)}\n`);
console.log(
  `==> Bumped app version ${previousVersion} → ${app.expo.version} (iOS build ${app.expo.ios.buildNumber})`,
);
NODE
}

# Print the version that bump_app_version would produce (without writing).
preview_bumped_version() {
  node - "$MOBILE/app.json" <<'NODE'
const fs = require('fs');

const file = process.argv[2];
const app = JSON.parse(fs.readFileSync(file, 'utf8'));

const bumpPatch = (version) => {
  const parts = version.split('.').map((part) => parseInt(part, 10) || 0);
  while (parts.length < 3) {
    parts.push(0);
  }
  parts[2] += 1;
  return parts.join('.');
};

const bumpBuildNumber = (buildNumber) => {
  const parts = String(buildNumber ?? '0')
    .split('.')
    .map((part) => parseInt(part, 10) || 0);
  if (parts.length === 0) {
    parts.push(0);
  }
  parts[parts.length - 1] += 1;
  return parts.join('.');
};

const version = app.expo.version;
const buildNumber = app.expo.ios?.buildNumber ?? '0';
const nextVersion = bumpPatch(version);
const nextBuildNumber = bumpBuildNumber(buildNumber);

console.log(`${version} (build ${buildNumber}) → ${nextVersion} (build ${nextBuildNumber})`);
NODE
}

# bump_mode: ask | yes | no
maybe_bump_app_version() {
  local profile="$1"
  local bump_mode="${2:-ask}"

  if [[ "$profile" != "production" ]]; then
    return 0
  fi

  case "$bump_mode" in
    no)
      echo "==> Skipping version bump"
      return 0
      ;;
    yes)
      bump_app_version
      return 0
      ;;
    ask)
      if [[ ! -t 0 ]]; then
        echo "==> Skipping version bump (non-interactive). Use --bump or --no-bump."
        return 0
      fi

      local preview
      preview="$(preview_bumped_version)"
      read -r -p "Bump app version? ${preview} [y/N] " reply
      if [[ "$reply" =~ ^[Yy]$ ]]; then
        bump_app_version
      else
        echo "==> Skipping version bump"
      fi
      ;;
    *)
      echo "error: invalid bump mode: $bump_mode" >&2
      exit 1
      ;;
  esac
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
  3. Optional: copy apps/mobile/eas.local.env.example → eas.local.env (EXPO_APPLE_* + ASC_APP_ID).
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
  local bump_mode="ask"
  local eas_interactive_mode="auto"
  local extra_args=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --profile)
        profile="${2:?missing value for --profile}"
        shift 2
        ;;
      --bump)
        bump_mode="yes"
        shift
        ;;
      --no-bump)
        bump_mode="no"
        shift
        ;;
      --non-interactive)
        eas_interactive_mode="yes"
        shift
        ;;
      --interactive)
        eas_interactive_mode="no"
        shift
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

  maybe_bump_app_version "$profile" "$bump_mode"

  local build_args=(build --platform ios --profile "$profile")
  local non_interactive_flag
  non_interactive_flag="$(eas_non_interactive_flag "$eas_interactive_mode")"
  if [[ -n "$non_interactive_flag" ]]; then
    build_args+=("$non_interactive_flag")
  fi

  echo "==> EAS iOS build (profile: $profile)"
  if ((${#extra_args[@]} > 0)); then
    "${EAS[@]}" "${build_args[@]}" "${extra_args[@]}"
  else
    "${EAS[@]}" "${build_args[@]}"
  fi
}

cmd_submit() {
  local profile="production"
  local use_latest=0
  local build_id=""
  local eas_interactive_mode="auto"
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
      --non-interactive)
        eas_interactive_mode="yes"
        shift
        ;;
      --interactive)
        eas_interactive_mode="no"
        shift
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

  local non_interactive_flag
  non_interactive_flag="$(eas_non_interactive_flag "$eas_interactive_mode")"
  if [[ -n "$non_interactive_flag" ]]; then
    submit_args+=("$non_interactive_flag")
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
  cmd_submit --profile production --latest "$@"
}

cmd_credentials() {
  require_eas_login
  cd "$MOBILE"
  "${EAS[@]}" credentials --platform ios
}

main() {
  apply_eas_apple_env

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
