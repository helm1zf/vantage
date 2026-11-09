#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tes Vantage dalam satu perintah:
  langkah 0  validasi skema (lib_schema.py) — logic cek identity.json/applications.json
  langkah 1-6  smoke test end-to-end build_cv.py, build_cover_letter.py, export_pdf.py,
               build_laporan_pagi.py, check_facts.py (lolos dan menolak), build_tracker.py,
               build_analisis.py (JD.pdf + Analisis_Fit_Gap.pdf v2, lolos dan menolak).

Bukan unit test granular — ini simulasi "user baru" ringkas: copy _TEMPLATE/ ke
folder sementara, isi identity.json + cv_content.json + cl_content.json dengan
data contoh valid (bukan <TAILOR> kosong), lalu jalankan pipeline builder penuh
dan cek tidak ada error serta berkas output benar-benar dihasilkan.

Kenapa ada file ini: sebelum ini, tiap perubahan ke builder script diverifikasi
manual satu-satu oleh siapa pun yang ngedit. Script ini otomatisasi pengecekan
paling dasar itu — bukan pengganti baca-render-PDF-manual buat perubahan visual/
layout, tapi cukup buat nangkep error jalur file dan crash sebelum itu ketauan
lewat pemakaian nyata.

Cara pakai: `python3 ./--settings/scripts/run_smoke_test.py` dari dalam _TEMPLATE/ (atau
folder mana pun yang punya struktur sama). Exit code 0 = semua builder jalan
tanpa error dan menghasilkan output yang diharapkan. Folder sementara dihapus
otomatis di akhir, baik sukses maupun gagal.
"""

import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))       # .../--settings
TEMPLATE_ROOT = os.path.dirname(os.path.dirname(HERE))   # _TEMPLATE/

SAMPLE_IDENTITY = {
    "name": "Budi Santoso",
    "surname": "Santoso",
    "contact_lines_cv": [
        "12345 Berlin, Germany (open to relocate)  ·  +49 1520 0000000",
        "budi.santoso@example.com  ·  linkedin.com/in/budisantoso"
    ],
    "contact_lines_cl": [
        "12345 Berlin, Germany",
        "+49 1520 0000000  ·  budi.santoso@example.com  ·  linkedin.com/in/budisantoso"
    ]
}

SAMPLE_CV = {
    "output": "CV_Santoso_SmokeTest.docx",
    "tagline": "Data Analysis · Process Automation · SAP",
    "profile": "Smoke-test profile paragraph, cukup panjang buat cek render tidak error.",
    "sections": [
        {
            "title": "Work Experience",
            "entries": [
                {
                    "role": "Werkstudent Data Analyst",
                    "org": "Contoh GmbH",
                    "right": "Berlin, Germany  |  01/2025 - Present",
                    "bullets": [["Analisis data", "Membangun dashboard Power BI untuk 5 tim, memangkas waktu laporan dari 3 hari jadi 4 jam."]],
                    "_sumber": [["ORG1-01"]]
                }
            ]
        },
        {
            "title": "Education",
            "entries": [
                {
                    "role": "B.Sc. Informatics",
                    "org": "Universitas Contoh",
                    "right": "Jakarta, Indonesia  |  2020 - 2024  |  GPA 3.7",
                    "bullets": [["", "Skripsi soal klasifikasi teks dengan akurasi 92%."]],
                    "_sumber": [["EDU1-01"]]
                }
            ]
        }
    ],
    "skills": [
        ["Technical", "Python, SQL, Power BI, SAP"],
        ["Languages & certifications", "English C1, German B2"]
    ]
}

SAMPLE_RAW = """## [ORG1] Contoh GmbH
**ORG1-01** ✅ Werkstudent Data Analyst di Contoh GmbH, Berlin, 01/2025 - sekarang. Dashboard Power BI untuk 5 tim, waktu laporan dari 3 hari jadi 4 jam.
## [EDU1] Universitas Contoh
**EDU1-01** ✅ B.Sc. Informatics, Universitas Contoh, Jakarta, 2020 - 2024, GPA 3.7. Skripsi klasifikasi teks, akurasi 92%.
"""

SAMPLE_CL = {
    "output": "Cover_Letter_SmokeTest.docx",
    "recipient": ["Contoh GmbH — Data Team", "Berlin"],
    "subject": "Application: Werkstudent Data Analyst (REQ-00000)",
    "availability_line": "Available 01/01/2026 - Present",
    "salutation": "Dear Hiring Team,",
    "body": [
        "Paragraf 1 — smoke test kait pembuka.",
        "Paragraf 2 — smoke test tugas inti JD.",
        "Paragraf 3 — smoke test tugas kedua.",
        "Paragraf 4 — smoke test sisi analitis.",
        "Paragraf 5 — smoke test gap skill terbuka.",
        "Paragraf 6 — smoke test ketersediaan dan ajakan bicara."
    ],
    "signoff": "Kind regards,"
}


SAMPLE_LAPORAN = {
    "_versi": 2, "tanggal": "2026-01-01", "run": 1, "status": "lengkap", "nama_panggilan": "Budi",
    "bahasa": "id", "ambang_skor": 80, "ambang_hampir": 70, "target_jumlah": 5, "jumlah_dianalisis": 3,
    "fokus": "Lamar Contoh GmbH hari ini (±30 menit).",
    "pencarian": {"oleh": "Sinta", "sumber": ["LinkedIn", "Situs karier"], "kata_kunci": ["Werkstudent Data"],
                  "lokasi": ["Berlin"], "filter": ["Werkstudent", "Diposting ≤7 hari"], "gagal": [],
                  "corong": {"ditemukan": 9, "lolos_saring": 3, "link_resmi_ok": 2, "dianalisis_penuh": 1, "direkomendasikan": 1}},
    "perlu_aksi": [],
    "rekomendasi": [{
        "perusahaan": "Contoh GmbH", "posisi": "Werkstudent Data Analyst (m/w/d)", "jenis": "Werkstudent",
        "kota": "Berlin", "perjalanan": "±20 menit kereta", "diposting": "2025-12-30", "deadline": "", "skor": 86,
        "komponen": {"tugas": 36, "skill": 20, "bahasa": 14, "kontrak": 8, "nilai_tambah": 8},
        "cocok": "Dashboard Power BI cocok dengan tugas reporting (ORG1-01).", "gap": "SQL lanjutan belum ada bukti.",
        "riwayat": "", "usaha": {"dokumen": ["CV", "Cover letter"], "menit": 30}, "bahasa_lamaran": "EN",
        "link": "https://karriere.contoh-gmbh.de/jobs/12345-werkstudent-data-analyst",
        "aksi": "Lamar", "aksi_alasan": "Skor ≥85, analisis penuh selesai, tidak ada penghalang."
    }],
    "hampir_masuk": [{"skor": 74, "perusahaan": "Beispiel AG", "posisi": "Werkstudent Controlling", "kota": "Köln",
                      "alasan": "Butuh SAP FI tingkat lanjut.", "link": "https://jobs.beispiel-ag.de/job/werkstudent-controlling-987"}],
    "dilewati": {"link_tidak_ketemu": 0, "sudah_di_tracker": 0, "sudah_dilaporkan": 0, "skor_rendah": 1, "lainnya": 0, "lainnya_alasan": ""},
    "pola_gap": [], "catatan_pasar": []
}


def schema_tests():
    """Langkah 0: cek logic lib_schema.py sendiri. Kembalikan daftar yang gagal."""
    sys.path.insert(0, HERE)
    import lib_schema
    valid_id = {"name": "Budi Santoso", "surname": "Santoso",
                "contact_lines_cv": ["a"], "contact_lines_cl": ["b"]}
    valid_apps = {"applications": [{"id": "1", "perusahaan": "X", "posisi": "Y",
                                    "status": "Draft", "folder": "01_Pipeline/f"}]}
    v_id, v_apps = lib_schema.validate_identity, lib_schema.validate_applications
    checks = {
        "identity valid": v_id(valid_id) == [],
        "identity bukan dict": len(v_id(["x"])) == 1,
        "identity tanpa surname": any("surname" in e for e in v_id({"name": "X"})),
        "contact_lines_cv bukan list": any("contact_lines_cv" in e for e in
                                           v_id({**valid_id, "contact_lines_cv": "x"})),
        "applications valid": v_apps(valid_apps) == [],
        "applications bukan dict": len(v_apps([1, 2])) == 1,
        "key applications hilang": any("applications" in e for e in v_apps({})),
        "field folder hilang": any("folder" in e for e in v_apps(
            {"applications": [{"id": "1", "perusahaan": "X", "posisi": "Y", "status": "Draft"}]})),
        "id duplikat": any("dipakai lebih dari sekali" in e for e in v_apps({"applications": [
            {"id": "1", "perusahaan": "X", "posisi": "Y", "status": "Draft", "folder": "a"},
            {"id": "1", "perusahaan": "Z", "posisi": "W", "status": "Draft", "folder": "b"}]})),
    }
    return [name for name, ok in checks.items() if not ok]


def run(cmd, cwd):
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr


def main():
    tmp = tempfile.mkdtemp(prefix="vantage_smoketest_")
    ok = True
    print("0/6 validasi skema ...")
    gagal = schema_tests()
    if gagal:
        ok = False
        print(f"  GAGAL: {', '.join(gagal)}")
    else:
        print("  OK")
    try:
        work = os.path.join(tmp, "smoketest_user")
        shutil.copytree(TEMPLATE_ROOT, work, ignore=shutil.ignore_patterns(
            "__pycache__", "*.pyc", ".git", ".gitignore"))

        identity_path = os.path.join(work, "01_user_documents", "--usersettings", "identity.json")
        with open(identity_path, "w", encoding="utf-8") as f:
            json.dump(SAMPLE_IDENTITY, f, ensure_ascii=False, indent=2)

        draft_dir = os.path.join(work, "02_workflow", "01_Pipeline", "01-01_ContohGmbH_Smoke-Test", "00_Draft")
        os.makedirs(draft_dir, exist_ok=True)
        cv_path = os.path.join(draft_dir, "cv_content.json")
        cl_path = os.path.join(draft_dir, "cl_content.json")
        with open(cv_path, "w", encoding="utf-8") as f:
            json.dump(SAMPLE_CV, f, ensure_ascii=False, indent=2)
        with open(cl_path, "w", encoding="utf-8") as f:
            json.dump(SAMPLE_CL, f, ensure_ascii=False, indent=2)

        master = os.path.join(work, "--settings", "scripts")

        print("1/6 build_cv.py ...")
        rc, out, err = run([sys.executable, os.path.join(master, "build_cv.py"), cv_path], work)
        if rc != 0:
            ok = False
            print(f"  GAGAL (exit {rc})\n{out}\n{err}")
        elif not os.path.isfile(os.path.join(draft_dir, "CV_Santoso_SmokeTest.docx")):
            ok = False
            print("  GAGAL: .docx CV tidak ditemukan sesudah build")
        else:
            print("  OK")

        print("2/6 build_cover_letter.py ...")
        rc, out, err = run([sys.executable, os.path.join(master, "build_cover_letter.py"), cl_path], work)
        if rc != 0:
            ok = False
            print(f"  GAGAL (exit {rc})\n{out}\n{err}")
        elif not os.path.isfile(os.path.join(draft_dir, "Cover_Letter_SmokeTest.docx")):
            ok = False
            print("  GAGAL: .docx Cover Letter tidak ditemukan sesudah build")
        else:
            print("  OK")

        print("3/6 export_pdf.py ...")
        lamaran_dir = os.path.join(work, "02_workflow", "01_Pipeline", "01-01_ContohGmbH_Smoke-Test")
        rc, out, err = run([sys.executable, os.path.join(master, "export_pdf.py"), lamaran_dir], work)
        ready_dir = os.path.join(lamaran_dir, "02_ready_to_send")
        pdfs = [f for f in os.listdir(ready_dir)] if os.path.isdir(ready_dir) else []
        if rc != 0:
            ok = False
            print(f"  GAGAL (exit {rc})\n{out}\n{err}")
        elif not any(f.endswith(".pdf") for f in pdfs):
            ok = False
            print(f"  GAGAL: tidak ada .pdf di 02_ready_to_send/ (isinya: {pdfs})")
        else:
            print(f"  OK — dihasilkan: {[f for f in pdfs if f.endswith('.pdf')]}")

        print("4/6 build_laporan_pagi.py ...")
        lp_dir = os.path.join(work, "02_workflow", "Laporan_Pagi", "2026-01-01")
        os.makedirs(lp_dir, exist_ok=True)
        lp_json = os.path.join(lp_dir, "2026-01-01_Laporan_Pagi.json")
        with open(lp_json, "w", encoding="utf-8") as f:
            json.dump(SAMPLE_LAPORAN, f, ensure_ascii=False, indent=2)
        rc, out, err = run([sys.executable, os.path.join(master, "build_laporan_pagi.py"), lp_json], work)
        readme_ok = os.path.isfile(os.path.join(lp_dir, "00_README.md"))
        bad = dict(SAMPLE_LAPORAN, rekomendasi=[dict(SAMPLE_LAPORAN["rekomendasi"][0], link="https://de.linkedin.com/jobs/view/1")])
        bad_json = os.path.join(lp_dir, "rusak_Laporan_Pagi.json")
        with open(bad_json, "w", encoding="utf-8") as f:
            json.dump(bad, f, ensure_ascii=False)
        rc_bad, _, _ = run([sys.executable, os.path.join(master, "check_report.py"), bad_json], work)
        os.remove(bad_json)
        # Ambang dan jumlah rekomendasi dari pengaturan user (search_settings.json), bukan angka mati.
        sys.path.insert(0, master)
        import check_report
        def rec(skor, aksi, n=0):
            r = dict(SAMPLE_LAPORAN["rekomendasi"][0], skor=skor, aksi=aksi, perusahaan=f"Contoh {n}",
                     link=f"https://karriere.contoh-gmbh.de/jobs/{12345 + n}-werkstudent-data-analyst")
            r["komponen"] = {"tugas": 36, "skill": 20, "bahasa": 14, "kontrak": 8, "nilai_tambah": skor - 78}
            return r
        def lap(ambang, recs, target=5):
            return dict(SAMPLE_LAPORAN, ambang_skor=ambang, ambang_hampir=ambang - 10, target_jumlah=target, rekomendasi=recs, hampir_masuk=[])
        amb_ok = (not check_report.validate(lap(75, [rec(78, "Analisis")]))
                  and any("butuh skor >= 80" in x for x in check_report.validate(lap(75, [rec(79, "Lamar")])))
                  and not check_report.validate(lap(75, [rec(80, "Lamar")]))
                  and any("< ambang 85" in x for x in check_report.validate(lap(85, [rec(84, "Analisis")])))
                  and check_report.validate(lap(99, [rec(86, "Lamar")])) != [])
        many_ok = (not check_report.validate(lap(80, [rec(86, "Lamar", i) for i in range(8)], target=8))
                   and check_report.validate(lap(80, [rec(86, "Lamar", i) for i in range(6)], target=5)) != []
                   and check_report.validate(lap(80, [rec(86, "Lamar")], target=51)) != [])
        settings = os.path.dirname(master)
        trig = all(os.path.isfile(p_) and "Morning Report" in open(p_, encoding="utf-8").read()
                   for p_ in (os.path.join(settings, "sop", "tabel_arah.md"), os.path.join(settings, "agents", "nova.md")))
        if rc != 0 or not os.path.isfile(lp_json[:-5] + ".pdf"):
            ok = False
            print(f"  GAGAL (exit {rc})\n{out}\n{err}")
        elif not amb_ok or not many_ok:
            ok = False
            print(f"  GAGAL: ambang dari pengaturan dipakai={amb_ok}, jumlah rekomendasi ikut maks_rekomendasi (1-50)={many_ok}")
        elif not readme_ok or rc_bad != 1 or not trig:
            ok = False
            print(f"  GAGAL: README ada={readme_ok}, check_report menolak link LinkedIn={rc_bad == 1}, pemicu Morning Report ada={trig}")
        else:
            print("  OK (PDF + 00_README.md, check_report menolak sampel rusak, ambang + maks rekomendasi dari pengaturan, pemicu Morning Report ada)")

        print("5/6 check_facts.py + build_tracker.py ...")
        raw_path = os.path.join(work, "01_user_documents", "raw_facts_about_you.md")
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(SAMPLE_RAW)
        rc, out, err = run([sys.executable, "-I", os.path.join(master, "check_facts.py"), raw_path, cv_path], work)
        bad_cv = os.path.join(draft_dir, "cv_tanpa_sumber.json")
        cv_bad = json.loads(json.dumps(SAMPLE_CV))
        for sec in cv_bad["sections"]:
            for e in sec["entries"]:
                e.pop("_sumber", None)
        with open(bad_cv, "w", encoding="utf-8") as f:
            json.dump(cv_bad, f, ensure_ascii=False)
        rc_bad, _, _ = run([sys.executable, "-I", os.path.join(master, "check_facts.py"), raw_path, bad_cv], work)
        os.remove(bad_cv)
        apps_path = os.path.join(work, "01_user_documents", "--usersettings", "applications.json")
        with open(apps_path, encoding="utf-8") as f:
            apps = json.load(f)
        apps["applications"] = [{"id": "2026-01-01_ContohGmbH", "perusahaan": "Contoh GmbH",
                                 "posisi": "Werkstudent Data Analyst", "status": "Draft",
                                 "folder": "01_Pipeline/01-01_ContohGmbH_Smoke-Test"}]
        with open(apps_path, "w", encoding="utf-8") as f:
            json.dump(apps, f, ensure_ascii=False)
        rc_tr, out_tr, err_tr = run([sys.executable, os.path.join(work, "02_workflow", "03_Tracker", "build_tracker.py")], work)
        if rc != 0:
            ok = False
            print(f"  GAGAL: check_facts menolak CV yang benar (exit {rc})\n{out}\n{err}")
        elif rc_bad == 0:
            ok = False
            print("  GAGAL: check_facts meloloskan CV tanpa _sumber")
        elif rc_tr != 0 or not os.path.isfile(os.path.join(work, "02_workflow", "03_Tracker", "Application_Tracker.xlsx")):
            ok = False
            print(f"  GAGAL: build_tracker.py (exit {rc_tr})\n{out_tr}\n{err_tr}")
        else:
            print("  OK")

        print("6/6 build_analisis.py (JD.pdf + Analisis_Fit_Gap.pdf) ...")
        an_dir = os.path.join(lamaran_dir, "01_Analisis")
        os.makedirs(an_dir, exist_ok=True)
        tpl = os.path.join(os.path.dirname(master), "templates")
        shutil.copy(os.path.join(tpl, "jd", "content.json"), os.path.join(an_dir, "JD.json"))
        shutil.copy(os.path.join(tpl, "fit_gap", "content.json"), os.path.join(an_dir, "Analisis_Fit_Gap.json"))
        jd_text = "Werkstudent Data Analytics (m/w/d)\n\nIhre Aufgaben:\n- Power-BI-Berichte pflegen  (Leerzeichen bleiben)\n- Äußerst sorgfältig <b>kein HTML</b>\n"
        with open(os.path.join(an_dir, "JD.md"), "w", encoding="utf-8") as f:
            f.write(jd_text)
        rc, out, err = run([sys.executable, os.path.join(master, "build_analisis.py"), an_dir], work)
        jd_pdf, fg_pdf = os.path.join(an_dir, "JD.pdf"), os.path.join(an_dir, "Analisis_Fit_Gap.pdf")
        verbatim = None
        try:
            from pypdf import PdfReader
            pages = PdfReader(jd_pdf).pages
            verbatim = len(pages) >= 2 and "Äußerst sorgfältig <b>kein HTML</b>" in "".join(p.extract_text() for p in pages[1:])
        except ImportError:
            pass
        except Exception:
            verbatim = False
        bad_fg = os.path.join(tmp, "rusak_fg")
        os.makedirs(bad_fg)
        fg = json.load(open(os.path.join(an_dir, "Analisis_Fit_Gap.json"), encoding="utf-8"))
        fg["skor"] = fg["skor"] + 5
        with open(os.path.join(bad_fg, "Analisis_Fit_Gap.json"), "w", encoding="utf-8") as f:
            json.dump(fg, f, ensure_ascii=False)
        rc_bad, _, _ = run([sys.executable, os.path.join(master, "build_analisis.py"), bad_fg], work)
        if rc != 0 or not os.path.isfile(jd_pdf) or not os.path.isfile(fg_pdf):
            ok = False
            print(f"  GAGAL (exit {rc})\n{out}\n{err}")
        elif verbatim is False or rc_bad != 1 or not os.path.isfile(os.path.join(an_dir, "Analisis_Fit_Gap.md")):
            ok = False
            print(f"  GAGAL: teks asli utuh di hal. 2={verbatim}, menolak skor != komponen={rc_bad == 1}")
        else:
            print("  OK (JD.pdf dengan teks asli utuh" + ("" if verbatim else ", isi tidak dicek: pypdf tidak ada") +
                  ", Analisis_Fit_Gap.pdf + .md, JSON rusak ditolak)")

    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print("\n=== SMOKE TEST", "PASSED ===" if ok else "FAILED ===")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
