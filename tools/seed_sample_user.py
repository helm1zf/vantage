"""Seed a realistic Vantage user for manual testing, through the kit's own scripts (as if she used Vantage for a few weeks).

usage: python3 tools/seed_sample_user.py <sandbox-home>
  creates <sandbox-home>/Documents/Vantage/ (package) with the user nurhaliza_putrisiti: 7 applications in every status (via
  add_application.py + move_application.py), an interview with Interview_Prep.json, 2 morning reports (check_report.py +
  build_laporan_pagi.py), skill gaps, a study plan, materials with a kupas table and an Inbox with umlauts and spaces.
Then run a build with that HOME, e.g.  HOME=<sandbox-home> ".../Vantage QA.app/Contents/MacOS/vantage-app"
Never point it at a real home folder: it replaces <sandbox-home>/Documents/Vantage. Exits 1 when any kit script fails.
tools/ui-tests/fixtures/realistic_user.json is what the backend read from a folder made by this script (23 Nov 2026).
"""
import datetime as dt
import json
import pathlib
import shutil
import subprocess
import sys

KIT = pathlib.Path(__file__).resolve().parents[1] / "kit"
HOME = pathlib.Path(sys.argv[1]).resolve()
if HOME == pathlib.Path.home().resolve():
    sys.exit("Refusing to seed the real home folder. Pass a sandbox folder.")
PKG = HOME / "Documents" / "Vantage"
U = PKG / "nurhaliza_putrisiti"
SC = U / "--settings" / "scripts"
TODAY = dt.date.today()
d = lambda n: (TODAY + dt.timedelta(days=n)).isoformat()
fails = []


def run(*args):
    r = subprocess.run([sys.executable, *map(str, args)], cwd=U, capture_output=True, text=True)
    print("OK  " if r.returncode == 0 else "FAIL", pathlib.Path(str(args[0])).name)
    if r.returncode:
        fails.append((args, r.stdout + r.stderr))
    return r


ign = shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store")
if PKG.exists():
    shutil.rmtree(PKG)
PKG.mkdir(parents=True)
shutil.copy(KIT / "CLAUDE.md", PKG)
shutil.copytree(KIT / ".claude", PKG / ".claude", ignore=ign)
shutil.copytree(KIT / "_TEMPLATE", PKG / "_TEMPLATE", ignore=ign)
shutil.copytree(KIT / "_TEMPLATE", U, ignore=ign)
shutil.rmtree(U / "--settings" / "docs")          # NOT_FOR_USERS in main.rs
(SC / "generate_update.py").unlink()

S = U / "01_user_documents" / "--usersettings"
idf = S / "identity.json"
ident = json.loads(idf.read_text(encoding="utf-8"))
ident.update(name="Putri Siti Nurhaliza", surname="Nurhaliza",
             contact_lines_cv=["80331 München, Germany (open to relocate)  ·  +49 151 0000000", "putri@example.com  ·  linkedin.com/in/putri-example"],
             contact_lines_cl=["80331 München, Germany", "+49 151 0000000  ·  putri@example.com  ·  linkedin.com/in/putri-example"])
idf.write_text(json.dumps(ident, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(S / "status.md").write_text(f"# Status — posisi terkini tiap urusan\n\n- [{d(-20)}] Onboarding: selesai\n- [{d(-6)}] Wawancara: selesai\n"
                             f"- [{d(-1)}] Lamaran: 7 lamaran, 1 interview (Müller & Söhne) {d(3)}\n", encoding="utf-8")

inbox = U / "--- I N B O X ---"
(inbox / "Zeugnis Praktikum Müller (final) v2.pdf").write_bytes(b"%PDF-1.4\n%sample\n")
(inbox / "Foto lamaran.JPG").write_bytes(b"\xff\xd8\xff\xe0sample")
(inbox / "Kode skripsi").mkdir()
(inbox / "Kode skripsi" / "main.py").write_text("print('hi')\n")

M = U / "01_user_documents" / "materials"


def pdf(path, lines):
    """A real one-page PDF with text (agents and the app can read it), no library needed."""
    esc_ = lambda t: t.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    text = "BT /F1 10 Tf 50 790 Td 13 TL " + " ".join(f"({esc_(l)}) '" for l in lines) + " ET"
    data = text.encode("latin-1", "replace")
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            b"<< /Length %d >>\nstream\n" % len(data) + data + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    out, offs = bytearray(b"%PDF-1.4\n"), []
    for i, o in enumerate(objs, 1):
        offs.append(len(out)); out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % o for o in offs)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
    pathlib.Path(path).write_bytes(bytes(out))


pdf(M / "00_Original_CV.pdf", ["Putri Siti Nurhaliza", "80331 Muenchen  |  +49 151 0000000  |  putri@example.com", "",
    "EDUCATION", "since 10/2024  M.Sc. Data Science, Ludwig-Maximilians-Universitaet Muenchen (current grade 1.7)",
    "2019 - 2023  S1 Statistika (B.Sc. Statistics), Universitas Indonesia, GPA 3.62/4.00", "",
    "EXPERIENCE", "05/2025 - today  Student tutor Statistics I, LMU Muenchen (8 h/week)",
    "02/2023 - 08/2024  Junior Data Analyst, PT Sumber Ritel Nusantara, Jakarta",
    "  - Weekly sales dashboard in Power BI for 42 stores, used by 3 regional managers",
    "  - Demand forecast (Python, Prophet) cut overstock in 2 pilot categories by 11 %",
    "07/2022 - 09/2022  Intern Finance & Controlling, PT Sumber Ritel Nusantara",
    "  - Monthly cost-centre report in Excel/SQL, closing 2 days faster", "",
    "SKILLS  Python (pandas, scikit-learn), SQL, R, Power BI, Excel; German B1, English C1"])
pdf(M / "01_Transkrip_Nilai.pdf", ["Universitas Indonesia - Academic Transcript", "Putri Siti Nurhaliza, S1 Statistika, 2019-2023",
    "Time Series Analysis  A", "Regression Analysis  A-", "Database Systems  A", "Data Mining  A-", "Econometrics  B+",
    "Final thesis: Forecasting retail sales with ARIMA and Prophet  A", "GPA 3.62 / 4.00, 146 credits"])
pdf(M / "02_Skripsi_Forecasting.pdf", ["Forecasting Retail Sales with ARIMA and Prophet (Bachelor thesis, 2023)",
    "Data: 3 years of daily sales, 42 stores, 1.2 million rows (SQL Server)",
    "Result: Prophet with holiday effects (Lebaran) MAPE 8.4 % vs ARIMA 12.9 %",
    "Tools: Python, pandas, Prophet, statsmodels; supervisor Dr. A. Wibowo"])
(M / "00_Photo.jpg").write_bytes(b"\xff\xd8\xff\xe0sample")
(M / "03_research").mkdir()
pdf(M / "03_research" / "paper_ARIMA.pdf", ["Seminar paper: ARIMA vs ETS for weekly demand, LMU 2025, grade 1.3"])
pdf(M / "04_Goethe_B1.pdf", ["Goethe-Zertifikat B1, Goethe-Institut Jakarta, 2024, 'gut'"])
pdf(M / "05_IELTS.pdf", ["IELTS Academic, overall band 7.5 (C1), 2023"])
idx = M / "00_index.md"
idx.write_text(idx.read_text(encoding="utf-8") + "| 00 | `00_Original_CV.pdf` | CV_Putri_2025.pdf | ya | ya | 12 | ya | - |\n"
               "| 01 | `01_Transkrip_Nilai.pdf` | transkrip.pdf | ya | ya | 4 | sebagian | - |\n"
               "| 02 | `02_Skripsi_Forecasting.pdf` | Skripsi FINAL.pdf | ya | sebagian | 3 | belum | - |\n"
               "| 04 | `04_Goethe_B1.pdf` | Goethe B1.pdf | ya | ya | 1 | ya | - |\n"
               "| 05 | `05_IELTS.pdf` | IELTS.pdf | ya | ya | 1 | ya | - |\n", encoding="utf-8")
# The profile the interview with Raka would have produced (the app counts a profile as done from 3 KB): Bayu builds a Master CV from it.
(U / "01_user_documents" / "raw_facts_about_you.md").write_text("""# Raw Materials — Putri Siti Nurhaliza

**Ini SUMBER FAKTA TUNGGAL buat semua CV/CL yang dibikin.** (Data contoh untuk tes, bukan orang sungguhan.)

---

## Kerangka yang tidak berubah
- Nama: Putri Siti Nurhaliza · 80331 München · +49 151 0000000 · putri@example.com · linkedin.com/in/putri-example
- Status: mahasiswa M.Sc. Data Science di LMU München (semester 3), izin kerja mahasiswa non-EU (maks. 20 jam/minggu saat kuliah)
- Bahasa: Indonesia (ibu), Inggris C1 (IELTS 7.5), Jerman B1 (Goethe-Zertifikat)

## Asal-usul
Lulusan Statistika UI yang 1,5 tahun jadi analis data di perusahaan ritel di Jakarta, lalu S2 Data Science di München sejak
Oktober 2024. Mencari Werkstudent di analitik data, controlling, atau BI; ingin full-time di Jerman setelah lulus.

---

## [ORG1] PT Sumber Ritel Nusantara — Junior Data Analyst (02/2023 – 08/2024, Jakarta)
Bukti: `materials/00_Original_CV.pdf`

**ORG1-01** ✅ Membangun dashboard penjualan mingguan di Power BI untuk 42 toko; dipakai 3 manajer regional tiap Senin.
**ORG1-02** ✅ Model forecast permintaan (Python, Prophet) untuk 2 kategori percontohan; overstock turun 11 % dalam 6 bulan.
**ORG1-03** ✅ Menulis query SQL (SQL Server) dan mengotomatiskan laporan Excel mingguan; hemat ±4 jam kerja tim per minggu.
**ORG1-04** ⚠️ Ikut proyek migrasi data ke data warehouse baru (peran: uji kualitas data); angka pastinya belum dicek.
**ORG1-05** 🎤 INTERVIEW Meyakinkan manajer toko yang skeptis dengan menunjukkan forecast vs penjualan nyata selama 4 minggu.

## [ORG2] PT Sumber Ritel Nusantara — Intern Finance & Controlling (07/2022 – 09/2022)
Bukti: `materials/00_Original_CV.pdf`

**ORG2-01** ✅ Menyusun laporan biaya per cost centre bulanan di Excel dan SQL; tutup buku bulanan 2 hari lebih cepat.
**ORG2-02** ✅ Membuat analisis varians anggaran vs realisasi untuk 6 departemen.

## [ORG3] LMU München — Tutor Statistik I (05/2025 – sekarang, 8 jam/minggu)

**ORG3-01** ✅ Mengajar 2 kelompok tutorial (±25 mahasiswa) dalam bahasa Inggris; menyiapkan latihan R tiap minggu.
**ORG3-02** ✅ Evaluasi tutor semester lalu 1,4 (skala Jerman).

---

## [EDU1] M.Sc. Data Science, Ludwig-Maximilians-Universität München (10/2024 – perkiraan 09/2026)

**EDU1-01** ✅ Nilai sementara 1,7. Mata kuliah: Machine Learning, Statistical Learning, Databases, Causal Inference.
**EDU1-02** ✅ Seminar: ARIMA vs ETS untuk permintaan mingguan, nilai 1,3.
Bukti: `materials/03_research/paper_ARIMA.pdf`

## [EDU2] S1 Statistika, Universitas Indonesia (2019 – 2023)
Bukti: `materials/01_Transkrip_Nilai.pdf`

**EDU2-01** ✅ IPK 3,62 / 4,00 (146 SKS). Nilai A di Time Series Analysis dan Database Systems.
**EDU2-02** ✅ Skripsi: forecasting penjualan ritel dengan ARIMA dan Prophet; 1,2 juta baris data, Prophet MAPE 8,4 % vs ARIMA 12,9 %.
Bukti: `materials/02_Skripsi_Forecasting.pdf`

---

## [SKL1] Skill & Tools

**SKL1-01** ✅ Python (pandas, scikit-learn, Prophet) — dipakai harian 2 tahun.
**SKL1-02** ✅ SQL (SQL Server, PostgreSQL) — query join/agregasi untuk laporan.
**SKL1-03** ✅ Power BI dan Excel (pivot, Power Query) — dashboard produksi.
**SKL1-04** ✅ R — mengajar di tutorial.
**SKL1-05** ⚠️ SAP S/4HANA — baru dasar lewat kursus online, belum dipakai kerja.

## [LNG1] Bahasa
Bukti: `materials/04_Goethe_B1.pdf`, `materials/05_IELTS.pdf`

**LNG1-01** ✅ Jerman B1 (Goethe-Zertifikat, 2024, "gut"); sedang kursus B2.
**LNG1-02** ✅ Inggris C1 (IELTS Academic 7.5, 2023).

---

## Bukti terkuat per tipe role
- Data Analytics / BI: ORG1-01, ORG1-02, EDU2-02, SKL1-01
- Controlling / FP&A: ORG2-01, ORG2-02, ORG1-03

---

## Daftar hitam — klaim yang pernah bermasalah
- "Fluent German": jangan dipakai, levelnya B1.
""", encoding="utf-8")
(U / "01_user_documents" / "interview_stories.md").write_text("""# Cerita andalan interview — milik Putri

## Jangkar "Tell me about yourself"

1. **Identitas:** mahasiswa M.Sc. Data Science di LMU yang sebelumnya 1,5 tahun analis data di ritel.
2. **Bukti andalan:** forecast permintaan dengan Prophet yang menurunkan overstock 11 % (ORG1-02).
3. **Kenapa perusahaan ini:** diisi per lamaran di `Interview_Prep/`

## Matriks 3 cerita universal

| Cerita | Masalah teknis / klien | Konflik tim / opini | Inisiatif mandiri |
|---|---|---|---|
| **A:** Forecast permintaan (ORG1-02) | data libur Lebaran merusak model | manajer toko skeptis (ORG1-05) | menguji 4 minggu sebelum dipakai |
| **B:** Dashboard 42 toko (ORG1-01) | data toko tidak seragam | prioritas KPI berbeda antar region | otomatisasi laporan Excel (ORG1-03) |
| **C:** Tutor Statistik (ORG3-01) | menjelaskan R ke pemula | mahasiswa yang menyalin tugas | membuat latihan tambahan |

## Celah CV dan cara menjawabnya

- Jerman baru B1 → sedang kursus B2, kerja tim sehari-hari di LMU dalam bahasa Inggris dan Jerman.
""", encoding="utf-8")
cm = U / "CLAUDE.md"
cm.write_text(cm.read_text(encoding="utf-8")
    .replace("- Nama: `<TAILOR>`", "- Nama: Putri Siti Nurhaliza (panggilan Putri)", 1)
    .replace("`<TAILOR: kota, negara — bersedia pindah ke mana>`", "München, Jerman; bersedia pindah ke seluruh Jerman", 1)
    .replace("`<TAILOR: mis. mahasiswa S2 semester 3, sambil kerja paruh waktu>`", "mahasiswa M.Sc. Data Science LMU semester 3, tutor 8 jam/minggu", 1)
    .replace("`<TAILOR: mis. non-EU, izin cuma berlaku di negara X, maks 20 jam/minggu — atau tulis \"tidak ada batasan\">`", "non-EU, izin kerja mahasiswa, maks. 20 jam/minggu saat kuliah", 1)
    .replace("`<TAILOR: mis. 2 minggu — atau \"tidak ada\">`", "tidak ada", 1)
    .replace("`<TAILOR: aku-kamu / gua-lu>`", "aku-kamu", 1)
    .replace("`<TAILOR: santai / normal / keras — default normal>`", "normal", 1)
    .replace("`<TAILOR: peran + level + skor, mis. Data Analyst, Werkstudent (78/100) — diisi di wawancara Sesi 1>`", "Werkstudent Data Analytics / BI (82/100)", 1)
    .replace("`<TAILOR: target cadangan, kalau ada>`", "Werkstudent Controlling / FP&A (76/100)", 1)
    .replace("`<TAILOR: nama lengkap user>`", "Putri Siti Nurhaliza", 1)
    .replace("`<TAILOR: mis. Inggris; Jerman kalau JD-nya Jerman>`", "Inggris; Jerman kalau JD-nya Jerman", 1)
    .replace("`<TAILOR: mis. Jerman B2, Inggris C1>`", "Jerman B1, Inggris C1", 1), encoding="utf-8")

apps = [("Müller & Söhne GmbH", "Werkstudent Controlling (m/w/d)", 88, d(10)), ("Siemens AG", "Working Student Data Analytics", 82, d(5)),
        ("Zalando SE", "Werkstudent Business Intelligence", 79, ""), ("Allianz SE", "Praktikum Finance & Risk", 74, d(-2)),
        ("BMW Group", "Werkstudent Supply Chain Analytics", 91, ""), ("Personio GmbH", "Working Student FP&A", 85, ""),
        ("Celonis SE", "Werkstudent Process Mining", 70, "")]
ids = {}
for i, (c, r, fit, dl) in enumerate(apps):
    out = run(SC / "add_application.py", json.dumps({"company": c, "role": r, "fit": fit, "deadline": dl, "source": "LinkedIn",
                                                     "link": f"https://jobs.example.com/{1000 + i}"}), U)
    try:
        ids[c] = json.loads(out.stdout.strip().splitlines()[-1])["id"]
    except (ValueError, IndexError, KeyError):
        pass
for c, st in [("Müller & Söhne GmbH", "Applied"), ("Müller & Söhne GmbH", "Interview R1"), ("Siemens AG", "Applied"), ("Zalando SE", "Applied"),
              ("Zalando SE", "Rejected"), ("BMW Group", "Applied"), ("BMW Group", "Offer"), ("Celonis SE", "Withdrawn")]:
    if c in ids:
        run(SC / "move_application.py", ids[c], st, U)

aj = S / "applications.json"
data = json.loads(aj.read_text(encoding="utf-8"))
for a in data["applications"]:
    if a["perusahaan"].startswith("Müller"):
        a["next_action"], a["next_action_due"] = "Interview 10:00", d(3)
        prep = U / "02_workflow" / a["folder"] / "Interview_Prep"
        prep.mkdir(parents=True, exist_ok=True)
        ip = json.loads((U / "--settings/templates/interview_prep/content.json").read_text(encoding="utf-8"))
        ip.update(perusahaan="Müller & Söhne GmbH", posisi="Werkstudent Controlling (m/w/d)", tanggal_interview=d(3))
        (prep / "Interview_Prep.json").write_text(json.dumps(ip, ensure_ascii=False, indent=2), encoding="utf-8")
        run(SC / "build_interview_prep.py", prep / "Interview_Prep.json", "--check")
aj.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

jd = S / "JD_Insights.md"
jd.write_text(jd.read_text(encoding="utf-8").replace(
    "| *(belum ada data — tabel ini keisi otomatis begitu JD pertama dianalisis)* | - | - | - | - |",
    "| SAP S/4HANA | 5 | Müller & Söhne; Siemens; BMW; Allianz; Personio | ya | Kurs openSAP S/4HANA Finance (gratis) |\n"
    "| Power BI | 4 | Zalando; Siemens; Celonis; BMW | ya | Sertifikat PL-300 |\n"
    "| Deutsch C1 | 3 | Müller & Söhne; Allianz; BMW | belum | Goethe C1 sebelum Maret |\n"
    "| Python (pandas) | 1 | Celonis | - | - |"), encoding="utf-8")

L = U / "01_user_documents" / "recommended_skill_for_you"
L.mkdir(exist_ok=True)
rb = json.loads((U / "--settings/templates/rencana_belajar/content.json").read_text(encoding="utf-8"))
rb.update(skill="SAP S/4HANA", tanggal=d(-3), muncul_di=5, total_jd=7)
(L / "SAP_S4HANA.json").write_text(json.dumps(rb, ensure_ascii=False, indent=2), encoding="utf-8")
run(SC / "build_rencana_belajar.py", L / "SAP_S4HANA.json", "--check")

tpl = json.loads((U / "--settings/templates/laporan_pagi/content.json").read_text(encoding="utf-8"))


def rec(i, co, pos, city, score, aksi, dl=""):
    k = {"tugas": 36, "skill": 22, "bahasa": 14, "kontrak": 9}
    k["nilai_tambah"] = score - sum(k.values())
    return {"perusahaan": co, "posisi": pos, "jenis": "Werkstudent", "kota": city, "diposting": d(-1), "skor": score, "komponen": k,
            "cocok": "Skripsi forecasting ARIMA [F02] cocok dengan tugas perencanaan", "gap": "SAP S/4HANA belum ada bukti",
            "bahasa_lamaran": "DE", "deadline": dl, "sumber": f"Situs karier {co}", "link": f"https://careers.example.com/{2000 + i}",
            "aksi": aksi, "aksi_alasan": "Skor tinggi dan tidak ada penghalang", "folder": f"01_{co.split()[0]}_Werkstudent",
            "usaha": {"dokumen": ["CV", "Cover letter"], "menit": 30}, "perjalanan": "±25 menit S-Bahn", "riwayat": ""}


for back in (1, 0):
    day = d(-back)
    r = json.loads(json.dumps(tpl))
    r.pop("_catatan", None)
    r.update(tanggal=day, run=1, nama_panggilan="Putri", jumlah_dianalisis=6, fokus="Kirim lamaran ke Knorr-Bremse sebelum deadline Jumat")
    r["pencarian"] = {"oleh": "Sinta", "sumber": ["StepStone", "LinkedIn"], "kata_kunci": ["Werkstudent Controlling", "Data Analyst"], "lokasi": ["München +30 km"],
                      "filter": ["Werkstudent", "≤ 7 hari"], "corong": {"ditemukan": 42, "lolos_saring": 11, "link_resmi_ok": 8, "dianalisis_penuh": 6, "direkomendasikan": 3}, "gagal": []}
    r["perlu_aksi"] = [{"tanggal": day, "jenis": "follow_up", "lamaran_id": ids.get("Siemens AG", ""), "lamaran": "Siemens AG — Data Analytics", "aksi": "Kirim follow-up singkat ke recruiter"}]
    r["rekomendasi"] = [rec(1, "Knorr-Bremse AG", "Werkstudent Controlling", "München", 89, "Lamar", d(4)), rec(2, "Rohde & Schwarz", "Werkstudent Finanzen", "München", 84, "Analisis"),
                        rec(3, "Infineon Technologies", "Working Student Reporting", "Neubiberg", 81, "Analisis")]
    r["hampir_masuk"] = [{"skor": 75, "perusahaan": "Wacker Chemie", "posisi": "Praktikum Controlling", "kota": "Burghausen", "alasan": "Lokasi jauh, 2 jam", "link": "https://careers.example.com/wacker"}]
    r["pola_gap"] = [{"skill": "SAP S/4HANA", "jumlah": 4, "dari": 6}]
    r["dilewati"] = {"link_tidak_ketemu": 2, "sudah_di_tracker": 1, "sudah_dilaporkan": 0, "skor_rendah": 5, "lainnya": 0, "lainnya_alasan": ""}
    folder = U / "02_workflow" / "Laporan_Pagi" / day
    folder.mkdir(parents=True, exist_ok=True)
    p = folder / f"{day}_Laporan_Pagi.json"
    p.write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
    run(SC / "check_report.py", p)
    run(SC / "build_laporan_pagi.py", p)

print(f"\n{len(fails)} kit script failure(s); user folder: {U}")
for a, o in fails:
    print("---", a[:2], "\n", o[-1500:])
sys.exit(1 if fails else 0)
