#!/usr/bin/env bash
# Runs every step of .github/workflows/ci.yml in the same order and prints one verdict. Run before every push:  bash tools/check_all.sh
# A step that cannot run counts as a failure (nothing is skipped silently). Exit code 0 only when everything passed.
cd "$(dirname "$0")/.." || exit 1
fail=0; res=()
step() { local name="$1"; shift; if "$@" >"/tmp/vantage_check_${name// /_}.log" 2>&1; then res+=("PASS  $name"); else res+=("FAIL  $name  (log: /tmp/vantage_check_${name// /_}.log)"); fail=1; fi; }
step "translations"        node tools/check_i18n.js
step "kit consistency"     bash -c 'cd kit/_TEMPLATE && python3 ./--settings/scripts/verify_consistency.py'
step "kit script tests"    python3 -m unittest discover -s tools/tests
step "ui tests"            node tools/ui-tests/run.js
step "rust clippy"         bash -c 'cd src-tauri && cargo clippy --all-targets -- -D warnings'
step "rust tests"          bash -c 'cd src-tauri && cargo test'
echo; printf '%s\n' "${res[@]}"; echo
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || echo "CHECKS FAILED: do not push"
exit $fail
