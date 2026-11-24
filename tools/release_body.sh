#!/usr/bin/env bash
# Prints the body of one GitHub release: only the "## What's new in <version>" section of RELEASE_NOTES.md.
# The whole file made the release page ~34,000 characters long, so the download files sat far below, and the in-app
# "What's new" repeated every older version under each release. Fails when the section is missing or empty.
# Usage: bash tools/release_body.sh 0.11.3 [RELEASE_NOTES.md]
set -euo pipefail
ver="${1#v}"; file="${2:-RELEASE_NOTES.md}"
body="$(awk -v h="## What's new in $ver" '
  $0 == h { on = 1; next }
  on && /^## What.s new in / { exit }
  on { print }' "$file" | sed -e '/./,$!d')"  # $(...) drops trailing blank lines
grep -q "[^[:space:]]" <<<"$body" || { echo "release_body: no section \"## What's new in $ver\" in $file" >&2; exit 1; }
printf '%s\n' "$body"
