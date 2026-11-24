# SOP Update — versi baru masuk, pindah komputer, tanpa menyalin folder lama

**Kapan dipakai:** aplikasi mengirim pesan "The app has just updated my Vantage system files ..." (atau terjemahannya), atau user pindah ke komputer baru
(bagian 5).

**Pembagian kerja (sejak 0.9.2):** Aplikasi sendiri yang mengunduh kit terbaru, membandingkan file sistem (hash, bukan tebakan), mengganti yang berubah,
dan menyalin yang diganti ke cadangan. Kamu TIDAK mengunduh apa pun dan tidak menjalankan `apply_update.py --apply`; kamu tidak punya shell untuk itu.
Bagianmu hanya penilaian: migrasi data. Data user tidak pernah dipindah atau disalin.

Kalau user mengetik "update" di chat tanpa pesan dari aplikasi: bilang satu kalimat bahwa update dikerjakan tombol **Update** di kanan atas (atau
kartu "Vantage update available"), lalu berhenti.

---

## 1. Pesan dari aplikasi

Pesan berisi: lokasi cadangan, versi sebelumnya, judul migrasi yang belum dikerjakan, folder kit yang disimpan (`--source`), dan folder user (`--user`).
File sistem SUDAH diganti. Jangan mengulang itu.

## 2. Migrasi data

Untuk tiap blok di `--settings/docs/riwayat_migrasi.md` yang tanggalnya setelah versi sebelumnya, dari yang tertua: baca "Deteksi" dan "Tindakan"
dan lakukan hanya kalau deteksinya cocok di folder user ini. Migrasi yang hanya mengganti file sistem sudah beres. Berhenti dan tanya HANYA kalau
ada dua data yang bentrok dan tidak jelas mana yang dipakai, atau satu langkah akan mengubah data pribadi.

## 3. Periksa dan catat versi

1. `python3 ./--settings/scripts/verify_consistency.py`; ada yang bermasalah → bereskan dulu.
2. `python3 ./--settings/scripts/apply_update.py --source "<folder kit dari pesan>" --user "<folder user dari pesan>" --stamp` menulis versi ke `.vantage_version`.
3. Lapor 2–4 baris bahasa awam: apa yang berubah dan bahwa data, CV, dan gaya ngobrol tidak diubah.

**Yang TIDAK PERNAH ditimpa** (skrip tidak menyentuhnya karena tidak ada di manifest): `CLAUDE.md` milik user, `raw_facts_about_you.md`,
`interview_stories.md`, `--usersettings/` (identity, applications, JD_Insights yang sudah ada isinya, status), `materials/`,
`00_other_cv_as_role_model/`, file about item, dan seluruh `02_workflow/`. `JD_Insights.md`, `status.md`, dan `materials/00_index.md`
hanya dibuat kalau belum ada. Kalau user pernah mengubah file sistem sendiri, versi lamanya ada di cadangan: pindahkan bagian pribadi itu
ke `CLAUDE.md` user ("pengecualian PERSONAL") dan sebut di laporan.

---

## 4. Pindah ke komputer baru

1. Di komputer lama: Settings (ikon roda gigi) → **Export account**. Hasilnya satu file zip.
2. Di komputer baru: pasang Vantage; di layar pertama jawab **Pernah** → **Pakai file backup (.zip)** dan pilih zip itu
   (atau, kalau folder sudah dibuat: Settings → **Import account**). Aplikasi yang menyalin dan memeriksa setiap file.
3. Tidak ada zip, tapi folder Vantage utuh sudah disalin ke komputer ini (path pendek, bukan di OneDrive/iCloud): layar pertama
   **Pernah** → **Pilih folder**, atau menu nama user di kiri bawah → **Buka folder Vantage…**.
4. Data yang cuma ada sebagian (bukan folder Vantage utuh): tarik **file ZIP-nya** ke tab Inbox, bukan foldernya. Ekstrak file yang dibutuhkan
   satu per satu langsung ke lokasi barunya dengan nama pendek.

## 5. Instalasi lama yang belum punya `apply_update.py`

Tidak masalah: aplikasi memakai `apply_update.py` dari kit yang baru diunduhnya. Update pertama memasang `apply_update.py`, `doctor.py`, dan
SOP ini; sesudahnya cukup tombol **Update**.
