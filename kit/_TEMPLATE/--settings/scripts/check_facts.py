#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cek cv_content.json / cl_content.json terhadap raw_facts (hanya MEMBACA).

    python3 -I check_facts.py <raw_facts_about_you.md> <content.json> [<content.json> ...]

Dua pemeriksaan:
  1. SUMBER (khusus CV, yang punya sections/entries/bullets): tiap entry wajib punya kunci
     `_sumber`, daftar sejajar dengan `bullets`, isi tiap butir = ID raw_facts yang dipakai bullet
     itu, mis. "_sumber": [["PROJ2-01"], ["PROJ2-03", "EDU1-02"]]. Kunci berawalan "_" diabaikan
     builder, jadi PDF tidak berubah. DITOLAK kalau: `_sumber` tidak ada, panjangnya beda dengan
     bullets, ada bullet tanpa ID, ID tidak ada di raw_facts, atau ID itu bertanda DICORET.
     Diperingatkan kalau ID bertanda UNVERIFIED.
  2. ANGKA (CV dan cover letter): angka di teks yang tidak muncul di raw_facts.
Exit code 1 kalau ada penolakan atau temuan angka, supaya bisa dipakai sebagai gerbang.
"""
import json
import re
import sys

NUM = re.compile(r"\d[\d.,]*\s*%?")
ID = re.compile(r"\b([A-Z]{2,6}-?\d+(?:-\d+)?)\b")


def texts(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for k, v in o.items():
            if not str(k).startswith("_"):
                yield from texts(v)
    elif isinstance(o, list):
        for v in o:
            yield from texts(v)


def nums(s):
    return {n.strip().rstrip(".,") for n in NUM.findall(s) if re.search(r"\d", n)}


def fact_ids(rf):
    """ID -> 'ok' / 'unverified' / 'dicoret' dari baris raw_facts yang memuat ID itu.
    Prioritas kalau ID muncul di beberapa baris: dicoret > interview > unverified > ok."""
    rank = {"ok": 0, "unverified": 1, "interview": 2, "dicoret": 3}
    status = {}
    for line in rf.splitlines():
        st = ("dicoret" if "DICORET" in line else "interview" if "🎤" in line
              else "unverified" if "UNVERIFIED" in line else "ok")
        for i in ID.findall(line):
            if i not in status or rank[st] > rank[status[i]]:
                status[i] = st
    return status


def known(status, i):
    """ID blok (mis. PROJ2) sah kalau ada ID turunannya (PROJ2-01)."""
    if i in status:
        return status[i]
    kids = [v for k, v in status.items() if k.startswith(i + "-")]
    if not kids:
        return None
    return "ok" if "ok" in kids else kids[0]


def check_sumber(data, status, path):
    bad = 0
    for sec in data.get("sections", []):
        for e in sec.get("entries", []):
            bl = e.get("bullets", [])
            if not bl:
                continue
            name = f'{e.get("role", "?")} / {e.get("org", "?")}'
            src = e.get("_sumber")
            if not isinstance(src, list):
                print(f"! {path}: entry '{name}' tidak punya _sumber (daftar ID per bullet)")
                bad += 1
                continue
            if len(src) != len(bl):
                print(f"! {path}: entry '{name}' punya {len(bl)} bullet tapi _sumber {len(src)} butir")
                bad += 1
            for k, ids in enumerate(src):
                ids = [ids] if isinstance(ids, str) else (ids or [])
                if not ids:
                    print(f"! {path}: entry '{name}' bullet {k + 1} tanpa ID sumber")
                    bad += 1
                for i in ids:
                    st = known(status, i)
                    if st is None:
                        print(f"! {path}: entry '{name}' bullet {k + 1}: ID {i} tidak ada di raw_facts")
                        bad += 1
                    elif st == "dicoret":
                        print(f"! {path}: entry '{name}' bullet {k + 1}: ID {i} bertanda DICORET")
                        bad += 1
                    elif st == "interview":
                        print(f"! {path}: entry '{name}' bullet {k + 1}: ID {i} berlabel INTERVIEW (hanya untuk cerita interview, bukan CV)")
                        bad += 1
                    elif st == "unverified":
                        print(f"  (peringatan) {path}: '{name}' bullet {k + 1}: ID {i} masih UNVERIFIED")
    return bad


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    with open(sys.argv[1], encoding="utf-8") as f:
        rf = f.read()
    status = fact_ids(rf)
    known_nums = nums(rf)
    bad = 0
    for path in sys.argv[2:]:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "sections" in data:
            bad += check_sumber(data, status, path)
        for t in texts(data):
            if len(t) < 12 or t.startswith("<TAILOR"):
                continue
            miss = sorted(n for n in nums(t) if n not in known_nums and len(n.strip("%")) >= 2)
            if miss:
                bad += 1
                print(f"! {path}: angka {miss} tidak ada di raw_facts: {t[:90]}")
    print("OK" if not bad else f"{bad} temuan")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
