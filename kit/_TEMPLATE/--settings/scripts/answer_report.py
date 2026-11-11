#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Writes the user's answer to a Morning report recommendation, so the Skip button never depends on a chat finding the right file.

pakai: python3 answer_report.py skip <perusahaan> <posisi> <link, or "" > <folder user>
       python3 answer_report.py list <folder user>
`skip` marks the posting `dijawab: lewati` in --usersettings/daily_jobs_seen.json (it is created when missing, an older file keeps its other
entries). A skipped posting does not come back in later reports (sop/laporan_pagi.md). `list` prints the skipped ones as "perusahaan|posisi", lower case.
Prints one JSON line. The file is written in one step.
"""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import datetime
import json
import os
import sys


def key(c, p):
    return (str(c).strip() + "|" + str(p).strip()).lower()


def path(user):
    return os.path.join(user, "01_user_documents", "--usersettings", "daily_jobs_seen.json")


def load(p):
    """-> (document, entries). Sinta may have written a list, or an object around a list; both are kept as they are."""
    if not os.path.exists(p):
        doc = {"seen": []}
        return doc, doc["seen"]
    try:
        doc = json.load(open(p, encoding="utf-8"))
    except ValueError as e:
        sys.exit(f"daily_jobs_seen.json cannot be read ({e}). Nothing was changed.")
    if isinstance(doc, list):
        return doc, doc
    if isinstance(doc, dict):
        for v in doc.values():
            if isinstance(v, list) and (not v or isinstance(v[0], dict)):
                return doc, v
        doc.setdefault("seen", [])
        return doc, doc["seen"]
    sys.exit("daily_jobs_seen.json has an unexpected shape. Nothing was changed.")


def main(argv):
    if len(argv) >= 2 and argv[0] == "list":
        _, entries = load(path(argv[1]))
        out = sorted({key(e.get("perusahaan", ""), e.get("posisi", "")) for e in entries if isinstance(e, dict) and e.get("dijawab") == "lewati"})
        print(json.dumps({"skipped": out}, ensure_ascii=False))
        return
    if len(argv) == 5 and argv[0] == "skip":
        _, company, role, link, user = argv
        if not company.strip():
            sys.exit("A company name is needed.")
        p = path(user)
        doc, entries = load(p)
        k = key(company, role)
        hit = next((e for e in entries if isinstance(e, dict) and ((link and e.get("link") == link) or key(e.get("perusahaan", ""), e.get("posisi", "")) == k)), None)
        if hit is None:
            hit = {"perusahaan": company.strip(), "posisi": role.strip(), "link": link, "dilaporkan": True}
            entries.append(hit)
        hit["dijawab"] = "lewati"
        hit["tanggal_dijawab"] = f"{datetime.date.today():%Y-%m-%d}"
        os.makedirs(os.path.dirname(p), exist_ok=True)
        tmp = p + ".vtmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=1)
        os.replace(tmp, p)
        print(json.dumps({"ok": True, "key": k}, ensure_ascii=False))
        return
    sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
