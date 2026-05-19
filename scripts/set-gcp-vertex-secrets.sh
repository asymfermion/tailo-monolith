#!/usr/bin/env bash
# Set Supabase Edge Function secrets for Vertex AI (process-ai-job).
# Prerequisites: npx supabase login && npx supabase link --project-ref <ref>
#
# Usage (from repo root):
#   ./scripts/set-gcp-vertex-secrets.sh
#   GCP_KEY_FILE=~/keys/tailo-vertex.json GCP_PROJECT_ID=my-proj ./scripts/set-gcp-vertex-secrets.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx not found" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required (brew install jq)" >&2
  exit 1
fi

DEFAULT_REGION="us-central1"
DEFAULT_MODEL="gemini-2.0-flash-001"

read -r -p "GCP project ID${GCP_PROJECT_ID:+ [$GCP_PROJECT_ID]}: " PROJECT_INPUT
GCP_PROJECT_ID="${GCP_PROJECT_ID:-${PROJECT_INPUT}}"

if [[ -z "$GCP_PROJECT_ID" ]]; then
  echo "error: GCP project ID is required" >&2
  exit 1
fi

read -r -p "Vertex region [$DEFAULT_REGION]: " REGION_INPUT
GCP_VERTEX_REGION="${GCP_VERTEX_REGION:-${REGION_INPUT:-$DEFAULT_REGION}}"

read -r -p "Vertex model [$DEFAULT_MODEL]: " MODEL_INPUT
GCP_VERTEX_MODEL="${GCP_VERTEX_MODEL:-${MODEL_INPUT:-$DEFAULT_MODEL}}"

if [[ -z "${GCP_KEY_FILE:-}" ]]; then
  read -r -p "Path to service account JSON key file: " GCP_KEY_FILE
fi

if [[ ! -f "$GCP_KEY_FILE" ]]; then
  echo "error: key file not found: $GCP_KEY_FILE" >&2
  exit 1
fi

SERVICE_ACCOUNT_JSON="$(jq -c . < "$GCP_KEY_FILE")"

echo ""
echo "Will set secrets on the linked Supabase project:"
echo "  AI_PROVIDER=vertex"
echo "  GCP_PROJECT_ID=$GCP_PROJECT_ID"
echo "  GCP_VERTEX_REGION=$GCP_VERTEX_REGION"
echo "  GCP_VERTEX_MODEL=$GCP_VERTEX_MODEL"
echo "  GCP_SERVICE_ACCOUNT_JSON=<$(wc -c < "$GCP_KEY_FILE" | tr -d ' ') bytes from key file>"
echo ""
read -r -p "Continue? [y/N] " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

npx supabase secrets set \
  AI_PROVIDER=vertex \
  "GCP_PROJECT_ID=$GCP_PROJECT_ID" \
  "GCP_VERTEX_REGION=$GCP_VERTEX_REGION" \
  "GCP_VERTEX_MODEL=$GCP_VERTEX_MODEL" \
  "GCP_SERVICE_ACCOUNT_JSON=$SERVICE_ACCOUNT_JSON"

echo ""
echo "==> Secrets set. Redeploying process-ai-job..."
npx supabase functions deploy process-ai-job

echo ""
echo "Done. Test: upload a moment in the app, then check Edge Function logs for process-ai-job."
echo "See supabase/GCP_VERTEX_SETUP.md for troubleshooting."
