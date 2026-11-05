#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Maintainer tool: writes _TEMPLATE/system_manifest.json (file -> sha256). The change history is --settings/docs/riwayat_migrasi.md.

Run from --settings/ whenever a system file changes:  python3 scripts/generate_update.py
The app (or Nova, one command) then applies updates with scripts/apply_update.py: compare hashes, back up, replace.
"""
import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_ROOT = os.path.dirname(os.path.dirname(HERE))      # _TEMPLATE/
KIT_ROOT = os.path.dirname(TEMPLATE_ROOT)                     # kit/
DEV_ONLY = {"generate_update.py"}
DEV_ONLY_DIRS = {"docs", "__pycache__"}
# System files that carry user data once in use: created when missing, never replaced.
CREATE_ONLY = ["01_user_documents/--usersettings/JD_Insights.md", "01_user_documents/--usersettings/status.md", "01_user_documents/materials/00_index.md"]
EXTRA = ["02_workflow/03_Tracker/build_tracker.py", "01_user_documents/README.md", "01_user_documents/00_other_cv_as_role_model/README.md"] + CREATE_ONLY
# Removed from the kit; an update moves them to the backup folder instead of leaving dead instructions behind.
OBSOLETE = ["--settings/onboarding/project_mode.md", "--settings/onboarding/project_threads.md", "--settings/scripts/md_to_pdf.py", "--settings/scripts/build_release.py"]


def sha(path):
    b = open(path, "rb").read()
    if path.endswith((".md", ".py", ".json", ".html", ".txt", ".js", ".css", ".gitignore")):
        b = b.replace(b"\r\n", b"\n")
    return hashlib.sha256(b).hexdigest()


def files():
    out = []
    base = os.path.join(TEMPLATE_ROOT, "--settings")
    for dp, dns, fns in os.walk(base):
        dns[:] = sorted(d for d in dns if d not in DEV_ONLY_DIRS)
        for fn in sorted(fns):
            if fn in DEV_ONLY or fn.startswith(".") or fn.endswith(".pyc"):
                continue
            out.append(os.path.relpath(os.path.join(dp, fn), TEMPLATE_ROOT).replace(os.sep, "/"))
    return out + EXTRA


def main():
    version = open(os.path.join(TEMPLATE_ROOT, "01_user_documents", "--usersettings", ".vantage_version"), encoding="utf-8").read().strip()
    pkg = {"CLAUDE.md": sha(os.path.join(KIT_ROOT, "CLAUDE.md"))}
    ad = os.path.join(KIT_ROOT, ".claude", "agents")
    for fn in sorted(os.listdir(ad)):
        pkg[".claude/agents/" + fn] = sha(os.path.join(ad, fn))
    man = {"version": version, "files": {f: sha(os.path.join(TEMPLATE_ROOT, f)) for f in files()}, "create_only": CREATE_ONLY, "obsolete": OBSOLETE, "package": pkg}
    with open(os.path.join(TEMPLATE_ROOT, "system_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(man, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"DONE: {len(man['files'])} system files, {len(pkg)} package files, version {version}")


if __name__ == "__main__":
    main()
