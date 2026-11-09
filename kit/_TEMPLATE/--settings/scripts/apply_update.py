#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Deterministic Vantage update: compares the user's system files with a newer kit and replaces what changed.
No AI reads or retypes file contents.

pakai: python3 apply_update.py --source <kit folder with _TEMPLATE/ and CLAUDE.md> --user <user folder> [--apply] [--stamp]
  (no flag)  plan only: prints JSON {new, changed, same, obsolete, package, pending_migrations}
  --apply    backs up every file it replaces to 01_user_documents/--usersettings/update_backup/<date>/, then writes the new files
  --stamp    writes the kit version to .vantage_version (do this after the pending migrations are done)
Never touched: anything not listed in system_manifest.json (your data, CLAUDE.md of the user, raw facts, applications).
Files in "create_only" (JD_Insights, status, materials index) are only created when missing.
"""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import hashlib
import json
import os
import re
import shutil
import sys
import time

TEXT = (".md", ".py", ".json", ".html", ".txt", ".js", ".css", ".gitignore")


def sha(path):
    with open(path, "rb") as f:
        b = f.read()
    if path.endswith(TEXT):
        b = b.replace(b"\r\n", b"\n")
    return hashlib.sha256(b).hexdigest()


def read_version(user):
    p = os.path.join(user, "01_user_documents", "--usersettings", ".vantage_version")
    try:
        return open(p, encoding="utf-8").read().strip()
    except OSError:
        return ""


def migrations(source, since):
    p = os.path.join(source, "_TEMPLATE", "--settings", "docs", "riwayat_migrasi.md")
    if not os.path.isfile(p):
        return []
    text = open(p, encoding="utf-8").read()
    out = []
    for m in re.finditer(r"^### \[(\d{4}-\d{2}-\d{2})\] (.+?)\n(.*?)(?=^### \[|\Z)", text, re.S | re.M):
        if m.group(1) > since:
            out.append({"date": m.group(1), "title": m.group(2).strip(), "body": m.group(3).strip()})
    return out


def main():
    a = sys.argv[1:]
    def opt(n):
        return a[a.index(n) + 1] if n in a and a.index(n) + 1 < len(a) else ""
    source, user = opt("--source"), opt("--user")
    if not source or not user:
        sys.exit("pakai: python3 apply_update.py --source <kit> --user <user folder> [--apply] [--stamp]")
    man_path = os.path.join(source, "_TEMPLATE", "system_manifest.json")
    if not os.path.isfile(man_path):
        sys.exit("The kit has no system_manifest.json (too old). Use the app's update instead.")
    man = json.load(open(man_path, encoding="utf-8"))
    tpl = os.path.join(source, "_TEMPLATE")
    pkg_dir = os.path.dirname(os.path.abspath(user))
    has_pkg = os.path.isfile(os.path.join(pkg_dir, "CLAUDE.md"))
    plan = {"version": man["version"], "from": read_version(user), "new": [], "changed": [], "same": 0, "obsolete": [], "package": [], "pending_migrations": []}
    jobs = []   # (src, dst, rel-for-backup)
    for rel, h in man["files"].items():
        dst = os.path.join(user, rel)
        if not os.path.exists(dst):
            plan["new"].append(rel); jobs.append((os.path.join(tpl, rel), dst, rel, False))
        elif rel in man.get("create_only", []):
            plan["same"] += 1
        elif sha(dst) != h:
            plan["changed"].append(rel); jobs.append((os.path.join(tpl, rel), dst, rel, True))
        else:
            plan["same"] += 1
    for rel in man.get("obsolete", []):
        if os.path.exists(os.path.join(user, rel)):
            plan["obsolete"].append(rel)
    if has_pkg:
        for rel, h in man.get("package", {}).items():
            dst = os.path.join(pkg_dir, rel)
            if not os.path.exists(dst) or sha(dst) != h:
                plan["package"].append(rel); jobs.append((os.path.join(source, rel), dst, "_package/" + rel, os.path.exists(dst)))
    plan["pending_migrations"] = migrations(source, plan["from"])
    if "--apply" in a:
        bk = os.path.join(user, "01_user_documents", "--usersettings", "update_backup", time.strftime("%Y-%m-%d_%H%M%S"))
        for src, dst, rel, existed in jobs:
            if existed:
                os.makedirs(os.path.dirname(os.path.join(bk, rel)), exist_ok=True)
                shutil.copy2(dst, os.path.join(bk, rel))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
        for rel in plan["obsolete"]:
            p = os.path.join(user, rel)
            os.makedirs(os.path.dirname(os.path.join(bk, rel)), exist_ok=True)
            shutil.move(p, os.path.join(bk, rel))
        plan["backup"] = bk if (plan["changed"] or plan["obsolete"] or plan["package"]) else ""
        plan["applied"] = True
    if "--stamp" in a:
        p = os.path.join(user, "01_user_documents", "--usersettings", ".vantage_version")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "w", encoding="utf-8").write(man["version"] + "\n")
        plan["stamped"] = man["version"]
    print(json.dumps(plan, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
