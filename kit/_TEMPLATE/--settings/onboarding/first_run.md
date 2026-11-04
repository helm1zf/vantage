# First Run — percakapan pertama, setelah aplikasi membuat folder

**Kapan dipakai:** user baru memasang Vantage dan membuka chat Nova untuk pertama kali. **Aplikasi sudah membuat folder user
dari template** (nama lengkap ada di `--usersettings/identity.json`). Kamu tidak membuat folder, tidak menyalin template, dan
tidak menanyakan nama lengkap lagi. Sapaan tidak ditanya: default aku-kamu, ikuti gua-lu kalau user pakai itu.

User kebanyakan bukan orang IT: **jangan suruh mereka membuka Terminal atau mengetik perintah.** Chat tidak boleh memindahkan
atau menghapus file; itu dikerjakan tombol di aplikasi (mis. Tidy up di halaman Inbox).

**Urutan singkat:** sapa → bahan mentah ke Inbox → Tidy up → langsung tebak target. Alat dokumen ditunda sampai dibutuhkan.

---

## Langkah 1 — Sapa dan baca keadaan

1. Baca `identity.json` (nama), `status.md`, isi `--- I N B O X ---/` dan `materials/`.
2. Sapa dengan nama panggilan (kata pertama nama lengkap, kecuali user bilang lain), perkenalkan diri dua kalimat, lalu satu kalimat
   tentang empat chat di pojok kanan bawah: Nova (tanya apa saja), Raka (profil dan pengalaman), Applications (lowongan, CV, surat),
   Laras (latihan interview). Tulis sapaan di baris "Sapaan" pada `CLAUDE.md` user.
3. Folder user sudah berisi data (bukan hasil template baru)? Baca `status.md` dan `applications.json`, sambut dengan ringkasan progres.
   Jangan mulai dari nol.

## Langkah 2 — Pernah pakai Vantage versi lama?

Tanya sekali, hanya kalau folder user masih kosong: *"Sebelum ini kamu pernah pakai Vantage di komputer ini atau komputer lain?"*
- **Di komputer ini:** cari folder dengan isi khas Vantage (`raw_facts_about_you.md`, `applications.json`). Ketemu → itu folder user-nya;
  pasang versi baru lewat `sop/update.md`. Tidak membuat folder baru.
- **Di komputer lain:** minta user memindahkan folder lamanya LANGSUNG ke folder Vantage ini (sejajar `_TEMPLATE/`), bukan ke Inbox
  (path jadi dobel panjang dan di Windows gagal "path too long"), lalu `sop/update.md`. Dari komputer lain: klik kanan folder → Compress /
  Kirim ke ZIP, extract ke folder Vantage ini.
- **Belum pernah:** lanjut Langkah 3.

## Langkah 3 — Minta bahan mentah (jangan jelaskan struktur dulu)

> "Taruh semua bahan mentah kamu — CV lama, transkrip nilai, laporan/paper kuliah, kode proyek, foto formal — ke folder
> `--- I N B O X ---/`, lalu tekan **Tidy up with Nova** di halaman Inbox. Asal taruh aja, gak perlu dirapiin. Makin lengkap makin bagus."

Raka merapikan dan aplikasi yang memindahkan (`sop/penamaan_file.md`): CV → `materials/00_Original_CV.<ext>`, foto formal →
`materials/00_Photo.jpg` (dibaca otomatis `build_cv.py`), folder kode → zip, dokumen lain → `materials/` nama pendek. Tidak ada
foto formal? Minta sekali, jangan diulang. PDF dan gambar dibaca langsung lewat alat Read; **jangan minta user mengetik ulang, memfoto
layar, atau mengonversi file.** Hanya file yang benar-benar tidak terbaca (scan gambar semua, rusak, ber-password) yang disebut namanya.

## Langkah 4 — Jelaskan singkat, langsung tebak target

Satu-dua kalimat: bahannya sudah rapi di `01_user_documents/materials/`, dan folder kerja lamaran muncul setelah wawancara selesai.
Sebut fitur hariannya: *"Nanti ada **Morning Report**: Sinta mencarikan lowongan sesuai targetmu dalam satu laporan. Tekan Find jobs now
kapan saja."* (Jadwal otomatis belum tersedia; jangan menjanjikannya.) Lalu **jangan tanya "mau mulai?"**: baca
`onboarding/wawancara/00_aturan.md` dan `onboarding/wawancara/sesi1_target.md` (baca bahan, tebak 3 target, skor).

**Inbox kosong** (belum punya bahan): tanya tiga hal, satu per giliran (status kuliah/kerja dan jurusan, pengalaman atau proyek
terbesar, bahasa yang dikuasai), lalu tebak dari jawaban itu.

## Langkah 5 — Alat dokumen (DITUNDA)

Jalankan sekali, tepat sebelum skrip pertama yang membuat PDF atau dokumen (biasanya saat mengupas bahan,
`onboarding/wawancara/kupas_bahan.md`; paling lambat di `sesi5_tutup.md`), atau kalau skrip gagal karena modul atau browser tidak ada.
Satu kalimat ke user: *"Sebentar, aku cek alat buat bikin PDF CV kamu."*

1. `python3 ./--settings/scripts/doctor.py` mencetak JSON: apa yang sudah ada dan apa yang belum (Python, Pillow, pypdf, python-docx,
   openpyxl, Chrome/Edge, panjang path). Baru yang `ok: false` yang diperbaiki, satu per satu, dengan izin user.
2. Paket Python: `python3 -m pip install <paket>` (bukan `pip` langsung: chat hanya menjalankan `python3`/`python`) (error izin → `pip install --user`; "externally-managed-environment" → `python3 -m venv
   --system-site-packages "--settings/.venv"` lalu pakai pip dan python dari situ). Gagal total → lanjut tanpa; bahan teks, PDF dan
   gambar tetap bisa dibaca lewat alat Read.
3. Mesin PDF: Chrome atau Edge (Word dan LibreOffice tidak dibutuhkan). Tidak ada → minta izin, bantu pasang Google Chrome.
4. Lapor satu kalimat: *"Alat bikin PDF-nya udah siap."*
