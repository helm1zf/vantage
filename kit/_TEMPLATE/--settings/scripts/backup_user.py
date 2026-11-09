#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Export one Vantage account as ONE zip file (stdlib only). Also the "Back up my data" button.

pakai: python3 backup_user.py <user folder>
Writes <Vantage folder>/_Backups/<user>_<YYYY-MM-DD_HHMM>.zip containing 01_user_documents (incl. app notes and chats), 02_workflow, the Inbox and the user's CLAUDE.md,
plus vantage_export.json at the top: a list of EVERY file with its size and sha256. account_import.py uses that list to take the package back in exactly and to prove
that nothing is missing. Left out: system files (--settings, they come back with an update), update backups, caches, earlier backups.
A file that cannot be read (open in another program) is skipped, listed in the result AND in the package list, so the import can name it. Prints JSON.
Take it back with: account_import.py <package.zip> --apply <user folder>
"""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import datetime
import hashlib
import json
import os
import sys
import time
import zipfile

FORMAT, VERSION = "vantage-account", 1
SKIP_DIRS = {"--settings", "update_backup", "__pycache__", ".venv", "node_modules", ".git", "_Backups"}
KEEP_TOP = ("01_user_documents", "02_workflow", "--- I N B O X ---", "CLAUDE.md")
SKIP_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}


def lp(p):
    p = os.path.abspath(p)
    return "\\\\?\\" + p if os.name == "nt" and not p.startswith("\\\\?\\") else p


def app_version():
    try:
        here = os.path.dirname(os.path.abspath(__file__))
        root = os.path.dirname(os.path.dirname(here))
        return open(os.path.join(root, "01_user_documents", "--usersettings", ".vantage_version"), encoding="utf-8").read().strip()
    except OSError:
        return ""


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
    n, skipped, size, entries = 0, [], 0, []
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
                dns[:] = sorted(d for d in dns if d not in SKIP_DIRS)
                for fn in sorted(fns):
                    if fn in SKIP_FILES or fn.endswith((".pyc", ".vtmp")) or fn.startswith("~$"):
                        continue
                    full = os.path.join(dp, fn)
                    rel = os.path.relpath(full, user).replace(os.sep, "/")
                    try:
                        # read once: the hash in the list is the hash of exactly the bytes that went into the zip
                        h, sz = hashlib.sha256(), 0
                        zi = zipfile.ZipInfo.from_file(lp(full), rel)
                        zi.compress_type = zipfile.ZIP_DEFLATED
                        with open(lp(full), "rb") as fh, z.open(zi, "w", force_zip64=True) as dst:
                            for b in iter(lambda: fh.read(1 << 20), b""):
                                h.update(b)
                                dst.write(b)
                                sz += len(b)
                        entries.append({"path": rel, "size": sz, "sha256": h.hexdigest()})
                        n += 1
                        size += sz
                    except (PermissionError, OSError) as e:
                        skipped.append({"file": rel, "why": "in use by another program" if isinstance(e, PermissionError) else str(e)})
        manifest = {"format": FORMAT, "version": VERSION, "kit_version": app_version(), "created": datetime.datetime.now().isoformat(timespec="seconds"), "user": name,
                    "file_count": len(entries), "files": entries, "not_exported": skipped}
        z.writestr("vantage_export.json", json.dumps(manifest, ensure_ascii=False, indent=1))
    print(json.dumps({"path": out, "files": n, "mb": round(size / 1e6, 1), "skipped": skipped}, ensure_ascii=False))


if __name__ == "__main__":
    main()
