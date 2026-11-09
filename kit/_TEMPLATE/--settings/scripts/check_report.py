#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cek Laporan Pagi v2 sebelum dibangun (sop/laporan_pagi.md). Dipanggil otomatis oleh
build_laporan_pagi.py; boleh juga dijalankan sendiri.

Cara pakai:
    python3 ./--settings/scripts/check_report.py "02_workflow/Laporan_Pagi/YYYY-MM-DD/YYYY-MM-DD_Laporan_Pagi.json"
    python3 ./--settings/scripts/check_report.py --readme "02_workflow/Laporan_Pagi/YYYY-MM-DD/00_README.md"
Hasil: `OK` (exit 0) atau daftar `GAGAL: ...` (exit 1).

Yang dicek: struktur (lib_schema.validate_report), skor >= ambang_skor, jumlah komponen = skor,
rentang hampir masuk, aturan aksi (Lamar butuh skor >= 85), link bukan agregator / bukan halaman
depan, tanggal valid dan tidak di masa depan, label pencarian <= 30 karakter, tidak ada
placeholder <...>, lamaran_id ada di applications.json, dan (untuk --readme) urutan bagian,
header tabel, maks 60 baris.
"""

import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib_schema  # noqa: E402
from check_links import aggregator_name  # noqa: E402

# Aksi Lamar butuh skor >= ambang_skor + 5 (default ambang 80 -> 85). Ambang diatur user di
# --usersettings/search_settings.json (60-95) dan dicatat di tiap laporan sebagai ambang_skor.
AMBANG_MIN, AMBANG_MAX, MAKS_REKOMENDASI = 60, 95, 50


def ambang_lamar(ambang):
    return min(100, int(ambang) + 5)
MAX_README_LINES = 60
README_SECTIONS = ["## 0.", "## 1.", "## 2.", "## 3.", "## 4.", "## 5.", "## 6."]
README_REC_HEADER = "| # | Perusahaan | Posisi | Jenis | Kota (perjalanan) | Skor | T/S/B/K/N | Diposting | Deadline | Butuh | Riwayat | Link | Aksi |"
README_REC_HEADER_LEGACY = "| # | Perusahaan | Posisi | Jenis | Kota | Skor | Diposting | Link | Catatan laporan asli |"
README_REC_HEADER_EN = "| # | Company | Role | Type | City (travel) | Score | T/S/L/C/E | Posted | Deadline | Needs | History | Link | Action |"


def link_error(link):
    """None kalau link kelihatan seperti iklan asli di situs resmi, selain itu alasannya."""
    link = str(link or "").strip()
    if not link.startswith("https://"):
        return f"link '{link}' harus https"
    rest = link.split("://", 1)[1]
    path = rest.split("/", 1)[1] if "/" in rest else ""
    if len(path.strip("/")) < 3:
        return f"link '{link}' cuma halaman depan; pakai link ke iklannya"
    agg = aggregator_name(link)
    if agg:
        return f"link '{link}' ke agregator ({agg}); pakai situs karier resmi"
    return None


def _date(s):
    try:
        return date.fromisoformat(str(s))
    except ValueError:
        return None


def _placeholders(data):
    body = json.dumps({k: v for k, v in data.items() if not k.startswith("_")}, ensure_ascii=False)
    return re.findall(r"<(?:TAILOR|[a-z_ ]{3,}[^>]*)>", body)


def find_applications(json_path):
    """applications.json milik user, dicari dari lokasi laporan (02_workflow/Laporan_Pagi/<tgl>/)."""
    root = os.path.abspath(os.path.join(os.path.dirname(json_path), "..", "..", ".."))
    p = os.path.join(root, "01_user_documents", "--usersettings", "applications.json")
    return p if os.path.isfile(p) else None


def validate(data, apps=None):
    errors = lib_schema.validate_report(data)
    if errors:
        return errors  # struktur dulu; cek isi butuh struktur yang benar
    if data.get("dikonversi_dari_lama") is True:
        return validate_legacy(data)
    hari = _date(data["tanggal"])
    ambang, hampir = data["ambang_skor"], data["ambang_hampir"]
    if not isinstance(ambang, int) or not AMBANG_MIN <= ambang <= AMBANG_MAX:
        errors.append(f"ambang_skor {ambang} harus angka {AMBANG_MIN}-{AMBANG_MAX}")
        return errors
    if not isinstance(hampir, int) or not 0 <= hampir < ambang:
        errors.append(f"ambang_hampir {hampir} harus angka di bawah ambang_skor {ambang} (biasanya ambang - 10)")
        return errors
    ids = {str(a.get("id")) for a in (apps or {}).get("applications", [])} if apps else None

    for i, r in enumerate(data["rekomendasi"], 1):
        tag = f"rekomendasi #{i} ({r['perusahaan']})"
        if r["skor"] < ambang:
            errors.append(f"{tag}: skor {r['skor']} < ambang {ambang}; pindahkan ke hampir_masuk")
        total = sum(r["komponen"].values())
        if total != r["skor"]:
            errors.append(f"{tag}: jumlah komponen {total} != skor {r['skor']}")
        if r["aksi"] == "Lamar" and r["skor"] < ambang_lamar(ambang):
            errors.append(f"{tag}: aksi Lamar butuh skor >= {ambang_lamar(ambang)} (ambang {ambang} + 5); pakai Analisis")
        le = link_error(r["link"])
        if le:
            errors.append(f"{tag}: {le}")
        d = _date(r["diposting"])
        if d and hari and d > hari:
            errors.append(f"{tag}: diposting {r['diposting']} setelah tanggal laporan")
        if r.get("deadline") and _date(r["deadline"]) and hari and _date(r["deadline"]) < hari:
            errors.append(f"{tag}: deadline {r['deadline']} sudah lewat; jangan direkomendasikan")
    for i, n in enumerate(data["hampir_masuk"], 1):
        tag = f"hampir_masuk #{i} ({n['perusahaan']})"
        if not (hampir <= n["skor"] < ambang):
            errors.append(f"{tag}: skor {n['skor']} di luar rentang {hampir}-{ambang - 1}")
        le = link_error(n["link"])
        if le:
            errors.append(f"{tag}: {le}")
    for i, a in enumerate(data["perlu_aksi"], 1):
        tag = f"perlu_aksi #{i} ({a['lamaran']})"
        if a["jenis"] == "belum_dijawab":
            for k in ("dari_laporan", "skor", "link"):
                if not a.get(k):
                    errors.append(f"{tag}: belum_dijawab wajib punya '{k}'")
            dl = _date(a.get("dari_laporan", ""))
            if dl and hari and (hari - dl).days > 7:
                errors.append(f"{tag}: lebih dari 7 hari sejak {a['dari_laporan']}; catat 'tidak dijawab' dan hapus")
        if ids is not None and a.get("lamaran_id") and str(a["lamaran_id"]) not in ids:
            errors.append(f"{tag}: lamaran_id '{a['lamaran_id']}' tidak ada di applications.json")
    for k in ("sumber", "kata_kunci", "lokasi", "filter", "gagal"):
        for x in data["pencarian"].get(k, []):
            if len(str(x)) > 30:
                errors.append(f"pencarian.{k}: '{x}' lebih dari 30 karakter; pecah jadi label pendek")
    for ph in sorted(set(_placeholders(data))):
        errors.append(f"masih ada placeholder template: {ph}")
    return errors


def validate_legacy(data):
    """Laporan lama yang dikonversi: tidak ada aturan skor/aksi/link resmi (laporan lama tidak mencatatnya),
    tapi tanggal tetap harus masuk akal, label pendek, dan tidak ada placeholder."""
    errors = []
    hari = _date(data["tanggal"])
    for i, r in enumerate(data["rekomendasi"], 1):
        d = _date(r["diposting"]) if r["diposting"] else None
        if d and hari and d > hari:
            errors.append(f"rekomendasi #{i} ({r['perusahaan']}): diposting {r['diposting']} setelah tanggal laporan")
    for i, a in enumerate(data["perlu_aksi"], 1):
        if a["lewat"] != (_date(a["tanggal"]) < date.today()):
            errors.append(f"perlu_aksi #{i} ({a['lamaran']}): 'lewat' tidak sesuai tanggal {a['tanggal']}")
    for k in ("sumber", "kata_kunci", "lokasi", "filter", "gagal"):
        for x in data["pencarian"].get(k, []):
            if len(str(x)) > 30:
                errors.append(f"pencarian.{k}: '{x}' lebih dari 30 karakter; pecah jadi label pendek")
    for ph in sorted(set(_placeholders(data))):
        errors.append(f"masih ada placeholder template: {ph}")
    return errors


def validate_readme(text):
    errors = []
    lines = text.rstrip("\n").split("\n")
    if len(lines) > MAX_README_LINES:
        errors.append(f"00_README.md {len(lines)} baris, maksimal {MAX_README_LINES}")
    pos = []
    for s in README_SECTIONS:
        idx = next((i for i, l in enumerate(lines) if l.startswith(s)), -1)
        if idx < 0:
            errors.append(f"00_README.md: bagian '{s}' tidak ada")
        pos.append(idx)
    found = [p for p in pos if p >= 0]
    if found != sorted(found):
        errors.append("00_README.md: urutan bagian salah (harus 0 sampai 6)")
    if README_REC_HEADER not in lines and README_REC_HEADER_EN not in lines and README_REC_HEADER_LEGACY not in lines and not any("Tidak ada lowongan baru" in l or "No new postings" in l for l in lines):
        errors.append("00_README.md: header tabel rekomendasi tidak sesuai template")
    return errors


def main(argv):
    if len(argv) == 3 and argv[1] == "--readme":
        with open(argv[2], encoding="utf-8") as f:
            errors = validate_readme(f.read())
    elif len(argv) == 2:
        with open(argv[1], encoding="utf-8") as f:
            data = json.load(f)
        ap = find_applications(argv[1])
        apps = json.load(open(ap, encoding="utf-8")) if ap else None
        errors = validate(data, apps)
    else:
        print(__doc__)
        return 2
    if errors:
        for x in errors:
            print("GAGAL: " + x)
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
