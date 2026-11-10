#!/usr/bin/env python3
"""Real Claude CLI, real app arguments: after the app has replaced the kit files, does Nova finish the data migrations and write the version down?
Uses a throwaway folder (space + umlaut in the name) pretending to be version 0.8.8. Costs a few US cents. Needs Claude Code signed in and a built app.
    python3 tools/migration_probe.py"""
import json, os, shutil, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "src-tauri", "target", "debug", "vantage-app")
CLAUDE = os.path.expanduser("~/.local/bin/claude")
if not os.path.exists(CLAUDE): CLAUDE = shutil.which("claude")
base = tempfile.mkdtemp(prefix="vantage_migprobe_")
pkg = os.path.join(base, "pkg"); user = os.path.join(pkg, "Helmi (Mü) 1")
shutil.copytree(os.path.join(ROOT, "kit", "_TEMPLATE"), user)
shutil.copy(os.path.join(ROOT, "kit", "CLAUDE.md"), os.path.join(pkg, "CLAUDE.md"))
st = os.path.join(user, "01_user_documents", "--usersettings"); os.makedirs(st, exist_ok=True)
open(os.path.join(st, ".vantage_version"), "w").write("0.8.8\n")
script = os.path.join(user, "--settings", "scripts", "apply_update.py")
src = os.path.join(st, "update_source"); shutil.copytree(os.path.join(ROOT, "kit"), src)
plan = json.loads(subprocess.run([sys.executable, script, "--source", src, "--user", user, "--apply"], capture_output=True, text=True).stdout)
plan2 = json.loads(subprocess.run([sys.executable, script, "--source", src, "--user", user], capture_output=True, text=True).stdout)
titles = [m["title"] for m in plan2["pending_migrations"]]
msg = ('The app has just updated my Vantage system files (a backup is in %s). Please go through the data migrations since version 0.8.8 in --settings/docs/riwayat_migrasi.md: %s. '
       'Follow sop/update.md section 2, and do only those whose detection matches my folder. Then run verify_consistency.py and, when everything is fine, write the version down with apply_update.py --source "%s" --user "%s" --stamp.') % (plan.get("backup", ""), "; ".join(titles), src, user)
args = json.loads(subprocess.run([APP, "--print-cli-args", pkg, user], capture_output=True, text=True).stdout)
env = {k: v for k, v in os.environ.items() if not k.startswith(("CLAUDE", "ANTHROPIC_"))}
r = subprocess.run([CLAUDE, *args, "--max-budget-usd", "1.5"], input=msg, capture_output=True, text=True, cwd=pkg, env=env, timeout=600)
res = {}
for line in r.stdout.splitlines():
    try: j = json.loads(line)
    except Exception: continue
    if j.get("type") == "result": res = j
den = [d.get("tool_name") + ": " + json.dumps(d.get("tool_input"))[:120] for d in res.get("permission_denials", [])]
stamp = open(os.path.join(st, ".vantage_version")).read().strip()
print("refused:", den or "none"); print("version file:", stamp); print("reply:", (res.get("result") or r.stderr)[:500])
ok = not den and stamp != "0.8.8"
print("MIGRATION PROBE", "PASSED" if ok else "FAILED"); shutil.rmtree(base, ignore_errors=True); sys.exit(0 if ok else 1)
