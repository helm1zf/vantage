#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Export the tracker so it can leave Vantage: a spreadsheet file (CSV) and a calendar file (.ics).

pakai: python3 export_tracker.py <csv|ics|both> <folder user>
Writes into <folder user>/_Exports/ (created if needed), prints {"files": [...], "events": n, "rows": n}. Never changes applications.json.
CSV opens in Excel, Numbers and Google Sheets (UTF-8 with BOM, one row per application).
ICS has all-day events for: next step due dates, deadlines, and a follow-up reminder 14 days after an application was sent. Import it into Google, Apple or Outlook calendar."""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import csv
import datetime
import hashlib
import json
import os
import sys

COLS = [("id", "ID"), ("perusahaan", "Company"), ("posisi", "Role"), ("tipe", "Type"), ("status", "Status"), ("fit_score", "Match"), ("tanggal_ketemu", "Found"),
        ("tanggal_status", "Status since"), ("deadline", "Deadline"), ("next_action", "Next step"), ("next_action_due", "Next step due"), ("lokasi", "Location"),
        ("sumber", "Source"), ("link", "Link"), ("catatan", "Notes"), ("folder", "Folder")]
SENT = ("Applied", "Sent")


def esc(s):
    return str(s).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    b = line.encode("utf-8")
    if len(b) <= 74:
        return line
    out, cur = [], ""
    for ch in line:
        if len((cur + ch).encode("utf-8")) > 73:
            out.append(cur)
            cur = " " + ch
        else:
            cur += ch
    out.append(cur)
    return "\r\n".join(out)


def day(s):
    try:
        return datetime.date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


def events(apps):
    out = []
    for a in apps:
        who = f"{a.get('perusahaan', '')}: {a.get('posisi', '')}"
        closed = a.get("status") in ("Accepted", "Rejected", "Withdrawn", "No Response", "Offer")
        d = day(a.get("next_action_due"))
        if d and not closed and a.get("next_action"):
            out.append((d, f"{a['next_action']} ({a.get('perusahaan', '')})", who, a.get("id", "") + ":next"))
        d = day(a.get("deadline"))
        if d and a.get("status") in ("Draft", "Ready", None, ""):
            out.append((d, f"Deadline: {a.get('perusahaan', '')}", who, a.get("id", "") + ":deadline"))
        d = day(a.get("tanggal_status"))
        if d and a.get("status") in SENT:
            out.append((d + datetime.timedelta(days=14), f"Follow up: {a.get('perusahaan', '')}", who + " (14 days after sending)", a.get("id", "") + ":follow"))
    return sorted(out, key=lambda e: e[0])


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("csv", "ics", "both"):
        sys.exit("pakai: python3 export_tracker.py <csv|ics|both> <folder user>")
    mode, user = sys.argv[1], os.path.abspath(sys.argv[-1])
    path = os.path.join(user, "01_user_documents", "--usersettings", "applications.json")
    try:
        apps = json.load(open(path, encoding="utf-8")).get("applications", [])
    except (OSError, ValueError):
        sys.exit("applications.json could not be read.")
    apps = [a for a in apps if isinstance(a, dict) and a.get("perusahaan")]
    out_dir = os.path.join(user, "_Exports")
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.date.today().strftime("%Y-%m-%d")
    files, ev = [], 0
    if mode in ("csv", "both"):
        p = os.path.join(out_dir, f"applications_{stamp}.csv")
        with open(p, "w", encoding="utf-8-sig", newline="") as fh:
            w = csv.writer(fh)
            w.writerow([h for _, h in COLS])
            for a in apps:
                w.writerow([a.get(k, "") for k, _ in COLS])
        files.append(p)
    if mode in ("ics", "both"):
        evs = events(apps)
        ev = len(evs)
        p = os.path.join(out_dir, f"vantage_calendar_{stamp}.ics")
        lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vantage//Tracker//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Vantage"]
        for d, title, desc, uid in evs:
            lines += ["BEGIN:VEVENT", f"UID:{hashlib.sha1(uid.encode()).hexdigest()}@vantage", f"DTSTAMP:{datetime.datetime.now(datetime.timezone.utc):%Y%m%dT%H%M%SZ}",
                      f"DTSTART;VALUE=DATE:{d:%Y%m%d}", f"DTEND;VALUE=DATE:{d + datetime.timedelta(days=1):%Y%m%d}", f"SUMMARY:{esc(title)}", f"DESCRIPTION:{esc(desc)}",
                      "BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{esc(title)}", "TRIGGER:-PT15H", "END:VALARM", "END:VEVENT"]
        lines.append("END:VCALENDAR")
        with open(p, "w", encoding="utf-8", newline="") as fh:
            fh.write("\r\n".join(fold(x) for x in lines) + "\r\n")
        files.append(p)
    print(json.dumps({"files": files, "events": ev, "rows": len(apps)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
