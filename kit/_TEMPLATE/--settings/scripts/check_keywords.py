#!/usr/bin/env python3
"""Cocokkan kata kunci lowongan (JD.md) dengan teks PDF lamaran. Alat bantu butir 11
sop/cek_kualitas.md: lebih konsisten daripada dicek dengan mata.

Cara pakai (dari folder user):
    python3 ./--settings/scripts/check_keywords.py "02_workflow/01_Pipeline/<folder>"
    python3 ./--settings/scripts/check_keywords.py "<folder>" --extra "Power BI, SAP FI"

Membaca `01_Analisis/JD.md` dan semua PDF di `02_ready_to_send/` (atau `00_Draft/` kalau
belum ada). Kata kunci diambil otomatis dari JD: nama alat/sistem (huruf kapital, angka,
singkatan seperti SAP, SQL, S/4HANA), frasa dua kata berhuruf kapital ("Power BI",
"Microsoft Excel"), dan kata penting yang muncul ≥2 kali. Tambahan manual lewat --extra.

Hasilnya daftar ADA / TIDAK ADA. "TIDAK ADA" bukan otomatis salah: kata itu harus
muncul di dokumen KALAU ada buktinya di raw_facts, atau tercatat sebagai gap di
Analisis_Fit_Gap.md. Keputusan tetap di Tari.
"""

import argparse
import os
import re
import sys
from collections import Counter

STOP = set("""
a an and are as at be by for from has have in is it its of on or our the their this to we
with you your will can who what which into within across about more most other such than
also using use used per all any both each every new our team role job work working
der die das und oder mit für fur von zu im in ist sind ein eine einer eines den dem des
wir sie ihr ihre ihren unser unsere unseren bei als auf aus nach über uber sowie werden
wird kannst kannst bist du dein deine deinen dich dir uns sich auch noch nur sehr gute
gut erste ersten idealerweise bereits mind mindestens oder bzw etc m w d mwd wmd all
aufgaben profil bieten benefits standort kontakt bewerbung bewerben jetzt
""".split())
KNOWN_TOOLS = set("""
python excel powerpoint outlook sharepoint tableau qlik jira confluence salesforce
hubspot java kotlin javascript typescript react angular docker kubernetes azure aws gcp linux
git github gitlab datev lexware figma photoshop illustrator canva scrum agile kanban erp crm
sql nosql mongodb postgresql mysql oracle spark hadoop airflow dbt looker matlab stata spss
""".split())
TOOLISH = re.compile(r"^(?:[A-Z0-9][A-Za-z0-9/+.#&-]*[A-Z0-9+#]|[A-Z]{2,}[a-z]*|[A-Za-z]+[0-9][A-Za-z0-9/]*)$")


def jd_keywords(text, extra):
    # Baris judul (nama perusahaan + judul posisi) tidak dihitung: itu bukan kata kunci isi.
    lines = text.strip().split("\n")
    if lines and lines[0].lstrip().startswith("#"):
        text = "\n".join(lines[1:])
    words = [w.strip(".&/") for w in re.findall(r"[A-Za-zÄÖÜäöüß0-9/+.#&]+", text)]
    words = [w for w in words if w]
    found = [w for w in words if w.lower() in KNOWN_TOOLS]
    for w in words:
        w = w.strip(".-/&")
        if len(w) >= 2 and TOOLISH.match(w) and w.lower() not in STOP:
            found.append(w)
    for a, b in re.findall(r"\b([A-Z][A-Za-z0-9]+)\s+([A-Z][A-Za-z0-9/]+)\b", text):
        if a.lower() not in STOP and b.lower() not in STOP:
            found.append(f"{a} {b}")
    freq = Counter(w.lower() for w in words if len(w) >= 5 and w.lower() not in STOP)
    found += [w for w, n in freq.items() if n >= 2]
    found += [x.strip() for x in extra.split(",") if x.strip()]
    seen, out = set(), []
    for k in found:
        key = k.lower()
        if key not in seen:
            seen.add(key)
            out.append(k)
    return out


def pdf_text(paths):
    try:
        from pypdf import PdfReader
    except ImportError:
        sys.exit("! butuh pypdf: pip install pypdf")
    parts = []
    for p in paths:
        for page in PdfReader(p).pages:
            parts.append(page.extract_text() or "")
    return re.sub(r"\s+", " ", " ".join(parts)).lower()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", help="folder lamaran")
    ap.add_argument("--extra", default="", help="kata kunci tambahan, pisahkan dengan koma")
    args = ap.parse_args()
    folder = os.path.abspath(args.folder)
    jd = os.path.join(folder, "01_Analisis", "JD.md")
    if not os.path.isfile(jd):
        sys.exit(f"! tidak ada {jd}")
    pdf_dir = os.path.join(folder, "02_ready_to_send")
    if not os.path.isdir(pdf_dir) or not any(f.endswith(".pdf") for f in os.listdir(pdf_dir)):
        pdf_dir = os.path.join(folder, "00_Draft")
    pdfs = [os.path.join(pdf_dir, f) for f in sorted(os.listdir(pdf_dir)) if f.endswith(".pdf")]
    if not pdfs:
        sys.exit("! tidak ada PDF di 02_ready_to_send/ atau 00_Draft/")
    keys = jd_keywords(open(jd, encoding="utf-8").read(), args.extra)
    text = pdf_text(pdfs)
    hit = [k for k in keys if k.lower() in text]
    miss = [k for k in keys if k.lower() not in text]
    print(f"PDF dicek: {', '.join(os.path.basename(p) for p in pdfs)}")
    print(f"\nADA ({len(hit)}): " + ", ".join(hit))
    print(f"\nTIDAK ADA ({len(miss)}): " + ", ".join(miss))
    print("\nTiap kata di TIDAK ADA: tambahkan kalau ada buktinya di raw_facts, atau pastikan "
          "tercatat sebagai gap di Analisis_Fit_Gap.md (sop/cek_kualitas.md butir 11).")


if __name__ == "__main__":
    main()
