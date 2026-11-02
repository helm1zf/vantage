# Fase 2: Profil

Dari bahan mentah jadi satu sumber fakta: raw_facts_about_you.md.

**File ini hanya indeks (penunjuk).** Aturan dan langkah rinci ada di file yang ditunjuk; jangan menyalin aturan ke sini supaya tidak basi. Nama file relatif ke `--settings/`. Peta empat fase: lihat `fase/` (satu file per fase).

### Tahap 1: Sesi 1: baca bahan, tebak 3 target
- **User:** Baca laporan tebakan
- **Agen:** Raka
- **Input:** materials/ + 00_index.md
- **File:** `onboarding/wawancara_profil.md` (daftar isi); `onboarding/wawancara/00_aturan.md`; `onboarding/wawancara/sesi1_target.md` (1a-1c); `agents/raka.md`
- **Skrip:** -
- **Output:** Laporan singkat: 3 tebakan, skor 0-100 (skill 40, pengalaman 30, level 15, bahasa 15); Slot ke-4 untuk target tulisan sendiri

### Tahap 2: Pilih target, tulis topik wajib
- **User:** Pilih satu target (atau tulis sendiri peran dan level); Terima atau jelaskan bahan yang menurutnya relevan
- **Agen:** Raka
- **Input:** Pilihan user (atau target sendiri)
- **File:** `onboarding/wawancara/sesi1_target.md` (1d-1g); --usersettings/job_profile.md; materials/00_index.md (kolom Relevan); `templates/raw_facts.md`
- **Skrip:** -
- **Output:** job_profile.md: target, Tebakan awal, 5-8 topik wajib; Kolom Relevan: ya / pengisi / tidak dibawa; Kerangka raw_facts

### Tahap 3: Kupas bahan yang relevan
- **User:** Konfirmasi atau koreksi fakta dari bahan
- **Agen:** Raka
- **Input:** Bahan bertanda ya / pengisi; Jawaban user
- **File:** `onboarding/wawancara/kupas_bahan.md`; `sop/about_item.md`; `sop/aturan_isi.md` (jangkar, label)
- **Skrip:** -
- **Output:** Fakta ber-ID di raw_facts (✅/⚠️/❌), dikonfirmasi user dulu; File about item per proyek penting

### Tahap 4: Sesi 2: gali per topik wajib
- **User:** Jawab satu pertanyaan per giliran (harian, mingguan, bulanan; awal dan hasil); Bilang seberapa kuat datanya
- **Agen:** Raka
- **Input:** Topik wajib berstatus belum; Cerita user
- **File:** `onboarding/wawancara/sesi2_gali.md` (5W+1H, uji ketahanan, preview); --usersettings/status.md
- **Skrip:** -
- **Output:** Tiap topik: terisi atau gap; Baris "Wawancara: Sesi n, topik x dari y" diperbarui

### Tahap 5: Sesi 3-4: skill, bahasa, batasan
- **User:** Jawab level tool dan bahasa dengan jujur; Sebut izin kerja, notice period, relokasi
- **Agen:** Raka
- **Input:** Skill, tool, bahasa, izin kerja dari user
- **File:** `onboarding/wawancara/sesi3_skill.md` (kalibrasi 3 tingkat); `onboarding/wawancara/sesi4_batasan.md`
- **Skrip:** -
- **Output:** Level skill dan bahasa terkalibrasi; Batasan izin kerja dicatat

### Tahap 6: Sesi 5: tutup onboarding
- **User:** Lengkapi sisa isian CLAUDE.md bareng Nova; Baca contoh aturan isi bareng
- **Agen:** Raka, Nova
- **Input:** Semua topik wajib terisi atau gap
- **File:** `onboarding/wawancara/sesi5_tutup.md`; CLAUDE.md user; --usersettings/identity.json; `templates/interview_stories.md`
- **Skrip:** `scripts/check_onboarding.py`; `scripts/hide_internal.py`
- **Output:** CLAUDE.md user terisi, identity.json terisi; status.md: "Onboarding selesai"; 02_workflow terbuka

**Catatan:** Raka satu-satunya penulis raw_facts. Pertanyaan harus lolos tes: bisa masuk CV atau jawaban wawancara untuk target ini?
