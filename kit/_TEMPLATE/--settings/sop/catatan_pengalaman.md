# SOP Catatan Pengalaman — ringkasan satu sesi mengingat kembali

**Tujuan:** setiap sesi Raka dengan user (mengingat kembali pengalaman) menghasilkan satu catatan yang enak dibaca:
apa yang diingat, mana yang sudah dikonfirmasi, apa yang masih terbuka, dan langkah berikutnya. Di aplikasi dikenal
sebagai **Experience notes**.

**Siapa:** Raka membuat, di akhir sesi (atau saat user minta). Tidak ada fakta yang masuk raw_facts dari catatan ini
sebelum user mengiyakan (`dikonfirmasi: true`); itu aturan Raka yang sudah ada, catatan hanya memperlihatkannya.

## 1. Cara kerja

Sama seperti dokumen lain: agent mengisi JSON, skrip membuat PDF (templat jurnal dengan rel waktu,
`templates/catatan_pengalaman/layout.html`).

```
01_user_documents/materials/catatan/sesi_<N>.json      <- sumber (disembunyikan)
01_user_documents/materials/catatan/sesi_<N>.pdf       <- yang dibaca user
```

Salin `templates/catatan_pengalaman/content.json`, isi, lalu
`python3 ./--settings/scripts/build_catatan_pengalaman.py "<file>.json" --check`, lalu tanpa `--check`.

## 2. Isi

- `sesi` (nomor), `judul`, `tanggal`, `durasi_menit`, `topik_wajib` (topik yang disepakati untuk sesi itu).
- `ingatan` (1-14, urut waktu lama ke baru): `periode`, `judul`, `apa_yang_diingat` (kata user, bukan tafsiran),
  `kutipan` (kalimat asli user kalau ada), `fakta_baru` (butir pendek), `id` (ID raw_facts kalau sudah masuk),
  `dikonfirmasi` (true hanya setelah user mengiyakan).
- `pertanyaan_terbuka` (yang masih perlu dicari), `langkah_berikut` (1-5, konkret).

## 3. Aturan

- [ ] Tidak ada klaim angka atau nama yang tidak diucapkan user atau tidak ada di bahan.
- [ ] `dikonfirmasi: false` untuk semua yang belum diiyakan; jangan dibulatkan menjadi fakta.
- [ ] `--check` lulus, PDF dibaca ulang (maks 6 halaman).
- [ ] Sesi berikutnya dimulai dari `pertanyaan_terbuka` dan `langkah_berikut`.
