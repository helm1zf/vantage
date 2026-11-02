#!/usr/bin/env python3
"""Cek link lowongan sebelum dikasih ke user: hidup, bukan agregator, dan iklannya benar.

Cara pakai (dari folder user):
    python3 ./--settings/scripts/check_links.py "https://karriere.rewe-group.com/..." --expect "Werkstudent Controlling"
    python3 ./--settings/scripts/check_links.py --json "02_workflow/Laporan_Pagi/YYYY-MM-DD/YYYY-MM-DD_Laporan_Pagi.json"

Dengan --json, semua link di "rekomendasi" dan "hampir_masuk" dicek, dan judul
posisinya dipakai sebagai --expect otomatis.

Status per link:
  OK          status 200, bukan agregator, tidak dialihkan ke beranda/hasil pencarian,
              dan (kalau --expect diisi) kata kunci judul posisi muncul di halaman
  AGREGATOR   StepStone/Indeed/LinkedIn/dll. Jangan dikasih ke user: cari iklan yang sama
              di situs karier resmi perusahaannya
  MATI        404/410, atau dialihkan ke beranda/hasil pencarian (iklan sudah tutup)
  JUDUL?      halaman hidup tapi judul posisinya tidak ketemu (bisa iklan lain). Buka sekali
              pakai WebFetch untuk memastikan. Sistem lamaran berbasis JavaScript (Workday,
              SuccessFactors, Personio, dll) dianggap OK kalau status 200 dan tidak dialihkan
  CEK MANUAL  situs menolak pengecekan otomatis (403/429), atau komputer tidak bisa menghubungi
              situsnya (internet putus/proxy/timeout). Buka sekali pakai WebFetch

Kenapa script, bukan dibaca Nova: cek status link itu murah kalau lewat script dan
mahal kalau tiap halaman dibaca penuh. Nova cukup membaca halaman yang statusnya
JUDUL? atau CEK MANUAL. Exit code 0 = semua OK.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from urllib.parse import urlparse

# Situs pengumpul lowongan. Dipakai buat MENEMUKAN lowongan, tidak pernah dikasih ke user.
AGGREGATORS = {
    "stepstone": "StepStone", "indeed": "Indeed", "linkedin": "LinkedIn",
    "glassdoor": "Glassdoor", "monster": "Monster", "jobware": "Jobware",
    "kimeta": "Kimeta", "joblift": "Joblift", "jooble": "Jooble", "talent.com": "Talent.com",
    "careerjet": "Careerjet", "xing.com": "XING", "arbeitsagentur": "Arbeitsagentur",
    "meinestadt": "meinestadt", "jobmensa": "Jobmensa", "studentjob": "Studentjob",
    "absolventa": "Absolventa", "praktikum.info": "Praktikum.info", "get-in-it": "get in IT",
    "jobteaser": "JobTeaser", "simplyhired": "SimplyHired", "ziprecruiter": "ZipRecruiter",
}
# Sistem lamaran yang memuat isi lewat JavaScript: judul sering tidak ada di HTML awal.
JS_ATS = ("myworkdayjobs.com", "successfactors", "jobs.sap.com", "jobs.personio",
          "smartrecruiters.com", "greenhouse.io", "lever.co", "softgarden.io", "join.com")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
STOPWORDS = {"m", "w", "d", "f", "x", "mwd", "wmd", "all", "genders", "und", "and", "the",
             "der", "die", "das", "in", "im", "for", "fur", "für", "mit", "with", "of", "a"}


def aggregator_name(url):
    host = (urlparse(url).hostname or "").lower()
    full = host + (urlparse(url).path or "").lower()
    for key, name in AGGREGATORS.items():
        if key in host or (("." in key) and key in full):
            return name
    return None


def keywords(title):
    words = re.findall(r"[A-Za-zÄÖÜäöüß0-9+#]{3,}", title or "")
    return [w.lower() for w in words if w.lower() not in STOPWORDS]


def looks_like_listing(final_url):
    path = (urlparse(final_url).path or "").strip("/").lower()
    if not path:
        return True
    return bool(re.search(r"(^|/)(search|suche|jobs/?$|stellenangebote/?$|karriere/?$|careers/?$)",
                          path + ("/" if not path.endswith("/") else "")))


def fetch(url):
    """(status, url_akhir, isi). Pakai curl kalau ada (sertifikat SSL ikut sistem; Python
    bawaan python.org di Mac sering tidak punya sertifikat dan menganggap semua link mati)."""
    curl = shutil.which("curl")
    if curl:
        fd, tmp = tempfile.mkstemp()
        os.close(fd)
        try:
            r = subprocess.run([curl, "-sSL", "--compressed", "--max-time", "25", "-A", UA,
                                "-H", "Accept-Language: de,en;q=0.8", "-o", tmp,
                                "-w", "%{http_code} %{url_effective}", url],
                               capture_output=True, text=True)
            if r.returncode != 0:
                return 0, url, r.stderr.strip()[:80]
            code, final = r.stdout.strip().split(" ", 1)
            with open(tmp, "rb") as f:
                return int(code), final, f.read(600_000).decode("utf-8", "ignore")
        finally:
            os.remove(tmp)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "de,en;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.geturl(), r.read(600_000).decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, url, ""
    except Exception as e:  # noqa: BLE001
        return 0, url, type(e).__name__


def check(url, expect=""):
    agg = aggregator_name(url)
    if agg:
        return "AGREGATOR", agg
    code, final, body = fetch(url)
    if code in (401, 403, 429, 999):
        return "CEK MANUAL", f"HTTP {code}"
    if code == 0:
        # Gagal terhubung (internet putus, DNS, proxy, timeout) BUKAN bukti iklan mati:
        # jangan dibuang diam-diam, suruh cek manual.
        return "CEK MANUAL", "tidak bisa dihubungi dari komputer ini: " + (body or "tanpa pesan")
    if code >= 400:
        return "MATI", f"HTTP {code}"
    if final.rstrip("/") != url.rstrip("/") and looks_like_listing(final):
        return "MATI", f"dialihkan ke {final}"
    agg = aggregator_name(final)
    if agg:
        return "AGREGATOR", f"dialihkan ke {agg}"
    kws = keywords(expect)
    if kws:
        text = re.sub(r"<[^>]+>", " ", body).lower()
        hit = sum(1 for w in kws if w in text)
        if hit / len(kws) < 0.6:
            if any(d in (urlparse(final).hostname or "") + urlparse(final).path for d in JS_ATS):
                return "OK", "sistem lamaran berbasis JavaScript; judul tidak dicek"
            return "JUDUL?", f"{hit}/{len(kws)} kata judul ketemu"
    return "OK", final if final != url else ""


def from_json(path):
    data = json.load(open(path, encoding="utf-8"))
    for r in data.get("rekomendasi", []):
        yield r.get("link", ""), r.get("posisi", "")
    for n in data.get("hampir_masuk", []):
        yield n.get("link", ""), n.get("lowongan", "").split("—")[-1].split(",")[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("urls", nargs="*")
    ap.add_argument("--expect", default="", help="judul posisi yang harus muncul di halaman")
    ap.add_argument("--json", help="JSON Laporan Pagi; semua link di dalamnya dicek")
    args = ap.parse_args()
    jobs = list(from_json(args.json)) if args.json else [(u, args.expect) for u in args.urls]
    if not jobs:
        sys.exit(__doc__)
    bad = 0
    for url, expect in jobs:
        status, note = check(url, expect)
        bad += status != "OK"
        print(f"{status:<11} {url}" + (f"  ({note})" if note else ""))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
