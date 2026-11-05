# Riwayat Migrasi Vantage

<!-- Ditulis tangan, urut kronologis (lama → baru). Tambah satu blok `### [YYYY-MM-DD] judul`
     di akhir tiap ada perubahan struktur/perilaku, lalu jalankan generate_update.py. -->

### [2026-09-24] Rebrand "Job-Search Automation" -> "Vantage", persona jadi "Nova"

**Deteksi:** `CLAUDE.md` di root package masih menyebut "Job-Search Automation"
(bukan "Vantage"), ATAU ada dokumentasi (README.md, onboarding/wawancara_profil.md, sop/lamaran.md,
onboarding/first_run.md, dll) yang memakai kata "Claude" sebagai NAMA ASISTEN/PERSONA — beda
dari referensi ke "Claude Code" (nama produk/tool, itu TETAP dipakai apa adanya,
jangan diganti).

**Tindakan:** ganti tiap sebutan persona "Claude" (bukan "Claude Code") jadi "Nova"
di file-file user (terutama `CLAUDE.md` milik user, kalau ada catatan/preferensi yang
masih pakai kata "Claude" sebagai nama asisten). Untuk berkas SISTEM (--settings/,
dst), cukup replace wholesale pakai isi di bagian "Isi Lengkap Berkas Sistem" di bawah
— itu sudah terbrand "Nova" semua.

---

### [2026-09-24] Konsolidasi CLAUDE.md jadi SATU file di root folder pengguna

**Deteksi:** ada file `--settings/CLAUDE.md` di instalasi user.

**Tindakan:**
1. Baca isi `--settings/CLAUDE.md` (kalau ada bagian personal yang cuma ada di situ,
   bukan duplikat dari root `CLAUDE.md`) dan gabungkan ke `CLAUDE.md` di ROOT folder
   pengguna (sejajar `--settings/`, `01_user_documents/`, `02_workflow/`) — ini murni
   operasi TULIS ISI FILE, tidak butuh hapus/pindah apa pun, jadi selalu bisa
   dikerjakan berapa pun terbatasnya tool yang tersedia buatmu.
2. **Menghapus `--settings/CLAUDE.md` yang lama itu OPSIONAL, bukan syarat selesai.**
   Kalau kamu punya tool yang bisa menghapus file dan user sudah mengizinkan, boleh
   dihapus. Kalau tidak (baik karena keterbatasan tool ATAU karena kamu punya aturan
   sendiri soal tidak melakukan penghapusan permanen) — **itu tidak menghalangi
   migrasi ini dianggap selesai.** Cukup beri tahu user bahwa `--settings/CLAUDE.md`
   sudah tidak terpakai lagi (isinya sudah dipindah ke root) dan boleh mereka hapus
   sendiri manual kalau mau beres-beres, tapi itu murni kosmetik — SATU-SATUNYA
   `CLAUDE.md` yang dibaca sistem tetap yang di root, file lama itu jadi tidak
   berpengaruh sama sekali walau masih ada secara fisik.
3. Root `CLAUDE.md` sebaiknya tetap hidden (`chflags hidden` di Mac) sesudah diedit —
   edit file yang hidden biasanya reset flag hidden-nya balik ke kelihatan. Kalau
   tool untuk mengubah atribut hidden tidak tersedia buatmu, ini juga tidak
   menghalangi migrasi dianggap selesai — cukup beri tahu user file itu sebaiknya
   di-hide manual, ini kosmetik/kerapian, bukan yang menentukan sistemnya jalan
   atau tidak.

---

### [2026-09-24] Redesign alur "skor dulu, baru tanya" (bukan tanya dulu)

**Deteksi:** `--settings/sop/lamaran.md` milik user MASIH punya langkah "tanya user
dulu mau dilamar atau masih lihat-lihat" SEBELUM skor fit/gap dihitung — atau tidak
ada pembahasan soal skor >=70 auto-eksekusi / skor <70 baru tanya Skip-atau-Eksekusi.

**Tindakan:** replace `--settings/sop/lamaran.md` milik user WHOLESALE dengan isi di
bagian "Isi Lengkap Berkas Sistem" di bawah (file ini generik/non-personal, aman
ditimpa penuh — bukan tempat nyimpen data pribadi user).

---

### [2026-09-24] Data personal berujung di 01_user_documents/--usersettings/ (hidden)

**Deteksi:** ini bukan soal path lama yang spesifik — lihat `Langkah 1` di atas.
Kalau hasil scan & klasifikasi isi menemukan identity.json-like / applications.json-like
/ JD_Insights.md-like DI MANA PUN lokasinya sekarang, itu artinya blok migrasi ini
relevan.

**Tindakan (URUTAN PENTING, jangan dibalik):**
1. Pastikan `Langkah 1` (scan & klasifikasi isi) sudah dijalankan duluan — ketiga
   file ini (identity/applications/JD_Insights) harus sudah aman dipindah ke
   `01_user_documents/--usersettings/` SEBELUM lanjut ke poin 2 di bawah. Kalau
   `JD_Insights.md` tidak ketemu sama sekali di scan (bukan cuma "beda lokasi", tapi
   memang belum pernah ada), buat baru dari template di bagian "Isi Lengkap Berkas
   Sistem" (mulai kosong — ini beda dari "hilang", lihat `Langkah 0.5`).
2. Hidden-kan folder `01_user_documents/--usersettings/` (`chflags hidden` di Mac,
   `attrib +h` di Windows).
3. Replace WHOLESALE `--settings/build_cv.py`, `build_cover_letter.py`, `export_pdf.py`, dan
   `02_workflow/03_Tracker/build_tracker.py` (di mana pun ketiga/keempat file kode ini
   sekarang berada — kalau `--settings/` versi lama namanya beda, tetap taruh hasil
   replace-nya di `--settings/` yang standar) dengan isi di bagian "Isi Lengkap Berkas
   Sistem" di bawah — versi ini sudah baca dari path BARU
   (`01_user_documents/--usersettings/...`). JANGAN jalankan langkah ini SEBELUM poin 1
   selesai — kalau kodenya diganti duluan sementara datanya belum pindah, script baru
   itu bakal gagal nemuin file di lokasi barunya yang belum ada isinya.
4. Cek juga `01_user_documents/materials/` TIDAK sengaja ke-hidden (folder ini harus
   tetap KELIHATAN, beda dari `--usersettings/` di dalamnya yang harus hidden).

---

### [2026-09-24] Handbook.pdf ketinggalan (batasan UPDATE.md — baca sebelum lapor "selesai")

> **Usang sejak 2026-11-01:** Handbook dihapus dari Vantage. Abaikan entri ini; lihat entri terakhir.

**Deteksi:** `Handbook.pdf` user versi lama (6 halaman, belum ada halaman "Migrasi
dari Versi Lama").

**Tindakan:** UPDATE.md ini berupa TEKS, jadi TIDAK BISA membawa file PDF baru.
Kasih tau user secara eksplisit bahwa Handbook.pdf mereka sedikit ketinggalan
(bukan fatal — cuma dokumentasi, bukan mekanisme) dan minta file itu dikirim
terpisah kalau mereka mau versi terbarunya. Jangan diam-diam skip poin ini.

---

### [2026-09-24] 01_Pipeline/ jadi rata, 02_Sent/ jadi nested per Jenis/Tahun/Bulan

**Deteksi:** folder lamaran user di `02_workflow/01_Pipeline/` dan/atau
`02_workflow/02_Sent/` masih berpola RATA `YYYY-MM-DD_Perusahaan_Posisi` langsung
di root masing-masing (belum ada level `Praktikum/Werkstudent/Teilzeit/Vollzeit/
Minijob` di `02_Sent/`).

**Alasan perubahan:** dua folder ini punya pola akses beda, jadi sengaja dibuat
beda strukturnya — bukan tidak konsisten:
- `01_Pipeline/` diakses SERING (cek status, tambah dokumen) dan isinya alami
  SEDIKIT (begitu closed langsung pindah ke Sent) — nesting di situ cuma nambah
  klik tanpa manfaat, jadi TETAP RATA, cukup ganti pola nama jadi
  `DD-MM_Perusahaan_Posisi` (tanggal-bulan di depan, bukan `YYYY-MM-DD` — `DD-MM`
  cuma 5 karakter, jadi nama perusahaan+posisi gak keburu ke-truncate jadi "...").
- `02_Sent/` diakses JARANG tapi menumpuk terus — di situ pengelompokan
  `<Jenis>/<Tahun>/<Bulan>/DD-MM_Perusahaan_Posisi/` baru kepake, mencegah satu
  folder isinya ratusan sub-folder rata yang susah di-scan.

**Tindakan:**
1. **Untuk folder yang statusnya masih di `01_Pipeline/`** (aktif/proses): CUKUP
   ganti nama dari `YYYY-MM-DD_Perusahaan_Posisi` ke `DD-MM_Perusahaan_Posisi`
   (buang bagian `YYYY-`, balik urutan jadi hari-bulan di depan) — tetap RATA
   langsung di `01_Pipeline/`, JANGAN dikasih sub-folder Jenis/Tahun/Bulan.
2. **Untuk folder yang statusnya sudah di `02_Sent/`** (arsip): tentukan
   `<Jenis>`-nya (Praktikum/Werkstudent/Teilzeit/Vollzeit/Minijob) dari field
   `tipe` di entri `applications.json` yang match (field `folder` di situ nunjuk
   ke folder yang sama) — field `tipe` biasanya sudah ada dan sudah benar,
   prioritaskan itu dibanding menebak ulang dari JD. Kalau tidak ada field `tipe`
   sama sekali, baru cek isi `01_Analisis/JD.md`/`Analisis_Fit_Gap.md`.
3. Pecah nama folder `YYYY-MM-DD_Perusahaan_Posisi` (di `02_Sent/`) jadi: `Tahun` =
   `YYYY`; `Bulan` = pola `Month_NN` dari `MM` (mis.
   `Month_05`, `Month_09`); sisanya jadi `DD-MM_Perusahaan_Posisi`.
4. **Logic penanda bulan aktif (prefix `00_`) di `02_Sent/<Jenis>/<Tahun>/`:**
   tentukan bulan HARI INI (bukan bulan folder yang lagi diproses), lalu:
   - Kalau ada folder ber-prefix `00_` dengan angka bulan BEDA dari bulan hari
     ini — itu bulan lama yang lupa "diturunin", rename `00_currentMonth_NN` → `Month_NN`.
   - Folder bulan HARI INI: pastikan ber-prefix `00_currentMonth_NN`. Buat baru
     langsung ber-prefix kalau belum ada, atau rename kalau sudah ada tapi belum
     ber-prefix.
   - Folder bulan LAIN (bukan hari ini, bukan yang barusan "diturunin") — biarkan
     apa adanya, TANPA prefix.
   - Cek ini SETIAP kali proses restrukturisasi jalan (murah dan idempotent),
     bukan cuma sekali di awal.
5. `mkdir -p` folder `<Jenis>/<Tahun>/<Bulan>/` (dengan/tanpa prefix `00_` sesuai
   poin 4) dulu kalau belum ada, baru `mv` folder lamarannya ke dalam situ.
6. Update field `folder` di `applications.json` untuk SETIAP entri yang foldernya
   dipindah/di-rename (baik di `01_Pipeline/` maupun `02_Sent/`) — supaya tetap
   match ke lokasi barunya, kalau tidak tracker Excel jadi nunjuk ke path yang
   sudah tidak ada.
7. Jalankan ulang `python 03_Tracker/build_tracker.py` sesudah semua `folder` di
   `applications.json` diperbarui, lalu verifikasi tracker-nya generate tanpa error.
8. Kalau ada folder di `02_Sent/` yang `<Jenis>`-nya tidak bisa dipastikan (tidak
   ada field `tipe`, JD/Analisis juga tidak menyebut kontraknya eksplisit) —
   JANGAN nebak. Tanya user dulu sebelum menaruhnya di kategori mana pun.

---

### [2026-09-25] Validasi skema JSON + smoke test + activity log

**Deteksi:** `--settings/` user belum punya `lib_schema.py` dan/atau `run_smoke_test.py`,
ATAU `build_cv.py`/`build_cover_letter.py`/`export_pdf.py`/`build_tracker.py` versi user
belum mengimpor `lib_schema` (cek: `import lib_schema` tidak ada di file-file itu).

**Tindakan:** replace WHOLESALE `--settings/build_cv.py`, `build_cover_letter.py`,
`export_pdf.py`, `lib_schema.py`, `run_smoke_test.py`, `verify_consistency.py`, dan
`02_workflow/03_Tracker/build_tracker.py` dengan isi di bagian "Isi Lengkap Berkas
Sistem" di bawah — semuanya generik/non-personal, aman ditimpa penuh. Ini
menambahkan: (a) validasi struktur dasar `identity.json`/`applications.json`
supaya kesalahan field ketauan dengan pesan jelas di titik input, bukan crash
samar di tengah builder; (b) `run_smoke_test.py`, simulasi user-baru end-to-end
buat verifikasi cepat builder masih jalan sesudah perubahan apa pun (jalankan
`python --settings/run_smoke_test.py` kapan pun ragu); (c) `verify_consistency.py`
sekarang juga menulis tiap hasil run-nya ke
`01_user_documents/--usersettings/activity.log` (append-only) — jejak audit persisten
yang independen dari transcript chat.

**Setelah replace, jalankan `python --settings/run_smoke_test.py` sekali** buat
pastikan builder masih berfungsi normal pasca-migrasi — bukan cuma dipercaya dari
tidak adanya error saat replace file.

---

### [2026-10-14] SOP baru, agent, prefix `00_` di materials/, nama folder bulan

**Deteksi:** salah satu file berikut belum ada di `--settings/` user: `sop/update.md`,
`sop/about_item.md`, `onboarding/project_mode.md`, `agents/readme.md`, `hide_internal.py`; ATAU
masih ada `01_user_documents/role_model/`, `materials/Photo.jpg`, `materials/Original_CV.*`,
atau folder bulan berpola `NN - NamaBulan` di `02_Sent/`.

**Tindakan:**
1. Buat file sistem yang belum ada dari bagian "Isi Lengkap Berkas Sistem".
2. Rename (isi tidak diubah): `01_user_documents/role_model/` →
   `00_other_cv_as_role_model/`; `materials/Photo.jpg` → `materials/00_Photo.jpg`;
   `materials/Original_CV.*` → `materials/00_Original_CV.*`.
3. Folder bulan di `02_Sent/<Jenis>/<Tahun>/`: `NN - NamaBulan` → `Month_NN`, dan
   `00_NN - NamaBulan` → `00_currentMonth_NN` (bulan berjalan). Perbarui kolom `folder`
   di `applications.json` yang menunjuk ke folder itu, lalu jalankan ulang
   `build_tracker.py`.
4. Tambah satu baris `sop/update.md` di "Baca juga" pada `CLAUDE.md` user (kalau belum
   ada). Bagian lain `CLAUDE.md` tidak diubah.
5. `MULAI_DI_SINI.md` tidak dipakai lagi. Biarkan; sebut di laporan bahwa user boleh
   menghapusnya sendiri.
6. Jalankan `python3 ./--settings/scripts/hide_internal.py` (Mac/Windows) supaya file "dapur"
   yang baru ikut tersembunyi.

---

### [2026-10-24] Nama folder dua strip, nama file snake_case, agent nyata, PDF tanpa Word

**Deteksi:** folder user masih punya salah satu dari: `00_Master/` atau `-settings/`
(satu strip), `01_user_documents/--usersettings/` atau `--usersetting/` (tanpa s), Inbox
bernama selain `--- I N B O X ---`, file berpola lama (`SOP_*.md`, `*_Builder.py`,
`Export_PDF.py`, `_schema.py`, `agents/0N_*.md`, `*.template.json`), folder
`02_workflow/Daily_Recommendation_From_Nova/`, atau bagian "Sesi terakhir" di `CLAUDE.md`.

**Tindakan (urut, isi data tidak diubah):**
1. **Folder:** `00_Master/` atau `-settings/` → `--settings/`;
   `01_user_documents/--usersettings/` atau `--usersetting/` → `--usersettings/`;
   `00_Inbox/` atau `------- I N B O X -------/` → `--- I N B O X ---/`;
   `02_workflow/Daily_Recommendation_From_Nova/` → `02_workflow/Laporan_Pagi/`.
2. **File sistem:** ganti seluruh isi `--settings/` dengan versi di "Isi Lengkap Berkas
   Sistem" (nama baru, mis. `sop/lamaran.md`, `scripts/build_cv.py`,
   `templates/cv/content.json`, `agents/raka.md`). Hapus file sistem bernama lama di
   `--settings/` setelah versi barunya terpasang. SOP pribadi user yang tidak ada di
   template (mis. `SOP_Recalling.md`) dipertahankan, cukup diganti nama ke pola baru
   (`sop/recalling.md`).
3. **Agent nyata:** pastikan folder paket punya `.claude/agents/` (raka, sinta, arga,
   bayu, tari, laras). Kalau datang lewat Paket Update, folder itu sudah ikut.
4. **Progres:** pindahkan isi bagian "Sesi terakhir" di `CLAUDE.md` user ke
   `--usersettings/status.md` (satu baris per urusan, apa adanya), lalu ganti bagian
   itu dengan bagian "Progres terkini" dari template. Bagian lain `CLAUDE.md` tidak
   diubah; tambahkan baris "Intensitas latihan interview: normal" di "Siapa aku" kalau
   belum ada.
5. **File kerja baru (kalau belum ada):** `01_user_documents/interview_stories.md` (dari
   `--settings/templates/interview_stories.md`; kalau user punya matriks cerita
   pribadi di salinan SOP interview lamanya, pindahkan isinya ke sini apa adanya),
   `01_user_documents/materials/00_index.md`, `--usersettings/status.md`.
6. **Ambang skor:** semua 80 (JD manual dan laporan pagi; "hampir masuk" 70-79). Tidak
   ada data yang perlu diubah.
7. **PDF:** tidak butuh Word/LibreOffice lagi; pastikan Chrome atau Edge ada
   (`--settings/onboarding/first_run.md` Langkah 0).
8. **Path panjang:** jalankan `python3 ./--settings/scripts/verify_consistency.py`. Ada
   peringatan `[path]` → tawarkan ke user `tidy_materials.py` (rencana dulu, lalu
   `--apply` setelah user setuju); path di raw_facts ikut diperbarui otomatis.
9. **File sistem yang tidak dipakai lagi** (hapus dari `--settings/` user kalau ada):
   `sop/migrasi.md` (digabung ke `sop/update.md`), `scripts/test_schema.py` (masuk ke
   `run_smoke_test.py`), `scripts/lib_simple_pdf.py` (PDF wajib lewat Chrome/Edge).
   `sop/lamaran.md` dipecah: aturan isi + contoh sekarang di `sop/aturan_isi.md`; aturan
   5x skill gap di `sop/rencana_belajar.md`. SOP baru: `follow_up.md`, `privasi_backup.md`.
   Script baru: `check_keywords.py`.
10. Jalankan `hide_internal.py`.

### [2026-10-30] Onboarding tebak-target, SOP dipecah per peran, router di CLAUDE.md

**Deteksi:** `--settings/onboarding/wawancara/` belum ada, atau `sop/lamaran_analisis.md` belum ada.

**Tindakan (urut):**
1. **File baru** (salin dari UPDATE.md): `onboarding/wawancara/*` (00_aturan, sesi1-5, kupas_bahan),
   `sop/lamaran_analisis.md`, `sop/lamaran_dokumen.md`, `sop/bank_arketipe.md`,
   `sop/aturan_isi_contoh.md`, `scripts/check_onboarding.py`, `scripts/check_facts.py`, `fase/fase_1_setup.md` .. `fase_4_interview.md` (indeks per fase).
2. **Replace wholesale** (sistem, tidak pernah dipersonalisasi): `onboarding/wawancara_profil.md`
   (sekarang daftar isi), `onboarding/first_run.md`, `project_mode.md`, `project_threads.md`,
   `sop/lamaran.md` (sekarang alur + folder), `sop/persiapan_interview.md`, kartu agent,
   `sop/tabel_arah.md`, `scripts/build_release.py`.
3. **`sop/aturan_isi.md`: GABUNG, jangan timpa mentah.** User sering menambah aturan personal
   bertanggal di file ini. Ambil versi baru, lalu tempel aturan personal user di bawah bagian
   "Aturan isi" (kecuali bagian bawaan lama "Kenapa file ini kelihatan cerewet" dan "Contoh
   konkret", yang sekarang dihapus / ada di `aturan_isi_contoh.md`).
4. **CLAUDE.md root dan CLAUDE.md user:** ikuti `sop/update.md` langkah 3b (ringkasan onboarding
   lama diganti penunjuk ke template; tambah tabel Router).
5. **`--usersettings/status.md`:** kalau onboarding user sudah selesai, tambah baris
   `Wawancara: selesai`; kalau belum, `Wawancara: belum mulai -> baca --settings/onboarding/wawancara/sesi1_target.md`.
6. Jalankan `hide_internal.py`, lalu `verify_consistency.py`.
7. **Loop debrief:** `sop/persiapan_interview.md` bagian 10 (format debrief + tabel tujuan pelajaran), `sop/follow_up.md` bagian 3 langkah 3, `sop/lamaran_analisis.md` baris "Pelajaran interview", `agents/laras.md` tugas 4: replace wholesale. `.gitignore` template: `--usersettings/` (sebelumnya salah ketik).
8. **Audit Fase 3 (2026-10-30/31), semua replace wholesale:** `sop/cek_kualitas.md` (rujukan kalibrasi + Master CV tidak ikut `check_facts`), `sop/tabel_arah.md` (path `--usersettings/status.md`), `sop/follow_up.md` (status `No Response`), `sop/laporan_pagi.md`, `sop/lamaran_analisis.md` (di mana analisis disimpan, beda skor onboarding), `agents/tari.md`, `agents/bayu.md`, `scripts/check_links.py` (gagal terhubung = CEK MANUAL, bukan MATI), `scripts/check_facts.py` (ID boleh `EDU-01`), `scripts/run_smoke_test.py` (+langkah 5), `templates/raw_facts.md` (contoh ID `EDU1-01`, `SKL1-01`), `fase/fase_3_lamaran.md`. `02_workflow/03_Tracker/build_tracker.py` (di luar `--settings`, tidak ikut UPDATE.md): hanya teks keterangan "No Response" (6 minggu), tidak wajib diubah di folder user lama. Template `raw_facts.md` hanya contoh: raw_facts user yang sudah ada TIDAK diubah.
9. **Audit Fase 1-2 (2026-10-31), replace wholesale:** `onboarding/wawancara/sesi1_target.md` (rujukan skor lowongan, kode blok `EDU1`/`SKL1`), `sesi2_gali.md`, `sesi5_tutup.md` (rujukan `aturan_isi.md`, `project_threads.md`), `onboarding/project_threads.md` ("raw_facts lengkap" = bahan Relevan `ya` saja), `agents/nova.md` (hak tulis saat setup), `readme.md`, `templates/raw_facts.md` (label `🎤 INTERVIEW`), `scripts/check_facts.py` (ID berlabel 🎤 ditolak di CV), `fase/*.md` (baris User per tahap).

### [2026-10-31] Morning Report (Laporan Pagi v2): JSON wajib, laporan 1 halaman, pemicu di tabel_arah

**Deteksi:** `--settings/scripts/check_report.py` belum ada, atau `sop/laporan_pagi.md` belum bertanda "(v2)".

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `sop/laporan_pagi.md`, `templates/laporan_pagi/content.json`,
   `templates/laporan_pagi/layout.html`, `scripts/build_laporan_pagi.py`, `scripts/lib_schema.py`
   (tambah `validate_report`), `scripts/verify_consistency.py` (cek 9), `scripts/run_smoke_test.py`
   (sampel v2). **File baru:** `scripts/check_report.py`.
2. **Kartu agent:** `agents/sinta.md` (tugas 6), `agents/arga.md` (tugas 6), `agents/nova.md` (penunjuk
   Morning Report): replace wholesale.
3. **`sop/tabel_arah.md`:** replace wholesale (baris pemicu baru + bagian 1b "Morning Report: pemicu dan balasan").
4. **CLAUDE.md user:** tambah satu butir di daftar panduan, di bawah butir `tabel_arah.md`:
   "**Morning Report:** kalau aku minta dicariin lowongan (kata-kata apa pun, bahasa apa pun) atau membalas
   laporan, ikuti `--settings/sop/tabel_arah.md` bagian 1b." **CLAUDE.md root paket:** baris router
   "laporan pagi" menunjuk `sop/tabel_arah.md` bagian 1b.
5. **Laporan lama** di `02_workflow/Laporan_Pagi/` TIDAK diubah; app Vantage menampilkannya sebagai format lama.
   Laporan berikutnya otomatis v2.
6. **Routine terjadwal di aplikasi Claude** (di luar folder, tidak ikut UPDATE.md): kalau prompt routine
   laporan pagi masih menyebut format lama, ganti isinya dengan prompt di `onboarding/project_threads.md`
   bagian "Routine laporan pagi" (isinya cukup menunjuk `sop/laporan_pagi.md`).
7. Jalankan `hide_internal.py`, lalu `verify_consistency.py` (cek 9 harus OK).

### [2026-11-01] JD.pdf dan Analisis_Fit_Gap.pdf layout v2 (JSON + builder, teks asli JD di akhir)

**Deteksi:** `--settings/scripts/build_analisis.py` belum ada, atau `--settings/templates/jd/` belum ada.

**Tindakan (urut):**
1. **File baru** (salin dari UPDATE.md): `scripts/build_analisis.py`, `templates/jd/content.json`,
   `templates/jd/layout.html`, `templates/fit_gap/content.json`, `templates/fit_gap/layout.html`.
2. **Replace wholesale** (sistem): `sop/lamaran_analisis.md` (bagian "Versi untuk user", tabel syarat,
   rincian komponen), `sop/laporan_pagi.md` (langkah 6), `sop/lamaran_dokumen.md` (struktur folder),
   `agents/arga.md`, `agents/bayu.md`, `readme.md`, `scripts/run_smoke_test.py` (langkah 6/6).
   Root paket: `.claude/agents/arga.md` (description).
3. **Cara kerja baru:** `01_Analisis/JD.md` = teks asli lowongan wortgleich; ringkasan di `JD.json`,
   analisis di `Analisis_Fit_Gap.json`; `build_analisis.py "<folder 01_Analisis>"` membuat `JD.pdf`
   (halaman 1 ringkasan, halaman 2 dst "Originaltext, vom Nutzer eingefügt") dan `Analisis_Fit_Gap.pdf`
   (1 halaman) + `Analisis_Fit_Gap.md` untuk Bayu/Tari. `md_to_pdf.py` tetap ada untuk dokumen lain.
4. **Lamaran dan laporan lama** di `02_workflow/` TIDAK diubah dan tidak dibangun ulang; format v2 berlaku
   untuk analisis berikutnya.
5. Jalankan `hide_internal.py`, lalu `verify_consistency.py`.

### [2026-11-01] Pengaturan pencarian Morning Report (search_settings.json) + tombol "Run now" di aplikasi

**Deteksi:** `01_user_documents/--usersettings/search_settings.json` belum ada, atau `sop/laporan_pagi.md`
belum punya bagian "Pengaturan pencarian".

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `sop/laporan_pagi.md` (bagian "Pengaturan pencarian", langkah 1 dan 3),
   `sop/tabel_arah.md` (baris "ubah pencarian" menulis `search_settings.json`), `agents/sinta.md`.
2. **File data baru** `01_user_documents/--usersettings/search_settings.json`: isi dari `job_profile.md` user
   (kata kunci dari target, lokasi, jenis kontrak, bahasa lamaran) dan filter laporan terakhir
   (umur iklan, jumlah rekomendasi), `oleh: "Sinta"`. Yang belum pernah ditentukan user (jarak, remote)
   dibiarkan kosong/false, jangan ditebak. Template kosong ada di `_TEMPLATE/01_user_documents/--usersettings/`.
3. Aplikasi Vantage versi terbaru menampilkan pengaturan ini di tab Morning report (Search settings) dan
   punya tombol "Run Morning Report now" (mengetik permintaan di chat, user yang menekan Enter).
4. Laporan lama tidak diubah. Jalankan `hide_internal.py`, lalu `verify_consistency.py`.

### [2026-11-01] Ambang skor bisa diatur (ambang_skor) dan maks rekomendasi 1-50

**Deteksi:** `search_settings.json` user belum punya `ambang_skor`, atau `scripts/check_report.py` masih punya `AMBANG_LAMAR = 85`.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `scripts/check_report.py`, `scripts/lib_schema.py`, `scripts/build_laporan_pagi.py`,
   `scripts/build_analisis.py`, `scripts/run_smoke_test.py`, `templates/laporan_pagi/content.json`, `sop/laporan_pagi.md`,
   `sop/lamaran_analisis.md`, `sop/tabel_arah.md`, `sop/lamaran_dokumen.md`, `agents/sinta.md`, `agents/arga.md`, `readme.md`,
   `onboarding/project_threads.md`, `onboarding/wawancara/sesi1_target.md`, `fase/fase_3_lamaran.md`. Root paket: `.claude/agents/arga.md`
   (description), baris router "skor ≥ ambang" di `CLAUDE.md`.
2. **`search_settings.json` user:** tambah `"ambang_skor": 80` (perilaku sama seperti sebelumnya). `maks_rekomendasi` lama tetap.
3. **Aturan yang dipakai:** rekomendasi ≥ ambang; Lamar ≥ ambang+5 (maks 100); Analisis = ambang sampai ambang+4;
   hampir masuk = ambang−10 sampai ambang−1; JD manual lanjut otomatis kalau ≥ ambang. Ambang 60-95. `maks_rekomendasi` 1-50
   (disarankan ≤5 supaya pencarian tidak dianggap bot); laporan dengan lebih dari 5 rekomendasi boleh lebih dari 1 halaman.
4. Laporan lama tidak diubah (tiap laporan menyimpan `ambang_skor`-nya sendiri). Jalankan `hide_internal.py`, lalu `verify_consistency.py`.

### [2026-11-01] Update kit langsung dari GitHub (sop/update.md bagian 1b)

**Deteksi:** `sop/update.md` belum punya bagian "1b. Paket Update langsung dari GitHub".

**Tindakan:** replace wholesale `sop/update.md`. Kalau folder Vantage punya `vantage.json` dengan `github_repo`
(ditaruh installer), "update" mengunduh `kit/` dari repo itu sebagai `vantage_update/`, lalu alur biasa.
Data pribadi tidak disentuh.

### [2026-11-01] Handbook dihapus dari Vantage

**Deteksi:** folder user masih punya `Handbook.pdf` di root, atau `onboarding/project_threads.md` / `onboarding/first_run.md`
masih menyebut `Handbook.pdf` (mengirimnya ke user baru atau mengarahkan user membacanya).

**Tindakan:** replace wholesale `readme.md`, `fase/fase_1_setup.md`, `onboarding/first_run.md`, `onboarding/project_threads.md`,
`sop/update.md`, `scripts/hide_internal.py`, `scripts/verify_consistency.py`. Mulai sekarang JANGAN kirim Handbook ke user baru,
JANGAN arahkan user ke Handbook, dan JANGAN lapor "Handbook ketinggalan". `Handbook.pdf` lama di folder user boleh dibiarkan
(tidak dipakai lagi dan tidak diperbarui) atau dihapus kalau user minta. Data pribadi tidak disentuh.

### [2026-11-02] Bobot skor bisa diatur; pengaturan pencarian terisi dari raw facts

**Deteksi:** `scripts/lib_schema.py` belum punya fungsi `komponen_max`, atau `search_settings.json` user belum punya `bobot_skor`.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `scripts/lib_schema.py`, `scripts/build_analisis.py`, `scripts/build_laporan_pagi.py`,
   `templates/laporan_pagi/content.json`, `templates/fit_gap/content.json`, `sop/laporan_pagi.md`, `sop/lamaran_analisis.md`.
2. **`search_settings.json` user:** tambah `"bobot_skor": {"tugas": 40, "skill": 25, "bahasa": 15, "kontrak": 10, "nilai_tambah": 10}`
   (sama dengan perilaku sebelumnya). Key lain dan isi yang sudah ada tidak diubah.
3. Laporan dan analisis lama tidak diubah: tanpa `bobot_skor` mereka dibaca dengan bobot bawaan. Jalankan `hide_internal.py`, lalu `verify_consistency.py`.

### [2026-11-02] Tabel status materi untuk folder lama

**Deteksi:** `01_user_documents/materials/00_index.md` user tidak punya tabel berkolom `ID` dan `Dibaca utuh` (folder dibuat sebelum ada
pelacakan status). Aplikasi lalu menampilkan "status belum dilacak" dan tombol "Minta Raka mengisinya".

**Tindakan (Raka, urut):**
1. Backup dulu `00_index.md`. Buat tabelnya mengikuti `_TEMPLATE/01_user_documents/materials/00_index.md` dan
   `onboarding/wawancara/kupas_bahan.md`: satu baris per bahan di `materials/` (kolom ID, File, Nama asli, Relevan).
2. Isi "Dibaca utuh", "Fakta ditarik", "Dikonfirmasi user" dengan `ya` **hanya** kalau `raw_facts_about_you.md` menyebut bahan itu
   (lewat ID atau nama file). Jangan menebak: kalau raw_facts tidak menyebutnya, isi `-`.
3. Laporkan ke user berapa bahan yang sudah dibahas. Tidak ada file lain yang diubah.


### [2026-11-02] Dokumen baca punya templat sendiri (About Item, Rencana Belajar, Interview Prep, Catatan Pengalaman; Master CV dengan pemeriksa isi)

**Deteksi:** `scripts/lib_doc.py` atau `templates/about_item/` belum ada di sistem user.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `scripts/lib_doc.py`, `scripts/build_about_item.py`, `scripts/build_rencana_belajar.py`,
   `scripts/build_interview_prep.py`, `scripts/build_catatan_pengalaman.py`, `scripts/build_master_cv.py`, `scripts/verify_consistency.py`,
   seluruh folder `templates/about_item/`, `templates/rencana_belajar/`, `templates/interview_prep/`, `templates/catatan_pengalaman/`,
   `templates/master_cv/` (termasuk `contoh_terisi.json`), `sop/about_item.md`, `sop/rencana_belajar.md`,
   `sop/persiapan_interview.md`, `sop/catatan_pengalaman.md`, `sop/master_cv.md`, `sop/tabel_arah.md`, `readme.md`, `fase/fase_3_lamaran.md`, `fase/fase_4_interview.md`.
2. Dokumen baca sekarang dibuat dari **JSON** (bukan `.md` lewat `md_to_pdf.py`). Berkas `.md` yang sudah ada dibiarkan; saat dokumen itu
   diperbarui berikutnya, buat JSON-nya dari templat (isi dari `.md` lama), buat PDF baru, lalu sembunyikan JSON dengan `hide_internal.py`.
3. **Interview Prep:** folder lamaran yang sudah punya `Interview_Prep/` tidak diubah. Saat sesi latihan berikutnya Laras membuat
   `Interview_Prep/Interview_Prep.json` dan mulai mengisi `riwayat_latihan` (satu baris per sesi).
4. Jalankan `verify_consistency.py` (cek 10 memeriksa semua templat).

### [2026-11-03] Raw facts hanya di raw_facts_about_you.md

**Deteksi:** `agents/raka.md` belum menyebut jalur lengkap `01_user_documents/raw_facts_about_you.md` sebagai satu-satunya tempat fakta.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `agents/raka.md`, `onboarding/wawancara/kupas_bahan.md`.
2. Tidak ada data user yang diubah. Dari sekarang "cek/ubah raw facts" berarti membuka file itu saja; file about item dan folder proyek tidak dipakai sebagai tempat fakta.

### [2026-11-04] Update lewat skrip, bukan UPDATE.md raksasa; sisa era Project dihapus

**Deteksi:** `scripts/apply_update.py` belum ada di sistem user, atau masih ada `onboarding/project_mode.md`.

**Tindakan (urut):**
1. Dari kit baru jalankan `apply_update.py` (lihat `sop/update.md` yang baru): ia mengganti semua berkas sistem, membuat cadangan, dan
   memindahkan berkas usang ke cadangan: `onboarding/project_mode.md`, `onboarding/project_threads.md`, `scripts/md_to_pdf.py`,
   `scripts/build_release.py`. Tidak ada lagi alur "Project dengan thread", routine jam 07.00, atau Paket Update zip.
2. Tambahan: `scripts/doctor.py` (cek alat: Python, pustaka, Chrome/Edge) menggantikan langkah pasang alat manual di `first_run.md`.
3. `UPDATE.md` sekarang hanya daftar perubahan; isi berkas diambil dari kit lewat `system_manifest.json`.
4. Jalankan `verify_consistency.py`.

### [2026-11-05] Impor data lama dan cadangan satu klik; Rapikan Inbox tidak lagi menolak

**Deteksi:** `scripts/import_old.py` atau `scripts/backup_user.py` belum ada di sistem user.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `scripts/backup_user.py` (zip `01_user_documents`, `02_workflow`, Inbox dan CLAUDE.md ke `_Backups/`), `scripts/import_old.py`
   (memasukkan folder user lama atau zip cadangan; rencana dulu, `--apply` baru menyalin; tidak pernah menimpa: file berbeda disimpan sebagai `.from_old`).
2. Tidak ada data user yang diubah. User lama tidak perlu menyalin manual: tombol "Import old data" di Profile menjalankan `import_old.py`.
3. Rapikan Inbox: tujuan yang boleh sekarang `materials/<kategori>/<item>`, `raw_facts_about_you.md`, `Master_CV/`, `00_other_cv_as_role_model/`,
   `your_recalling_journey/`, `recommended_skill_for_you/`, `02_workflow/Laporan_Pagi/`. Berkas yang bentrok disimpan berdampingan (`_from_inbox`), tidak ditimpa.
4. Jalankan `verify_consistency.py`.

### [2026-11-06] Rapikan Inbox memulihkan data Vantage lama dengan skrip, bukan tebakan Raka

**Deteksi:** `scripts/import_old.py` belum punya opsi `--inbox`.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `scripts/import_old.py`. Dengan `--inbox` ia membaca Inbox user: folder Vantage lama utuh, `02_workflow`, `01_Pipeline`/`02_Sent`/`03_Tracker`,
   `role_model`, `Daily_Recommendation_From_Nova`, `recommended_skill_for_you`, `JD_Insights.md`, `Raw_Materials.md` dikembalikan ke tempat yang benar; yang tidak dikenali tetap di Inbox untuk Raka.
   Aslinya dipindah (bukan dihapus) ke `--usersettings/imported/inbox_<waktu>/`.
2. Tidak ada data user yang diubah. Tombol Tidy up menjalankan langkah ini lebih dulu.
3. Jalankan `verify_consistency.py`.

### [2026-11-07] Perbaiki file yang salah tempat di materials

**Deteksi:** `scripts/import_old.py` belum punya opsi `--repair`.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `scripts/import_old.py`. Dengan `--repair` ia mencari bagian Vantage lama yang terlanjur masuk `materials/` (mis. `archive/`, `workflows/`,
   `workflow_import/01_Pipeline`) dan mengembalikannya ke `02_workflow`, `--usersettings`, dst. Aslinya dipindah (bukan dihapus) ke `--usersettings/imported/repair_<waktu>/`.
2. Tidak ada data user yang diubah otomatis; user menekan "Fix misplaced files" di Profile.
3. Jalankan `verify_consistency.py`.

### [2026-11-08] Perubahan lewat aplikasi terlihat oleh agent (sinkron UI dan chat)

**Deteksi:** `agents/nova.md`, `raka.md`, `laras.md` belum menyebut `--usersettings/ui_context.md` dan `app_changes.log`.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `agents/nova.md`, `agents/raka.md`, `agents/laras.md`. Agent kini membaca di awal obrolan `app_changes.log` (lamaran yang dipindah atau
   dihapus user lewat aplikasi) dan `ui_context.md` (catatan, skor latihan interview, tujuan belajar, bobot tawaran dari aplikasi). Keduanya ditulis aplikasi; agent tidak mengeditnya.
2. Aturan baru: kalau `status.md` bertentangan dengan `applications.json`, ikuti `applications.json` lalu timpa baris `status.md`-nya.
3. Tidak ada data user yang diubah. File baru dibuat otomatis oleh aplikasi versi 0.8.5 ke atas.
4. Jalankan `verify_consistency.py`.

### [2026-11-09] Ekspor dan impor akun yang persis, dengan bukti dan laporan

**Deteksi:** `scripts/account_import.py` belum ada, atau `scripts/backup_user.py` belum membuat `vantage_export.json`.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `scripts/backup_user.py` (ekspor: satu zip + daftar tiap file dengan sha256), `scripts/account_import.py` (impor persis, gabung `applications.json` dan `app_prefs.json`, tidak menimpa, memeriksa setiap file, menulis `--usersettings/import_report.md`), `agents/nova.md`, `agents/raka.md`, `agents/laras.md` (agent mengerjakan `## Open items` sampai bersih), `sop/privasi_backup.md`.
2. Tidak ada data user yang diubah.
3. Jalankan `verify_consistency.py`.

### [2026-11-10] Agen bicara langsung dengan user; satu aturan shell; folder lamaran dipindah lewat skrip

**Deteksi:** `scripts/move_application.py` belum ada, atau `.claude/agents/*.md` masih berisi "Jangan menyapa user langsung".

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `.claude/agents/arga.md`, `bayu.md`, `laras.md`, `raka.md`, `sinta.md`, `tari.md` (dua cara dipanggil: oleh Nova, atau langsung oleh user di aplikasi; Sinta dan Bayu boleh memanggil agen lain lewat Task;
   ), `scripts/move_application.py` (pindah folder + `applications.json` + tracker seperti menggeser kartu di aplikasi), `sop/lamaran.md`, `sop/lamaran_dokumen.md`
   (tidak lagi `mv`/`Move-Item`), `sop/laporan_pagi.md` dan `agents/sinta.md` (Find jobs now dijalankan Sinta sendiri sampai selesai), `onboarding/first_run.md`, `readme.md`.
2. Salinan agen di folder kerja (`.claude/agents/`) kini diganti otomatis oleh aplikasi bila berbeda dari yang dibundel (yang lama disimpan di `.claude/agents_replaced/`), jadi agen versi lama tidak tertinggal.
3. Tidak ada data user yang diubah.
4. Jalankan `verify_consistency.py`.

### [2026-11-11] Agen tanpa paragraf shell ganda

**Deteksi:** `.claude/agents/*.md` masih berisi paragraf "Shell di aplikasi:".

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `.claude/agents/*.md` (aturan shell hanya ada di instruksi aplikasi, tidak diulang di tiap agen).
2. Tidak ada data user yang diubah. Jalankan `verify_consistency.py`.

### [2026-11-12] Skrip tambah lamaran dan ekspor tracker; UPDATE.md dihapus

**Deteksi:** `scripts/add_application.py` atau `scripts/export_tracker.py` belum ada.

**Tindakan (urut):**
1. **Replace wholesale** (sistem): `scripts/add_application.py` (menambah satu lamaran: folder di `01_Pipeline`, entri `applications.json`, log, tracker), `scripts/export_tracker.py` (CSV dan kalender .ics ke `_Exports/`),
   `scripts/generate_update.py`, `scripts/verify_consistency.py`, `scripts/run_smoke_test.py`, `scripts/apply_update.py`, `readme.md`, `sop/update.md`, `sop/tabel_arah.md`.
2. `UPDATE.md` tidak ada lagi (riwayat perubahan hanya di `docs/riwayat_migrasi.md`); tidak ada yang perlu dilakukan di folder user.
3. Tidak ada data user yang diubah. Jalankan `verify_consistency.py`.

