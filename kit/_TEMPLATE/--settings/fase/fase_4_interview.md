# Fase 4: Interview

Dari undangan sampai debrief; ditolak berarti kembali ke Fase 3.

**File ini hanya indeks (penunjuk).** Aturan dan langkah rinci ada di file yang ditunjuk; jangan menyalin aturan ke sini supaya tidak basi. Nama file relatif ke `--settings/`. Peta empat fase: lihat `fase/` (satu file per fase).

### Tahap 1: Terima undangan, kalibrasi
- **User:** Kabari ada undangan; Pilih intensitas latihan
- **Agen:** Nova, Laras
- **Input:** Undangan atau status Interview R1/R2/Assessment; CLAUDE.md user: izin kerja, intensitas
- **File:** `sop/follow_up.md` (bagian 2); `sop/persiapan_interview.md` (bagian 1-2: tipe kontrak); `agents/laras.md`
- **Skrip:** -
- **Output:** Folder lamaran aktif lagi di 01_Pipeline; Intensitas latihan dipilih: santai / normal / keras

### Tahap 2: Riset perusahaan dan pewawancara
- **User:** Tidak ada
- **Agen:** Laras
- **Input:** Folder lamaran: JD.md, CV, cover letter; Web
- **File:** `sop/persiapan_interview.md` (bagian 3)
- **Skrip:** -
- **Output:** Interview_Prep/: riset perusahaan dan pewawancara

### Tahap 3: Pertanyaan diagnostik
- **User:** Jawab pertanyaan tentang titik lemah
- **Agen:** Laras
- **Input:** raw_facts; File about item
- **File:** `sop/persiapan_interview.md` (bagian 3b); `sop/about_item.md`
- **Skrip:** -
- **Output:** Titik lemah profil untuk peran ini; Fakta yang belum ada → FAKTA BARU ke Raka

### Tahap 4: Latihan
- **User:** Jawab latihan satu per satu; Pilih mode santai / normal / keras
- **Agen:** Laras
- **Input:** Jawaban user
- **File:** `sop/bank_arketipe.md` (12 arketipe); `sop/persiapan_interview.md` (bagian 6-7: 3 cerita, pertanyaan balik); `templates/interview_stories.md`; `sop/about_item.md` (bagian 5)
- **Skrip:** -
- **Output:** Feedback dulu, baru versi dipoles; interview_stories.md terisi; Jawaban terlatih masuk about item bagian 5

### Tahap 5: Cheat sheet (opsional / ditunda)
- **User:** Minta kalau mau
- **Agen:** Laras
- **Input:** Permintaan user
- **File:** `sop/persiapan_interview.md` (bagian 5, 8)
- **Skrip:** `scripts/md_to_pdf.py`; `scripts/lib_render.py`
- **Output:** Cheat sheet maksimal 2 halaman (PDF)

### Tahap 6: Debrief dan hasil
- **User:** Ceritakan jalannya interview (24 jam setelahnya); Setuju atau tolak USULAN ATURAN
- **Agen:** Laras, Nova
- **Input:** Cerita user setelah interview
- **File:** `sop/persiapan_interview.md` (bagian 10: debrief); `agents/laras.md`; `sop/follow_up.md` (bagian 2-4); Interview_Prep/
- **Skrip:** -
- **Output:** Interview_Prep/Debrief_<ronde>.md (format: persiapan_interview.md bagian 10); Pelajaran disalurkan ke tempat yang sudah ada (tabel bagian 10); Lolos / Offer → selesai

**Cabang setelah interview:** Ditolak: follow_up.md bagian 3. Pola berulang (≥3 kali dalam 60 hari) → USULAN ATURAN → Daftar hitam (Raka) + aturan_isi.md. Pelajaran debrief ikut ke lamaran berikutnya lewat baris "Pelajaran interview" (lamaran_analisis.md). Lalu kembali ke Fase 3.

**Celah yang diketahui:** Loop pelajaran ditutup 2026-10-30; belum teruji dengan interview nyata.
