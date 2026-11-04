## Mengupas bahan (dikerjakan Raka, hanya bahan yang relevan)

"Mengupas" = membaca SATU bahan sampai tuntas dan memindahkan isinya yang berguna
**untuk topik wajib** ke raw_facts, terverifikasi. Bahan bertanda `tidak dibawa` tidak
dikupas. Bahan `pengisi` cukup fakta dasar.

**Perkiraan durasi per bahan** (buat bilang ke user "kira-kira tinggal N sesi lagi";
satu sesi ≈ 30-45 menit ngobrol):

| Jenis bahan | Perkiraan | Catatan |
|---|---|---|
| CV lama, sertifikat, transkrip | 5-10 menit | cepat: fakta tinggal dikonfirmasi |
| Laporan/paper proyek (≤30 halaman) | 15-25 menit | + 10-15 menit kalau dibuatkan file about item |
| Skripsi/tesis | 20-30 menit | fokus ke bagian yang menjawab topik wajib |
| Slide/materi kuliah satu mata kuliah | 10-15 menit | daftar isi + bagian yang dikerjakan user saja |
| Kode/repo proyek | 15-25 menit | README + struktur + bagian yang ditulis user |
| Pengalaman kerja tanpa dokumen | 15-20 menit | digali lewat Sesi 2 |

Jumlahkan dari baris `00_index.md` yang Relevan `ya` dan belum dikupas, bagi 40 menit,
bulatkan ke atas.

Untuk tiap baris `ya` di `materials/00_index.md`:

1. **Baca utuh** (bukan halaman pertama saja). Bahan panjang (slide kuliah 200 halaman)
   → baca daftar isi + bagian yang menyangkut peran user dan topik wajib, catat halaman
   yang dipakai.
2. **Tarik fakta pakai 5W+1H** (What, Why, Who, When, Where, How; sama dengan
   `sop/about_item.md` bagian 1), hanya yang lolos tes relevansi. Tiap fakta: angka,
   nama alat, nama orang/organisasi, tanggal, hasil. Tandai sumbernya (file + halaman).
3. **Konfirmasi ke user** dalam satu pesan ringkas: *"Dari laporan proyekmu aku dapat:
   timnya 4 orang, kamu pegang bagian X, pakai Y, hasilnya Z. Bener? Ada yang kurang?"*
   Fakta yang user koreksi → pakai versi user. Yang user tidak ingat → tulis
   "tidak dipakai di dokumen" dulu.
4. **Tulis ke raw_facts** (`01_user_documents/raw_facts_about_you.md`, bukan file about item atau folder proyek) di sub-ID item itu, centang kolom di `00_index.md`, dan
   perbarui status topik wajib yang terjawab di `job_profile.md`.
5. **Item penting → file about item** (`sop/about_item.md`). Sebelum file about item pertama
   dibuat, pasang alat dokumen kalau belum (`onboarding/first_run.md` Langkah 7).

`materials/00_index.md`:

| ID | File | Nama asli | Relevan | Dibaca utuh | Fakta ditarik | Dikonfirmasi user | About item |
|---|---|---|---|---|---|---|---|
| PROJ2 | `PROJ2_Kasir/bahan/PROJ2_laporan.pdf` | Laporan Akhir FINAL revisi 3.pdf | ya | 2026-10-20 | 12 | 2026-10-21 | 2026-10-22 |
| EDU4 | `EDU4_Marketing/bahan/EDU4_slides.pdf` | Marketing WS24 Folien.pdf | tidak dibawa: tidak nyambung ke Data Analyst | — | — | — | — |

### Wawancara selesai kalau

Semua butir ini benar (Raka yang mengecek, lalu melapor ke Nova):

- [ ] Target utama (peran + level + skor) disepakati dan tertulis di `CLAUDE.md` dan
      `job_profile.md`.
- [ ] **Semua topik wajib** di `job_profile.md` berstatus `terisi` atau `gap`.
- [ ] Semua baris `materials/00_index.md` punya isi kolom Relevan; baris `ya` sudah
      "Dibaca utuh", "Fakta ditarik", dan "Dikonfirmasi user".
- [ ] Skill yang relevan untuk target sudah dikalibrasi 3 tingkat (Sesi 3).
- [ ] Bahasa, batasan izin kerja, dan "Kerangka yang tidak berubah" terisi (Sesi 4).
- [ ] `job_profile.md` dan `CLAUDE.md` user lengkap (Sesi 5).
- [ ] Item yang ada di CV dan kemungkinan ditanya punya file about item.

Wawancara selesai kalau daftar ini terisi, **bukan** kalau user kehabisan cerita, dan
**bukan** menunggu semua bahan dikupas. Baru setelah semuanya benar: laporan
pagi boleh dijalankan dan Master CV boleh dibuat. Sebelum itu, Nova bilang terus terang ke
user bagian mana yang belum.

**Target berganti di kemudian hari?** Ulangi Sesi 1b-1f untuk target baru: skor ulang,
topik wajib baru, kolom Relevan diperbarui. Bahan yang dulu `tidak dibawa` dan sekarang
relevan, baru dikupas saat itu.
