#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add one application by hand (a job found outside the morning report).

pakai: python3 add_application.py '<json>' <folder user>
  json: {"company": "...", "role": "...", "link": "", "status": "Draft|Screening|Interview R1", "source": "", "fit": 0-100, "deadline": "YYYY-MM-DD"}
Creates 02_workflow/01_Pipeline/<DD-MM_Company_Role>/ and the entry in applications.json (backup next to it, written in one step), logs it in app_changes.log and rebuilds the tracker.
Statuses other than these three are set later by moving the card on the board, which also moves the folder the way sop/lamaran.md says.
Prints one JSON line {"ok": true, "id": ..., "folder": ...} or exits with a plain message."""
import datetime
import json
import os
import re
import subprocess
import sys
import unicodedata

ALLOWED = ("Draft", "Screening", "Interview R1")


def slug(s, n):
    s = unicodedata.normalize("NFKD", s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss").replace("Ä", "Ae").replace("Ö", "Oe").replace("Ü", "Ue"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-")
    return (s[:n]).strip("-") or "x"


def main():
    if len(sys.argv) < 3:
        sys.exit("pakai: python3 add_application.py '<json>' <folder user>")
    try:
        d = json.loads(sys.argv[1])
    except ValueError:
        sys.exit("The form data could not be read.")
    user = os.path.abspath(sys.argv[-1])
    company, role = str(d.get("company", "")).strip(), str(d.get("role", "")).strip()
    if not company or not role:
        sys.exit("Company and role are both needed.")
    status = d.get("status") if d.get("status") in ALLOWED else "Draft"
    path = os.path.join(user, "01_user_documents", "--usersettings", "applications.json")
    if not os.path.isdir(os.path.join(user, "02_workflow", "01_Pipeline")):
        sys.exit("This is not a Vantage user folder (02_workflow/01_Pipeline is missing).")
    try:
        data = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    except ValueError:
        sys.exit("applications.json cannot be read. Nothing was changed.")
    apps = data.setdefault("applications", [])
    today = datetime.date.today()
    aid = f"{today:%Y-%m-%d}_{slug(company, 40)}"
    n = 2
    while any(a.get("id") == aid for a in apps):
        aid = f"{today:%Y-%m-%d}_{slug(company, 40)}-{n}"
        n += 1
    folder = f"01_Pipeline/{today:%d-%m}_{slug(company, 30)}_{slug(role, 30)}"
    fp = os.path.join(user, "02_workflow", *folder.split("/"))
    k = 2
    while os.path.exists(fp):
        fp = os.path.join(user, "02_workflow", f"{folder}-{k}")
        k += 1
    folder = os.path.relpath(fp, os.path.join(user, "02_workflow")).replace(os.sep, "/")
    entry = {"id": aid, "perusahaan": company, "posisi": role, "tipe": str(d.get("type", "")), "lokasi": str(d.get("location", "")), "sumber": str(d.get("source", "")),
             "tanggal_ketemu": f"{today:%Y-%m-%d}", "deadline": str(d.get("deadline", "")), "fit_score": max(0, min(100, int(d.get("fit") or 0))), "status": status,
             "tanggal_status": f"{today:%Y-%m-%d}", "next_action": "Prepare documents" if status == "Draft" else "", "next_action_due": "", "folder": folder,
             "link": str(d.get("link", "")), "catatan": str(d.get("notes", ""))}
    os.makedirs(os.path.join(fp, "00_Draft"), exist_ok=True)
    if os.path.exists(path):
        try:
            with open(path + ".bak", "w", encoding="utf-8") as bak:
                bak.write(open(path, encoding="utf-8").read())
        except OSError:
            pass
    apps.append(entry)
    data.setdefault("meta", {})["last_updated"] = f"{today:%Y-%m-%d}"
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
    with open(os.path.join(user, "01_user_documents", "--usersettings", "app_changes.log"), "a", encoding="utf-8") as fh:
        fh.write(f"[{today:%Y-%m-%d}] {company}: added as {status} (changed in the app)\n")
    bt = os.path.join(user, "02_workflow", "03_Tracker", "build_tracker.py")
    if os.path.isfile(bt):   # keep the Excel tracker in step, like moving a card does
        subprocess.run([sys.executable, bt, "--json", path, "--out", os.path.join(user, "02_workflow", "03_Tracker", "Application_Tracker.xlsx")], cwd=user, capture_output=True)
    print(json.dumps({"ok": True, "id": aid, "folder": folder}, ensure_ascii=False))


if __name__ == "__main__":
    main()
