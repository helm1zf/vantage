# Fase 1: Setup

Dari zip sampai bahan user tersimpan rapi di materials/.

**File ini hanya indeks (penunjuk).** Aturan dan langkah rinci ada di file yang ditunjuk; jangan menyalin aturan ke sini supaya tidak basi. Nama file relatif ke `--settings/`. Peta empat fase: lihat `fase/` (satu file per fase).

### Tahap 1: Sapa dan tanya nama
- **User:** Pasang Vantage (aplikasi membuat folder sendiri), buka chat Nova, ketik "halo"; jawab pertanyaan Nova
- **Agen:** Nova
- **Input:** Pesan pertama user ("halo"); Zip Vantage sudah dibuka
- **File:** CLAUDE.md (root, Router); `onboarding/first_run.md` (Langkah 1); `agents/nova.md`; .claude/agents/* (6 subagent); readme.md, agents/readme.md (indeks manusia)
- **Skrip:** -
- **Output:** Nama lengkap user diketahui; folder user dibuat oleh aplikasi

### Tahap 2: Cek folder lama, buat folder user
- **User:** Jawab: pernah pakai Vantage atau belum; Pindahkan folder lama langsung ke folder Vantage (kalau pernah)
- **Agen:** Nova
- **Input:** Jawaban "pernah pakai Vantage?"; Folder Vantage lama (kalau ada)
- **File:** `onboarding/first_run.md` (Langkah 2, 2b, 3); `sop/penamaan_file.md` (cek panjang path); _TEMPLATE/ (disalin ke folder user); 01_user_documents/README.md (aturan struktur)
- **Skrip:** `scripts/hide_internal.py`
- **Output:** Folder user: 01_user_documents/, 02_workflow/, Inbox; Folder lama dipindah langsung ke folder Vantage

### Tahap 3: Minta bahan mentah
- **User:** Taruh CV lama, transkrip, sertifikat, proyek, foto di folder Inbox (tanpa dirapikan); Bilang "sudah"
- **Agen:** Nova
- **Input:** CV lama, transkrip, sertifikat, proyek, Arbeitszeugnis; Pasfoto (diminta sekali kalau tidak ada)
- **File:** `onboarding/first_run.md` (Langkah 4); `sop/privasi_backup.md`; 00_other_cv_as_role_model/ (opsional: CV contoh orang lain)
- **Skrip:** pip: pypdf, Pillow (alat baca)
- **Output:** Bahan ada di Inbox; Alat baca siap; kalau gagal, jalur cadangan tanpa minta user mengetik ulang

### Tahap 4: Sortir Inbox
- **User:** Tidak ada (hanya menjawab kalau ada file yang tidak jelas)
- **Agen:** Nova
- **Input:** Isi Inbox
- **File:** `onboarding/first_run.md` (Langkah 5); `sop/penamaan_file.md`; `agents/nova.md`; materials/00_index.md
- **Skrip:** `scripts/tidy_materials.py`
- **Output:** materials/ rapi per kode ID (EDU1_, PROJ7_ dst); 00_index.md: ID, File, Nama asli; Inbox kosong lagi

### Tahap 5: Jelaskan singkat, serahkan ke Sesi 1
- **User:** Tidak ada (cukup membaca penjelasan singkat dari Nova)
- **Agen:** Nova, Raka
- **Input:** materials/ yang sudah rapi
- **File:** `onboarding/first_run.md` (Langkah 6); `onboarding/wawancara/sesi1_target.md`; --usersettings/status.md
- **Skrip:** -
- **Output:** status.md: "Wawancara: belum mulai → sesi1_target.md"; Langsung masuk Fase 2, tanpa tanya "mau mulai?"

### Tahap 6: Alat dokumen (ditunda) (opsional / ditunda)
- **User:** Setuju memasang Chrome kalau belum ada (Edge sudah ada di Windows)
- **Agen:** Nova
- **Input:** Dibutuhkan sebelum PDF pertama, paling lambat di sesi5_tutup
- **File:** `onboarding/first_run.md` (Langkah 7)
- **Skrip:** `scripts/lib_render.py` (find_browser: Chrome/Edge); pip: python-docx, openpyxl, markdown
- **Output:** Mesin PDF dan alat dokumen siap

**Catatan:** Fase 1 selesai ketika materials/ rapi dan Sesi 1 dimulai. Tahap 5 menyambung langsung ke Fase 2; tahap 6 dijalankan hanya saat dibutuhkan.
