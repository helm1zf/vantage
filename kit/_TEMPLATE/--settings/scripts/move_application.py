#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Change the status of one application: moves its folder, updates applications.json, rebuilds the tracker. The same rules as dragging the card in the app.

pakai: python3 move_application.py <id> <status> <folder user>
  <id>      the "id" of the application in applications.json (or its company name when that is unique)
  <status>  one of status_vocab: Draft, Applied, No Response, Screening, Interview R1, Interview R2, Assessment, Offer, Accepted, Rejected, Withdrawn
Folder rules (sop/lamaran.md): Draft, Screening, Interview R1/R2 and Assessment live in 02_workflow/01_Pipeline/<DD-MM_Company_Role>/; everything else in
02_workflow/02_Sent/<Type>/<Year>/00_currentMonth_<MM>/ (an earlier month loses its 00_ marker). Next step: a closed application loses its reminder; a newly Applied one
gets "Follow up (14 days)" when it had no later date. Nothing is deleted. applications.json is written in one step and only if nobody changed it meanwhile.
Use this instead of mv / Move-Item: it also keeps the file in sync with what the app shows. Prints one JSON line.
"""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import datetime
import json
import os
import subprocess
import sys

IN_PIPELINE = {"Draft", "Screening", "Interview R1", "Interview R2", "Assessment"}
CLOSED = {"Accepted", "Rejected", "Withdrawn", "No Response"}


def write_atomic(path, text):
    tmp = path + ".vtmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def log_change(user, line):
    p = os.path.join(user, "01_user_documents", "--usersettings", "app_changes.log")
    try:
        lines = open(p, encoding="utf-8").read().splitlines() if os.path.exists(p) else []
    except OSError:
        lines = []
    lines.append(f"[{datetime.date.today():%Y-%m-%d}] {line}")
    try:
        write_atomic(p, "\n".join(lines[-200:]) + "\n")
    except OSError:
        pass


def sent_month_dir(wf, kind):
    today = datetime.date.today()
    year = os.path.join(wf, "02_Sent", kind or "Other", str(today.year))
    os.makedirs(year, exist_ok=True)
    cur = f"00_currentMonth_{today.month:02d}"
    for n in os.listdir(year):
        if n.startswith("00_currentMonth_") and n != cur:
            mm = n[len("00_currentMonth_"):]
            if not os.path.exists(os.path.join(year, f"Month_{mm}")):
                os.rename(os.path.join(year, n), os.path.join(year, f"Month_{mm}"))
    target, plain = os.path.join(year, cur), os.path.join(year, f"Month_{today.month:02d}")
    if not os.path.exists(target):
        if os.path.exists(plain):
            os.rename(plain, target)
        else:
            os.makedirs(target)
    return target


def main():
    if len(sys.argv) < 4:
        sys.exit("pakai: python3 move_application.py <id> <status> <folder user>")
    key, status, user = sys.argv[1], sys.argv[2], os.path.abspath(sys.argv[-1])
    jp = os.path.join(user, "01_user_documents", "--usersettings", "applications.json")
    wf = os.path.join(user, "02_workflow")
    if not os.path.isfile(jp):
        sys.exit("applications.json was not found.")
    seen = os.stat(jp).st_mtime_ns
    try:
        data = json.load(open(jp, encoding="utf-8"))
    except ValueError as e:
        sys.exit(f"applications.json cannot be read: {e}")
    vocab = data.get("status_vocab") or []
    if vocab and status != "Accepted" and status not in vocab:   # "Accepted" is newer than older status lists
        sys.exit(f'"{status}" is not a tracker status. Use one of: ' + ", ".join(vocab))
    apps = data.get("applications", [])
    hits = [a for a in apps if a.get("id") == key] or [a for a in apps if str(a.get("perusahaan", "")).lower() == key.lower()]
    if len(hits) != 1:
        sys.exit("No application with that id." if not hits else "More than one application has that company name: use the id.")
    a = hits[0]
    old_status, old_folder = a.get("status", ""), a.get("folder", "")
    new_folder, src = old_folder, os.path.join(wf, *old_folder.split("/")) if old_folder else ""
    if old_folder and os.path.isdir(src):
        name = os.path.basename(src.rstrip("/\\"))
        dst = os.path.join(wf, "01_Pipeline", name) if status in IN_PIPELINE else os.path.join(sent_month_dir(wf, a.get("tipe", "")), name)
        if os.path.abspath(dst) != os.path.abspath(src):
            if os.path.exists(dst):
                sys.exit(f"A folder named {name} already exists there. Nothing was moved.")
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            try:
                os.rename(src, dst)
            except OSError as e:
                sys.exit(f"Could not move the folder (is it open in File Explorer, Word or a PDF reader? Close it and run again): {e}")
            new_folder = os.path.relpath(dst, wf).replace(os.sep, "/")
    today = datetime.date.today()
    a["status"], a["tanggal_status"], a["folder"] = status, f"{today:%Y-%m-%d}", new_folder
    due = str(a.get("next_action_due", ""))
    if status in CLOSED:
        a["next_action"], a["next_action_due"] = "", ""
    elif status == "Applied" and old_status != "Applied" and (not due or due <= f"{today:%Y-%m-%d}"):
        a["next_action"], a["next_action_due"] = "Follow up (14 days)", f"{today + datetime.timedelta(days=14):%Y-%m-%d}"
    data.setdefault("meta", {})["last_updated"] = f"{today:%Y-%m-%d}"
    if os.stat(jp).st_mtime_ns != seen:
        if new_folder != old_folder:
            os.rename(os.path.join(wf, *new_folder.split("/")), src)
        sys.exit("applications.json was changed by another program while this ran. Nothing was overwritten: run it again.")
    write_atomic(jp, json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    log_change(user, f"{a.get('perusahaan', '')}: {old_status} -> {status} (changed in a chat)")
    tracker = "skipped"
    bt = os.path.join(wf, "03_Tracker", "build_tracker.py")
    if os.path.isfile(bt):
        r = subprocess.run([sys.executable, bt, "--json", jp, "--out", os.path.join(wf, "03_Tracker", "Application_Tracker.xlsx")], cwd=user, capture_output=True, text=True)
        tracker = "ok" if r.returncode == 0 else "build_tracker.py: " + (r.stderr.strip().splitlines() or ["failed"])[-1]
    print(json.dumps({"ok": True, "id": a.get("id"), "old_status": old_status, "status": status, "old_folder": old_folder, "folder": new_folder, "tracker": tracker}, ensure_ascii=False))


if __name__ == "__main__":
    main()
