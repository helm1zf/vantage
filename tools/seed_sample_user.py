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
for n in ["00_Original_CV.pdf", "01_Transkrip_Nilai.pdf", "02_Skripsi_Forecasting.pdf"]:
    (M / n).write_bytes(b"%PDF-1.4\n%sample\n")
(M / "00_Photo.jpg").write_bytes(b"\xff\xd8\xff\xe0sample")
(M / "03_research").mkdir()
(M / "03_research" / "paper_ARIMA.pdf").write_bytes(b"%PDF-1.4\n")
idx = M / "00_index.md"
idx.write_text(idx.read_text(encoding="utf-8") + "| 00 | `00_Original_CV.pdf` | CV_Putri_2025.pdf | ya | ya | 12 | ya | - |\n"
               "| 01 | `01_Transkrip_Nilai.pdf` | transkrip.pdf | ya | ya | 4 | sebagian | - |\n"
               "| 02 | `02_Skripsi_Forecasting.pdf` | Skripsi FINAL.pdf | ya | sebagian | 3 | belum | - |\n", encoding="utf-8")
(U / "01_user_documents" / "raw_facts_about_you.md").write_text(
    "# Raw facts\n\n- [F01] S1 Statistika, Universitas Indonesia, 2019–2023, IPK 3,62\n- [F02] Skripsi: forecasting penjualan ritel dengan ARIMA dan Prophet\n", encoding="utf-8")

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
