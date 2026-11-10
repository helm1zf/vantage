#!/usr/bin/env bash
# The tester must change when the app changes. If the change (everything not yet on origin/main, or the last commit when nothing is pending)
# touches app code (ui/*.js, ui/features, ui/index.html, src-tauri/src, kit) but touches NOTHING under tools/ (tests, registry, probes), it fails.
# Style-only (ui/style.css) and translation-only (ui/strings.js) changes are exempt. Tests of a feature live in tools/ui-tests, tools/tests, or
# as #[test] inside the Rust file (a diff that adds a #[test] line counts).
cd "$(dirname "$0")/.." || exit 1
base=origin/main
git rev-parse --verify -q "$base" >/dev/null || base=HEAD~1
if [ "$(git rev-parse "$base")" = "$(git rev-parse HEAD)" ] && [ -z "$(git status --porcelain)" ]; then base=HEAD~1; fi
files=$( { git diff --name-only "$base"; git ls-files -o --exclude-standard; } | sort -u)
code=$(echo "$files" | grep -E '^(ui/(app|nova|tour|chatdock|i18n)\.js|ui/features/|ui/index\.html|src-tauri/src/|kit/)' | grep -v '^kit/.*system_manifest' )
[ -z "$code" ] && { echo "no app code changed: nothing to follow"; exit 0; }
tests=$(echo "$files" | grep -E '^tools/')
rust_test=$(git diff "$base" -- src-tauri/src | grep -E '^\+.*#\[(test|ignore)\]' | head -1)
if [ -n "$tests" ] || [ -n "$rust_test" ]; then echo "ok: app code changed and so did the tester ($(echo "$tests" | wc -l | tr -d ' ') files in tools/)"; exit 0; fi
echo "FAIL: app code changed but nothing under tools/ did. Changed code:"; echo "$code" | sed 's/^/  /'
echo "Update the tests and tools/ui-tests/features.js for the feature you touched (a new button = a new feature entry + a test)."; exit 1
