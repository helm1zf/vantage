# Fase 3: Lamaran

Dari lowongan mentah sampai PDF lolos cek kualitas dan tercatat.

**File ini hanya indeks (penunjuk).** Aturan dan langkah rinci ada di file yang ditunjuk; jangan menyalin aturan ke sini supaya tidak basi. Nama file relatif ke `--settings/`. Peta empat fase: lihat `fase/` (satu file per fase).

## Lamaran, bagian 1: Cari dan Analisis

### Tahap 1: Cari lowongan
- **User:** Tidak ada (jalan otomatis jam 07.00 atau saat ketik "laporan pagi")
- **Agen:** Sinta
- **Input:** job_profile.md; "Yang aku cari" di CLAUDE.md; daily_jobs_seen.json
- **File:** `sop/laporan_pagi.md` (langkah 1-3); `agents/sinta.md`
- **Skrip:** -
- **Output:** Daftar kandidat dari berbagai sumber

### Tahap 2: Saring dan cek link resmi
- **User:** Tidak ada
- **Agen:** Sinta
- **Input:** Kandidat + teks iklan
- **File:** `sop/laporan_pagi.md` (langkah 4, Aturan link); --usersettings/daily_jobs_seen.json
- **Skrip:** `scripts/check_links.py`
- **Output:** Kandidat ≥ ambang dengan link resmi berstatus OK; Semua kandidat tercatat

### Tahap 3: Parse JD, petakan ke bukti
- **User:** Tempel link atau teks lowongan (atau "gas nomor N")
- **Agen:** Arga
- **Input:** JD: teks + link (tempel user) atau "gas nomor N"; raw_facts, blok ID relevan
- **File:** `sop/lamaran.md` (alur); `sop/lamaran_analisis.md` (langkah 1-2); `agents/arga.md`
- **Skrip:** -
- **Output:** 01_Analisis/JD.md; Analisis_Fit_Gap.md: tiap tugas ke ID bukti, gap jujur, baris "Pelajaran interview" kalau ada debrief (JD tempelan: disimpan ke folder saat eksekusi, lihat lamaran_analisis.md)

### Tahap 4: Skor dan skill gap
- **User:** Baca skor dan alasan; Baca rencana belajar kalau muncul
- **Agen:** Arga
- **Input:** Analisis_Fit_Gap.md
- **File:** `sop/lamaran_analisis.md` (langkah 3, 3b); --usersettings/JD_Insights.md; `sop/rencana_belajar.md`
- **Skrip:** `scripts/md_to_pdf.py`
- **Output:** Skor 0-100 + alasan; JD_Insights.md diperbarui; Gap muncul di 5 JD → rencana belajar PDF (QC Tari)

### Tahap 5: Laporan pagi (07.00)
- **User:** Baca laporan di Inbox from Nova; Balas "gas nomor N" untuk yang mau dilamar
- **Agen:** Arga, Nova
- **Input:** Kandidat lolos dari Sinta
- **File:** `sop/laporan_pagi.md` (langkah 5-9); `templates/laporan_pagi/` (content.json, layout.html)
- **Skrip:** `scripts/check_report.py`; `scripts/build_laporan_pagi.py`; `scripts/lib_render.py`
- **Output:** PDF + HTML + JSON, maksimal `maks_rekomendasi` rekomendasi (default 5) skor ≥ ambang; Dikirim ke Inbox from Nova

### Tahap 6: Putuskan: skip atau eksekusi
- **User:** Skor < ambang: jawab skip atau tetap eksekusi
- **Agen:** Arga, Nova
- **Input:** Skor
- **File:** `sop/lamaran_analisis.md` (langkah 3c); `sop/tabel_arah.md` (serah terima)
- **Skrip:** -
- **Output:** ≥ ambang: lanjut ke Bayu otomatis, user diberi tahu; < ambang: Nova tanya user

**Catatan:** Dua jalur masuk: laporan pagi otomatis (Sinta → Arga → Nova) dan JD yang ditempel user (langsung Arga).

## Lamaran, bagian 2: Dokumen dan Tracker

### Tahap 1: Isi CV dan cover letter (JSON)
- **User:** Jawab pertanyaan (tanggal mulai, bahasa, fakta yang belum tercatat)
- **Agen:** Bayu
- **Input:** Analisis_Fit_Gap.md; Blok ID raw_facts; identity.json
- **File:** `sop/lamaran_dokumen.md` (langkah 4); `sop/aturan_isi.md`; `sop/aturan_isi_contoh.md`; `templates/cv/`; `templates/cover_letter/`; `agents/bayu.md`
- **Skrip:** -
- **Output:** Folder DD-MM_Perusahaan_Posisi/ di 01_Pipeline; 00_Draft/cv_content.json dan cl_content.json

### Tahap 2: Build dan export PDF
- **User:** Tidak ada
- **Agen:** Bayu
- **Input:** JSON di 00_Draft/
- **File:** `sop/lamaran_dokumen.md` (langkah 5-6); templates/*/layout.html; `templates/master_cv/` (content.json); `sop/master_cv.md` (kalau Master CV)
- **Skrip:** `scripts/build_cv.py`; `scripts/build_cover_letter.py`; `scripts/export_pdf.py`; `scripts/build_master_cv.py`; `scripts/lib_schema.py`; `scripts/lib_placeholders.py`; `scripts/lib_links.py`; `scripts/lib_render.py`
- **Output:** PDF pratinjau + .docx; 02_ready_to_send/<Surname>_CV.pdf dan _Cover-Letter.pdf

### Tahap 3: Cek kualitas
- **User:** Kalau 3 putaran belum lulus: putuskan
- **Agen:** Tari
- **Input:** PDF terbaru; JD.md, Analisis_Fit_Gap.md; Blok ID raw_facts yang dikutip
- **File:** `sop/cek_kualitas.md`; `sop/aturan_isi.md`; `sop/lamaran_dokumen.md` (langkah 7); `agents/tari.md`
- **Skrip:** `scripts/check_keywords.py`; `scripts/check_facts.py`
- **Output:** 00_Draft/qc_report.md: LULUS atau PERBAIKAN (putaran n/3); PERBAIKAN → kembali ke tahap 1 (maks 3 putaran)

### Tahap 4: Fakta baru masuk raw_facts (opsional / ditunda)
- **User:** Konfirmasi angka dan tanggal persis
- **Agen:** Raka
- **Input:** "FAKTA BARU: ..." dari agen mana pun
- **File:** `sop/lamaran_dokumen.md` (langkah 9); `agents/raka.md`
- **Skrip:** -
- **Output:** Fakta dikonfirmasi user, ditambah (bukan ditimpa) ke raw_facts, sebelum dipakai

### Tahap 5: Tracker dan konfirmasi kirim
- **User:** Kirim lamaran sendiri ke perekrut; Bilang "sudah kukirim"
- **Agen:** Bayu, Nova
- **Input:** Konfirmasi user: sudah benar-benar dikirim
- **File:** `sop/lamaran_dokumen.md` (langkah 8); --usersettings/applications.json; `sop/lamaran.md` (Arsip folder)
- **Skrip:** build_tracker.py; `scripts/lib_schema.py`
- **Output:** Application_Tracker.xlsx; Status Applied hanya setelah konfirmasi; Folder pindah ke 02_Sent/<Jenis>/<Tahun>/<Bulan>/

### Tahap 6: Pengingat kabar
- **User:** Putuskan: kirim email tanya kabar atau tidak; Kabari kalau ada undangan, penolakan, offer
- **Agen:** Nova
- **Input:** Status Applied
- **File:** `sop/follow_up.md` (bagian 1); applications.json (next_action)
- **Skrip:** -
- **Output:** Pengingat; >6 minggu tanpa kabar: tawarkan status No Response; Undangan → Fase 4

**Catatan:** Belum LULUS dari Tari berarti belum boleh dinyatakan siap kirim. Dokumen dibuat dari JSON; edit manual di .docx/PDF hilang saat build ulang.
