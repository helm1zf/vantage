# SOP Master CV — dokumen baca lengkap, bukan CV lamaran

**Tujuan:** satu dokumen yang memuat SEMUA pengalaman, proyek, pendidikan, dan skill user dalam bentuk
rapi, supaya user bisa membaca ulang seluruh riwayatnya sebelum interview atau menulis lamaran.

**Bukan:** CV lamaran (itu `build_cv.py`, dikunci 1 halaman, ditailor per JD) dan **bukan sumber
tailoring**. Sumber tailoring tetap `01_user_documents/raw_facts_about_you.md`. Kalau Master CV dan raw facts
beda, raw facts yang menang, lalu Master CV diperbaiki.

**Siapa:** Bayu membuat dan memperbarui, Tari memeriksa (`sop/cek_kualitas.md`, otomatis,
maks 3 putaran).

**Dipakai bareng:** `scripts/build_master_cv.py` (generator; tampilan sama dengan CV lamaran,
`templates/cv/layout.html`, tapi lengkap dan boleh berhalaman-halaman; dicetak lewat Chrome/Edge),
`templates/master_cv/content.json` (template), `--usersettings/identity.json` (nama dan
kontak, dibaca otomatis).

---

## 1. Kapan dibuat
- SETELAH wawancara profil selesai (`onboarding/wawancara/kupas_bahan.md`, "Wawancara selesai kalau") dan `raw_facts_about_you.md` sudah ada. Sebelum itu belum ada bahan terverifikasi.
- Dibuat ulang (diperbarui) tiap ada fakta baru di raw facts yang masuk ke riwayat user.

## 2. Letak dan nama
- Folder: `01_user_documents/Master_CV/`
- Sumber: `master_cv_content.json` (satu per bahasa; versi bahasa lain mis. `master_cv_content_ID.json`)
- Hasil: `Master_CV_<Nachname>_<BAHASA>.docx` dan `.pdf` (`output` di JSON diisi nama ini, ganti `Master_CV_EN.docx`
  di template dengan nama user)
- File `.docx` dan `.pdf` hasil generate **tidak diedit langsung**. Edit `.json`-nya, lalu generate ulang.

## 3. Isi (urutan section tetap)
1. `tagline` dan `profile`: 4-5 kalimat, hanya fakta dari raw facts.
2. **Education**, **Projects**, **Work Experience**, **Volunteering & Organisations**, **Academic Transcript** (opsional).
3. `skills`: Technical, Programming & data, Languages. Level bahasa dan tool dinyatakan jujur, tidak dilebih-lebihkan.
4. Tiap entry: `role`, `org`, `right` (kota | periode | nilai), `context` (opsional), `bullets` berpasangan `[lead, isi]`.

## 4. Aturan isi
1. **Tanggal, nilai, dan nama institusi persis seperti sumber** (transkrip, ijazah, kontrak).
2. **Tiap bullet punya minimal satu jangkar** (angka, nama tool, atau brand/event) dari fakta terverifikasi di raw facts.
   Tidak ada jangkarnya, tidak masuk.
3. Beda dari CV lamaran: **boleh panjang dan lengkap**, tidak ada batas halaman dan tidak ada pemangkasan per JD.
4. Fakta yang di raw facts berlabel internal/tidak untuk lamaran tetap boleh ada di sini, tapi **wajib diberi tanda**
   `[internal: not for applications]` supaya tidak tersalin ke CV lamaran.
5. Jangan menyalin dari CV lamaran lama. Selalu dari raw facts.
6. Kalau ada bagian yang belum jelas, tanya user. Jangan diisi dari asumsi.

## 5. Urutan pengerjaan
1. Salin `templates/master_cv/content.json` ke `01_user_documents/Master_CV/master_cv_content.json`
   (kalau belum ada).
2. Isi semua `<TAILOR>` dari raw facts. Hapus section yang memang kosong.
3. Periksa dulu: `python3 ./--settings/scripts/build_master_cv.py "01_user_documents/Master_CV/master_cv_content.json" --check`
   (menolak entri tanpa peran/tanggal, bagian kosong, bullet tanpa isi). Lalu generate tanpa `--check`.
4. **Buka PDF-nya dan baca sendiri** (sama seperti aturan verifikasi lamaran): tidak ada teks `<TAILOR`, tidak ada
   teks nabrak, semua section tampil.
5. Otomatis ke Tari. Belum `LULUS` = belum selesai.
6. JSON kerja disembunyikan otomatis oleh `build_master_cv.py`. User cukup melihat PDF/DOCX.

## 6. Checklist sebelum lapor selesai
- [ ] Semua fakta ada sumbernya di `raw_facts_about_you.md`
- [ ] Tanggal, nilai, institusi cocok dengan dokumen asli
- [ ] Tidak ada `<TAILOR` yang tersisa di PDF
- [ ] Fakta internal ditandai `[internal: not for applications]`
- [ ] `.docx` dan `.pdf` ada di `01_user_documents/Master_CV/`
- [ ] `qc_report.md` dari Tari berisi `LULUS`
