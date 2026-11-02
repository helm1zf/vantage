#!/usr/bin/env python3
"""Sembunyikan file/folder "dapur" dari Finder supaya user non-IT cuma lihat yang perlu.

Cara pakai (aman diulang kapan saja, tidak mengubah nama/path apa pun):
    python3 ./--settings/scripts/hide_internal.py

Pakai flag Finder (chflags hidden di Mac / attrib +h di Windows), BUKAN ganti nama jadi
".nama", jadi semua rujukan path tetap jalan dan Nova tetap bisa baca-tulis.
Flag ini bisa hilang kalau file ditulis ulang, makanya script ini dipanggil juga oleh
verify_consistency.py. Yang SENGAJA tetap kelihatan: --- I N B O X ---/,
01_user_documents/materials/, PDF/DOCX hasil, Application_Tracker.xlsx.
"""
import fnmatch, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PACKAGE = os.path.dirname(ROOT)

# path relatif ke folder user
FIXED = ["CLAUDE.md", "--settings", "01_user_documents/--usersettings",
         "01_user_documents/raw_facts_about_you.md", "01_user_documents/strategi_pencarian.md",
         "01_user_documents/README.md"]
# (folder awal, pola nama, rekursif?)
PATTERNS = [
    (".", "*.bak", True),
    ("01_user_documents/your_recalling_journey", "*.md", True),
    ("01_user_documents/recommended_skill_for_you", "*.html", True),
    ("01_user_documents/00_other_cv_as_role_model", "README.md", True),
    ("02_workflow", "00_Draft", True),
    ("02_workflow", "*.py", True),
    ("02_workflow", "*.json", True),
    ("02_workflow/Laporan_Pagi", "_tools", False),
    ("02_workflow/Laporan_Pagi", "*.html", True),
    ("02_workflow/Laporan_Pagi", "*.json", True),
    ("01_user_documents/materials", "00_index.md", False),
    ("01_user_documents/materials", "*_about_*.md", True),
]
ANALISIS_MD = True          # 02_workflow/**/01_Analisis/*.md
TRACKER_KEEP = (".xlsx",)   # di 03_Tracker cuma .xlsx yang kelihatan


def hide(path):
    if not os.path.exists(path):
        return
    if sys.platform == "darwin":
        subprocess.run(["chflags", "hidden", path], check=False)
    elif os.name == "nt":
        subprocess.run(["attrib", "+h", path], check=False, shell=True)


def main():
    n = 0
    for rel in FIXED:
        hide(os.path.join(ROOT, rel)); n += 1
    for start, pat, rec in PATTERNS:
        base = os.path.join(ROOT, start)
        if not os.path.isdir(base):
            continue
        walker = os.walk(base) if rec else [(base, os.listdir(base), [])]
        for dirpath, dirs, files in walker:
            for name in list(dirs) + list(files):
                if fnmatch.fnmatch(name, pat):
                    hide(os.path.join(dirpath, name)); n += 1
    wf = os.path.join(ROOT, "02_workflow")
    for dirpath, dirs, files in os.walk(wf):
        if os.path.basename(dirpath) == "01_Analisis" and ANALISIS_MD:
            for f in files:
                if f.endswith(".md"):
                    hide(os.path.join(dirpath, f)); n += 1
    tr = os.path.join(wf, "03_Tracker")
    if os.path.isdir(tr):
        for f in os.listdir(tr):
            if not f.endswith(TRACKER_KEEP):
                hide(os.path.join(tr, f)); n += 1
    # level paket: _TEMPLATE dan CLAUDE.md di root paket (.claude/ sudah tersembunyi karena titik)
    for rel in ["_TEMPLATE", "CLAUDE.md"]:
        hide(os.path.join(PACKAGE, rel)); n += 1
    print(f"OK: {n} item dicek/disembunyikan.")


if __name__ == "__main__":
    main()
