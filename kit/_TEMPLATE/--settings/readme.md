# Vantage — Panduan Teknis Starter Kit

Kerangka ini dipakai buat bikin CV & cover letter yang ditailor per lowongan, dibantu
Nova (asisten personal berbasis Claude Code), plus tracker buat ngukur response rate.
**File di sini generik** — kosong dari fakta siapapun — supaya bisa dipakai orang lain,
bukan cuma yang bikin. **Target pemakainya**: pencari kerja berbahasa Indonesia yang melamar
Werkstudent/Praktikum/posisi entry di Jerman. Bagian yang khusus itu (mis. topik izin kerja/visa di
`sop/persiapan_interview.md` bagian 9) dilewati kalau tidak relevan buat user.

**Peta per fase**: `fase/fase_1_setup.md` sampai `fase_4_interview.md` menunjuk agen, file, skrip, dan
output tiap tahap (indeks saja, aturannya tetap di file aslinya).

**Penting dari awal**: sistem ini BUKAN aplikasi sekali-klik. Bagian yang bikin CV kamu
BEDA dari template generic itu penalaran Nova (baca JD, cari bukti relevan, tulis
kalimat spesifik) — bukan sesuatu yang bisa "dijalankan otomatis tanpa mikir". Anggap
ini **resep + asisten yang bisa diajak diskusi**, bukan program yang dijalankan sendirian.

> ### Mulai dari sini
> Pasang aplikasi Vantage dan buka chat **Nova** (pojok kanan bawah), lalu kirim "halo". Aplikasi membuat folder kamu sendiri;
> sisanya dituntun lewat wawancara. Alur percakapan pertama ada di `--settings/onboarding/first_run.md`, laporan lowongan di
> `sop/laporan_pagi.md`. Kamu nggak perlu baca seluruh README ini dulu.

---

## Fase 0 — Prasyarat teknis

1. **Nova bisa membuka folder ini**: chat di aplikasi Vantage memakai Claude Code milikmu (login sekali dengan akun Claude).
   Cek alat lain dengan `python3 ./--settings/scripts/doctor.py`.
2. **Python** terinstall + package:
   `pip install python-docx openpyxl Pillow` — lalu tambahan sesuai OS:
   (ditambah `markdown` untuk PDF dokumen analisis). Tidak butuh pywin32, Word, atau
   LibreOffice lagi.
3. **Mesin PDF: Chrome atau Edge** — WAJIB. Semua PDF (CV, cover letter, Master CV,
   laporan pagi, dokumen analisis) dicetak lewat browser ini dengan template HTML yang
   sama (`scripts/lib_render.py`), jadi hasilnya sama di semua komputer. Windows hampir
   selalu sudah punya Edge; Mac pasang Google Chrome kalau belum ada.

## Fase 1 — Isi identitas kamu

Buka `01_user_documents/--usersettings/identity.json`, isi nama/alamat/email/LinkedIn. Ini
dibaca otomatis oleh semua script — **jangan edit file .py-nya**.

## Fase 2 — Bangun Raw Materials kamu (INI FONDASINYA, jangan diskip/dipercepat)

**Jangan diisi sendirian.** Buka Nova di folder ini, bilang:

> **"lanjut wawancara"**

Nova bakal **mewawancarai kamu** — kamu tinggal jawab, dia yang nulis ke
`raw_facts_about_you.md`. Nggak perlu nyiapin apa-apa dulu.

Kenapa diwawancara, bukan disuruh ngisi form: kalau ngisi sendiri, yang keluar hampir
selalu prosa CV generik ("bertanggung jawab atas pelaporan bulanan") yang nol nilainya —
nggak kepake di CV, nggak tahan pas ditanya interview. Bahan yang bagus justru ngumpet
di cerita mentah kamu, di bagian yang kamu kira nggak penting.

Proses ini normalnya **3-4 sesi**, bukan sekali duduk.

## Fase 3 — Isi CLAUDE.md (bukan opsional)

`CLAUDE.md` udah disediakan di **root folder kamu** (bukan di dalam `--settings/` ini —
sengaja ditaruh di root biar auto-load-nya reliable), tinggal isi bagian
`<TAILOR>`-nya (dikerjain bareng Nova di sesi terakhir onboarding).

File ini dibaca **otomatis tiap kali sesi baru dibuka di folder ini** — isinya aturan
personal kamu, jadi nggak perlu diulang tiap sesi dan nggak perlu nunggu berbulan-bulan
biar Nova "kebiasa" sama gaya kamu. Ini file dengan pengaruh terbesar per baris di
seluruh kit ini. Progres terkini TIDAK ditulis di situ, tapi di
`01_user_documents/--usersettings/status.md` (ditimpa tiap agent selesai tugas), biar chat
baru langsung nyambung tanpa kamu ngulang konteks.

## Fase 4 — Lamaran pertama

Ikuti `--settings/sop/lamaran.md` (satu-satunya sumber alur; jangan disalin ke sini).
Ringkasnya: lempar JD → Arga menganalisis dan memberi skor (≥ ambang lanjut otomatis; ambang default 80, bisa diatur di aplikasi) →
Bayu: `build_cv.py` + `build_cover_letter.py` → `export_pdf.py` → Tari memeriksa PDF
(`sop/cek_kualitas.md`) → update `applications.json` + `build_tracker.py`. Sekali saja, setelah lamaran pertama selesai,
bekukan fakta tetap (perusahaan, jabatan, tanggal, kampus, nilai) ke
`templates/cv/content.json` supaya lamaran berikutnya jauh lebih cepat (SOP langkah 4).

## Fase 5 — Kalibrasi (INI YANG PALING JUJUR: butuh WAKTU dan REPETISI)

Hit rate yang bagus BUKAN dari file ini doang — itu dari REPETISI LAMARAN NYATA +
belajar dari penolakan. Setiap kali ada pola gagal berulang (bahasa jadi gerbang keras,
klaim tertentu kurang meyakinkan, dll), **catat di bagian "Daftar hitam" di
raw_facts_about_you.md kamu sendiri** dan di `sop/aturan_isi.md` (tambahkan sebagai aturan baru,
lengkap dengan tanggal dan kejadian pemicunya — persis seperti struktur file ini dibangun).

**Kalau kamu cuma mau ambil satu hal dari kit ini, ambil ini:** yang bikin sistemnya
makin tajam bukan filenya, tapi kebiasaan **menulis tiap koreksi jadi aturan permanen**.
Koreksi yang kamu kasih dua kali ke Nova tapi nggak pernah ditulis, bakal kamu kasih
untuk ketiga kalinya di lamaran ke-20.

---

## Pindah Device atau Update Versi

Semua jalurnya di `sop/update.md`. Ringkas:

- **Update versi (komputer yang sama):** bilang "update" di chat Nova (atau tekan tawarannya). Nova menjalankan
  `scripts/apply_update.py`: membandingkan file sistem dengan kit terbaru, membuat cadangan, mengganti yang berubah. Data personal
  tidak pernah disentuh (`sop/update.md`).
- **Pindah komputer:** zip folder Vantage utuh, extract di komputer baru ke path pendek
  (mis. `C:\Vantage`).
- **Jangan pernah menyalin folder user lama ke Inbox** — itu penyebab utama error "path
  too long" (`sop/penamaan_file.md`).

`system_manifest.json` dan `UPDATE.md` (hanya daftar perubahan) dibuat `scripts/generate_update.py` dari `_TEMPLATE/`. Jangan edit manual.

---

## Struktur folder

Folder kerja kamu (namanya dari nama lengkap kamu, maks 20 karakter, mis. `santoso_budi/`):

```
CLAUDE.md                     <- disembunyikan. Aturan personal (bukan progres)
--- I N B O X ---/            <- taruh bahan mentah di sini; Nova langsung sortir ke materials/
--settings/                   <- disembunyikan, file sistem (diganti saat update)
  readme.md                   <- file ini
  agents/                     <- kartu tiap agent (nova, raka, sinta, arga, bayu, tari, laras)
  onboarding/                 <- first_run, wawancara_profil, wawancara/
  sop/                        <- tabel_arah (peta), lamaran (alur), aturan_isi,
                                 cek_kualitas, laporan_pagi, rencana_belajar, follow_up,
                                 about_item, persiapan_interview, catatan_pengalaman, master_cv,
                                 penamaan_file, update, privasi_backup
  scripts/                    <- build_* (bikin dokumen), lib_doc, export_pdf, doctor, apply_update,
                                 check_links, check_keywords, check_report, tidy_materials,
                                 hide_internal, verify_consistency, run_smoke_test,
                                 lib_* (pendukung)
  templates/                  <- satu folder per dokumen: content.json (isi) + layout.html (tampilan)
01_user_documents/            <- SEMUA data personal kamu
  raw_facts_about_you.md      <- sumber fakta tunggal
  interview_stories.md        <- cerita andalan interview (Laras)
  materials/                  <- bahan bukti, maks 1 subfolder per ID
    00_index.md               <- tabel kupas bahan + log nama asli
    00_Original_CV.*, 00_Photo.jpg
    <ID>_<Singkat>/bahan/...  <- <Singkat> maks 10 karakter
  00_other_cv_as_role_model/  <- opsional
  --usersettings/             <- disembunyikan, data teknis (jangan edit manual)
    identity.json, applications.json, JD_Insights.md, job_profile.md,
    status.md (progres terkini), daily_jobs_seen.json, activity.log
02_workflow/
  01_Pipeline/DD-MM_Perusahaan_Posisi/   <- lamaran aktif, RATA
  02_Sent/<Jenis>/<Tahun>/<Bulan>/DD-MM_Perusahaan_Posisi/   <- arsip, NESTED
  03_Tracker/build_tracker.py + Application_Tracker.xlsx
  Laporan_Pagi/YYYY-MM-DD/    <- laporan harian (+ NN_Perusahaan_Posisi/ per rekomendasi ≥ ambang)

Tiap folder lamaran punya 3 subfolder:
  00_Draft/          <- cv_content.json, cl_content.json, .docx + .pdf pratinjau, qc_report.md
  01_Analisis/       <- JD.pdf, Analisis_Fit_Gap.pdf (dari JD.md + JSON, build_analisis.py)
  02_ready_to_send/  <- PDF final (export_pdf.py), setelah Tari bilang LULUS
```

---

## Satu aturan yang berlaku di seluruh sistem

> **Yang di-generate itu sekali pakai. Yang diedit manusia itu sumber. Jangan kebalik.**

| Sumber (edit di sini) | Hasil (jangan disentuh) |
|---|---|
| `00_Draft/cv_content.json` / `cl_content.json` | `.docx`/PDF di `00_Draft/`, PDF final di `02_ready_to_send/` |
| `01_user_documents/--usersettings/applications.json` | `Application_Tracker.xlsx` |
| `raw_facts_about_you.md` | isi semua CV & cover letter |

Tiap generator membangun ulang outputnya **dari nol**, jadi apa pun yang kamu edit
langsung di hasil — termasuk foto yang dipasang manual di Word — hilang tanpa
pemberitahuan waktu di-generate lagi. Bukan bug: itu yang bikin formatnya nggak pernah
rusak pelan-pelan.

---

## Backup — jangan cuma andalkan kebetulan

Satu folder `01_user_documents/` (termasuk sub-folder `--usersettings/` yang hidden di
dalamnya) sudah mewakili SELURUH data personal kamu — itu didesain sengaja supaya
gampang dipindah/dicadangkan. Tapi kalau kamu naruh package ini di folder yang
otomatis sinkron ke cloud (iCloud Drive, OneDrive, Google Drive, dst), **itu
bukan strategi backup yang disengaja — itu kebetulan lokasi.** Sinkron cloud biasa
gak punya versioning yang diandalkan (kalau file rusak/kehapus lalu ke-sync, yang
di cloud ikut rusak/kehapus).

**Rekomendasi minimal:** sesekali (mis. abis milestone — lamaran pertama, abis
onboarding selesai) zip manual folder `01_user_documents/` dan simpan salinannya di
tempat lain (drive eksternal, cloud storage terpisah dengan versioning, dst). Ini
gak perlu otomatis — cukup jadi kebiasaan sesekali, bukan tiap hari.

## Version Control (untuk kode sistem, bukan data personal)

`_TEMPLATE/` (kode/dokumentasi sistem — bukan data personal siapa pun) sudah
dikelola pakai git, supaya tiap perubahan bisa di-diff dan di-rollback lewat
riwayat commit asli, bukan cuma narasi manual di `riwayat_migrasi.md`/`CLAUDE.md`.
`01_user_documents/` milik user (data personal, PII) **sengaja TIDAK** ikut masuk
git yang sama — riwayat git itu susah dihapus permanen, jadi data pribadi gak
punya alasan disimpan di situ selamanya. Update memakai `system_manifest.json` (hash tiap file sistem), bukan salinan teks.
