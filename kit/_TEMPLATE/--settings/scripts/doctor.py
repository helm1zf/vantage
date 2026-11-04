#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vantage system check: what the kit needs on this computer, as JSON (stdlib only, never installs anything).

pakai: python3 doctor.py [<folder-user>]      -> {"checks":[{"id","label","ok","detail","fix"}], "ok": bool}
Replaces the manual "install tools" steps of the old first_run: the app shows this as a checklist, and a failed row
offers one button ("Fix with Nova") that asks Nova to install exactly that item.
"""
import importlib.util
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def has_mod(name):
    return importlib.util.find_spec(name) is not None


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(HERE))
    out = []

    def add(id_, label, ok, detail, fix=""):
        out.append({"id": id_, "label": label, "ok": bool(ok), "detail": detail, "fix": fix})

    v = sys.version_info
    add("python", "Python 3.9 or newer", v >= (3, 9), f"{v.major}.{v.minor}.{v.micro}", "Install Python 3 from python.org")
    for mod, pkg, why in [("PIL", "Pillow", "photo in the CV"), ("pypdf", "pypdf", "reading and counting PDF pages"),
                          ("docx", "python-docx", "Word versions of CV and cover letter"), ("openpyxl", "openpyxl", "Excel tracker"),
                          ("markdown", "markdown", "notes to PDF")]:
        ok = has_mod(mod)
        add("pkg_" + pkg.lower(), f"{pkg} ({why})", ok, "installed" if ok else "missing", f"pip install {pkg}")
    try:
        import lib_render
        b = lib_render.find_browser()
    except Exception:  # noqa: BLE001
        b = None
    add("browser", "Chrome or Edge (makes the PDFs)", b, b or "not found", "Install Google Chrome (Edge is already on Windows)")
    c = shutil.which("claude") or shutil.which("claude.exe")
    add("claude", "Claude Code (the chat)", c, c or "not found", "Use Connect Claude in the chat window")
    try:
        free = shutil.disk_usage(folder).free / 1e9
    except Exception:  # noqa: BLE001
        free = 0
    add("disk", "At least 1 GB free disk space", free >= 1, f"{free:.1f} GB free", "Free some disk space")
    plen = len(os.path.abspath(folder))
    add("path", "Short folder path (Windows limit)", plen <= 90, f"{plen} characters", "Move the Vantage folder closer to the drive root, e.g. C:\\Vantage")
    print(json.dumps({"checks": out, "ok": all(x["ok"] for x in out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
