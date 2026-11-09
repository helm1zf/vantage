#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cek hasil onboarding sebuah folder user (hanya MEMBACA, tidak mengubah apa pun).

    python3 -I check_onboarding.py <folder-user>
    python3 -I check_onboarding.py --selftest      # uji skrip ini sendiri (folder baik + 5 folder rusak)

Dipakai setelah tes onboarding di folder user baru. Mengecek keluaran Sesi 1-5:
job_profile.md punya target + skor + tebakan awal (min 3) + 5-8 topik wajib, kolom Relevan di materials/00_index.md
terisi, status.md punya baris Wawancara, raw_facts tidak memuat sisa <TAILOR>.
Exit code 0 = semua lolos, 1 = ada yang gagal.
"""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import os
import re
import sys


def read(p):
    try:
        with open(p, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return None


GOOD_JP = """## Target
Data Analyst, Werkstudent (78/100)
## Tebakan awal
- Data Analyst, Werkstudent (78/100): dua proyek Python ← dipilih
- Controlling, Praktikum (71/100): nilai akuntansi
- SAP Consultant, Praktikum (64/100): satu mata kuliah
## Topik wajib wawancara (target: Data Analyst, Werkstudent)
- [ ] SQL → status: belum
- [x] Python → status: terisi
- [x] Viz → status: terisi
- [x] Statistik → status: gap
- [x] Stakeholder → status: terisi
"""


def selftest():
    """Bangun folder baik dan beberapa folder rusak di tempat sementara, pastikan skrip
    ini meloloskan yang baik dan menolak yang rusak."""
    import subprocess
    import tempfile

    def make(jp=GOOD_JP, idx_rel="ya", status="- Wawancara: Sesi 2\n", rf="- A ✅ VERIFIED\n"):
        d = tempfile.mkdtemp()
        u = os.path.join(d, "01_user_documents")
        os.makedirs(os.path.join(u, "--usersettings"))
        os.makedirs(os.path.join(u, "materials"))
        w = lambda p, t: open(os.path.join(u, p), "w", encoding="utf-8").write(t)
        w("--usersettings/job_profile.md", jp)
        w("--usersettings/status.md", status)
        w("materials/00_index.md", "| ID | File | Nama asli | Relevan | a | b | c | d |\n|---|---|---|---|---|---|---|---|\n"
          f"| EDU1 | x | y | {idx_rel} | v | | | |\n")
        w("raw_facts_about_you.md", rf)
        return d

    cases = [
        ("baik", make(), 0),
        ("tanpa tebakan", make(jp=GOOD_JP.replace("## Tebakan awal", "## Lain")), 1),
        ("topik cuma 3", make(jp=GOOD_JP.replace("- [x] Viz → status: terisi\n", "").replace(
            "- [x] Statistik → status: gap\n", "").replace("- [x] Stakeholder → status: terisi\n", "")), 1),
        ("kolom Relevan kosong", make(idx_rel=""), 1),
        ("status tanpa Wawancara", make(status="- selesai\n"), 1),
        ("raw_facts masih <TAILOR", make(rf="<TAILOR: isi>\n"), 1),
    ]
    fails = 0
    for name, d, want in cases:
        r = subprocess.run([sys.executable, "-I", os.path.abspath(__file__), d], capture_output=True, text=True)
        ok = r.returncode == want
        fails += not ok
        print(("  v " if ok else "  x ") + f"selftest '{name}': harapan exit {want}, dapat {r.returncode}")
    return 1 if fails else 0


def main():
    if len(sys.argv) == 2 and sys.argv[1] == "--selftest":
        return selftest()
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        print(__doc__)
        return 2
    root = sys.argv[1]
    ud = os.path.join(root, "01_user_documents")
    res = []

    def check(ok, label, detail=""):
        res.append(ok)
        print(("  v " if ok else "  x ") + label + (f" — {detail}" if detail and not ok else ""))

    jp = read(os.path.join(ud, "--usersettings", "job_profile.md"))
    check(jp is not None, "job_profile.md ada")
    if jp:
        check(bool(re.search(r"\d{1,3}\s*/\s*100", jp)), "ada skor kecocokan (mis. 78/100)")
        check(bool(re.search(r"Werkstudent|Praktikum|Teilzeit|Vollzeit", jp)), "level target disebut")
        g = re.search(r"## Tebakan awal[^\n]*\n(.*?)(?=\n## |\Z)", jp, re.S)
        guesses = re.findall(r"^- .+?\(\s*(\d{1,3})\s*/\s*100\s*\)", g.group(1), re.M) if g else []
        check(len(guesses) >= 3, "Tebakan awal: minimal 3 target berskor", f"ditemukan {len(guesses)}")
        check(all(0 <= int(x) <= 100 for x in guesses) and bool(guesses), "skor tebakan 0-100")
        check(bool(g) and "← dipilih" in g.group(1), "ada satu target bertanda '← dipilih'")
        m = re.search(r"## Topik wajib[^\n]*\n(.*?)(?=\n## |\Z)", jp, re.S)
        topics = re.findall(r"^- \[[ xX]\] .+", m.group(1), re.M) if m else []
        check(5 <= len(topics) <= 8, "topik wajib 5-8 butir", f"ditemukan {len(topics)}")
        open_ = [t for t in topics if "status: belum" in t]
        print(f"    (topik belum selesai: {len(open_)} dari {len(topics)})")
        check(not re.search(r"<TAILOR", jp), "job_profile.md tanpa sisa <TAILOR>")

    idx = read(os.path.join(ud, "materials", "00_index.md"))
    check(idx is not None, "materials/00_index.md ada")
    if idx:
        rows = [r for r in idx.splitlines() if r.startswith("|") and not re.match(r"\|\s*(-|ID)", r)]
        vals = [r.split("|")[4].strip() for r in rows if r.count("|") >= 8]
        ok = [v for v in vals if re.match(r"(ya|pengisi:|tidak dibawa:)", v)]
        check(bool(vals) and len(ok) == len(vals), "kolom Relevan terisi di semua baris",
              f"{len(ok)} dari {len(vals)} valid (ya / pengisi: ... / tidak dibawa: ...)")

    st = read(os.path.join(ud, "--usersettings", "status.md"))
    check(bool(st) and "Wawancara:" in st, "status.md punya baris 'Wawancara:'")

    rf = read(os.path.join(ud, "raw_facts_about_you.md"))
    check(rf is not None, "raw_facts_about_you.md ada")
    if rf:
        check("<TAILOR" not in rf, "raw_facts tanpa sisa <TAILOR>")
        check(bool(re.search(r"✅|⚠️", rf)), "raw_facts punya fakta berlabel ✅/⚠️")

    print(f"\n{sum(res)} lolos, {len(res) - sum(res)} gagal")
    return 0 if all(res) else 1


if __name__ == "__main__":
    sys.exit(main())
