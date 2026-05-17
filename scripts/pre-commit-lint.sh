#!/usr/bin/env sh
# Run lint; on failure, auto-fix and re-check. Re-stage fixed files that were already staged.

set -e

echo "pre-commit: lint"

if npm run lint; then
  exit 0
fi

echo "pre-commit: lint failed, running lint:fix..."

STAGED_FILES=$(git diff --name-only --cached --diff-filter=ACM || true)

npm run lint:fix

if [ -n "$STAGED_FILES" ]; then
  echo "$STAGED_FILES" | xargs git add
fi

echo "pre-commit: re-running lint after fix"
npm run lint
