#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""One-click backup of one Vantage user (stdlib only).

pakai: python3 backup_user.py <user folder>
Writes <Vantage folder>/_Backups/<user>_<YYYY-MM-DD_HHMM>.zip with 01_user_documents, 02_workflow, the user's CLAUDE.md and the Inbox.
Left out: the system files (--settings, they come back with an update), update backups, caches. A file that cannot be read (open in
another program) is skipped and listed; the rest is still saved. Prints JSON. Restore with import_old.py <backup.zip> <user folder>.
"""
import json
import os
import sys
import time
import zipfile

SKIP_DIRS = {"--settings", "update_backup", "__pycache__", ".venv", "node_modules", ".git", "_Backups"}
KEEP_TOP = ("01_user_documents", "02_workflow", "--- I N B O X ---", "CLAUDE.md")


def lp(p):
    p = os.path.abspath(p)
    return "\\\\?\\" + p if os.name == "nt" and not p.startswith("\\\\?\\") else p


def main():
    if len(sys.argv) < 2:
        sys.exit("pakai: python3 backup_user.py <user folder>")
    user = os.path.abspath(sys.argv[-1])
    if not os.path.isdir(os.path.join(user, "01_user_documents")):
        sys.exit("This does not look like a Vantage user folder (no 01_user_documents).")
    name = os.path.basename(user.rstrip("/\\"))
    bdir = os.path.join(os.path.dirname(user), "_Backups")
    os.makedirs(bdir, exist_ok=True)
    out = os.path.join(bdir, f"{name}_{time.strftime('%Y-%m-%d_%H%M')}.zip")
    n, skipped, size = 0, [], 0
    with zipfile.ZipFile(lp(out), "w", zipfile.ZIP_DEFLATED, allowZip64=True) as z:
        for top in KEEP_TOP:
            base = os.path.join(user, top)
            if os.path.isfile(base):
                walk = [(os.path.dirname(base), [], [top])]
            elif os.path.isdir(base):
                walk = os.walk(base)
            else:
                continue
            for dp, dns, fns in walk:
                dns[:] = [d for d in dns if d not in SKIP_DIRS]
                for fn in fns:
                    if fn in (".DS_Store", "Thumbs.db") or fn.endswith(".pyc"):
                        continue
                    full = os.path.join(dp, fn)
                    rel = os.path.relpath(full, user).replace(os.sep, "/")
                    try:
                        z.write(lp(full), rel)
                        n += 1
                        size += os.path.getsize(lp(full))
                    except (PermissionError, OSError) as e:
                        skipped.append({"file": rel, "why": "in use by another program" if isinstance(e, PermissionError) else str(e)})
    print(json.dumps({"path": out, "files": n, "mb": round(size / 1e6, 1), "skipped": skipped}, ensure_ascii=False))


if __name__ == "__main__":
    main()
