# SOP Update — versi baru masuk, pindah komputer, tanpa menyalin folder lama

**Kapan dipakai:** user bilang "update" (atau "update dong", "pasang update ini") dan ada
salah satu dari ini di folder Vantage-nya:
- folder `vantage_update/` (Paket Update resmi) — cara utama;
- file `UPDATE.md` saja (cara lama, mis. di `--- I N B O X ---/` atau root folder user).

Juga dipakai saat user pindah ke komputer baru (bagian 6).

**Kenapa SOP ini ada:** aturan update ada di sini, di folder yang sudah terpasang di
komputer user, bukan di file kiriman. `UPDATE.md` cuma membawa *isi* pembaruan (daftar
perubahan + isi lengkap file sistem). Cara mengerjakannya, apa yang boleh diganti, dan
kapan nanya user, semuanya diatur file ini.

**Masalah yang dicegah:** dulu user menyalin SELURUH folder pribadinya ke Inbox folder
baru. Path jadi dobel panjang dan di Windows gagal "path too long" (`sop/penamaan_file.md`).
Sekarang data user tidak pernah dipindah; yang datang cuma file sistem baru.

---

## 1. Paket Update (`Vantage_Update_<YYYY-MM-DD>.zip`)

```
vantage_update/
├── README.md        ← instruksi buat user (bahasa awam)
├── UPDATE.md        ← daftar perubahan + isi lengkap file sistem
├── CLAUDE.md        ← pintu masuk Nova di root paket
├── .claude/agents/  ← definisi agent (Raka, Sinta, Arga, Bayu, Tari, Laras)
└── _TEMPLATE/       ← template terbaru utuh
```

Tidak ada data pribadi siapa pun di dalamnya. Dibuat pengembang dengan
`python3 _TEMPLATE/--settings/scripts/build_release.py`.

**Yang dilakukan user** (ditulis juga di `README.md` paket):
1. Jangan salin folder lama ke mana pun.
2. Extract zip, pindahkan folder `vantage_update` ke **dalam folder Vantage** (sejajar
   `_TEMPLATE` dan folder nama user).
3. Buka Nova di folder Vantage, ketik **"update"**.

## 1b. Paket Update langsung dari GitHub (tanpa zip dari user)

Kalau di folder Vantage (sejajar `_TEMPLATE/`) ada `vantage.json` dengan `github_repo` terisi (ditaruh
saat instalasi, lihat INSTALL.md di repo) dan user bilang "update" tanpa folder `vantage_update/`:
1. Unduh `https://github.com/<github_repo>/archive/HEAD.zip` ke folder sementara (bukan ke folder user)
   dan extract di sana.
2. Salin isi folder `kit/` dari hasil extract sebagai `vantage_update/` ke dalam folder Vantage
   (isinya sama dengan Paket Update: `CLAUDE.md`, `.claude/agents/`, `_TEMPLATE/` dengan `UPDATE.md`).
3. Lanjut ke bagian 2 seperti biasa. Hapus folder sementara setelah selesai.
Gagal mengunduh (tidak ada internet, repo tidak ketemu) → bilang satu kalimat ke user, jangan menebak isi update.
Aplikasi Vantage sendiri memperbarui dirinya terpisah (banner "Restart to update"); bagian ini cuma untuk isi folder.

## 2. Alur Nova (satu konfirmasi saja)

1. **Baca `UPDATE.md`** sebagai daftar perubahan. Cek versi user di
   `01_user_documents/--usersettings/.vantage_version` (tidak ada → anggap versi paling lama).
2. **Kirim ringkasan 3–5 baris** dalam bahasa awam, mis.:
   > Ada update Vantage. Yang bakal aku kerjain:
   > - nambah panduan baru: X dan Y
   > - ganti nama folder A jadi B
   > - perbarui aturan lamaran (cara skor tetap sama)
   >
   > Data kamu, CV, dan gaya ngobrol kita gak aku ubah. Lanjut?
3. **User bilang oke sekali** → kerjakan semua langkah sampai selesai. Jangan nanya lagi
   per langkah.
4. **Berhenti dan nanya** HANYA kalau: ada file/folder yang tidak dikenali, ada dua data
   yang bentrok dan tidak jelas mana yang dipakai, atau sebuah langkah akan mengubah data
   pribadi (bagian 3). Selain itu, jalan terus.
5. **Langkah kerjanya** (kalau sumbernya `vantage_update/`):
   1. Timpa `CLAUDE.md` root paket, `.claude/agents/`, dan `_TEMPLATE/` dengan versi dari
      `vantage_update/`.
   2. Ganti file sistem di `--settings/` user dengan `_TEMPLATE/--settings/` (kecuali alat
      pengembang: `generate_update.py`, `build_release.py`, `docs/`). File sistem pribadi
      user yang tidak ada di template (mis. SOP buatan sendiri) dibiarkan.
   3. Jalankan blok "Riwayat Migrasi" di `UPDATE.md` yang deteksinya cocok, urut dari atas.
   3b. **Samakan penunjuk di `CLAUDE.md` user.** Hanya bagian "Baca juga (WAJIB ...)" yang
      boleh diganti dengan versi dari `_TEMPLATE/CLAUDE.md`: itu penunjuk ke file sistem,
      bukan data pribadi. Kalau di bagian itu (atau di tempat lain di `CLAUDE.md` user) ada
      ringkasan alur pembukaan/onboarding versi lama (mis. kalimat "Nova kenalan, tanya nama,
      lalu buka thread ..."), ganti ringkasan itu dengan satu kalimat penunjuk ke
      `--settings/onboarding/project_mode.md`. Jangan menyentuh bagian lain (nama, target,
      sapaan, aturan pribadi). Kalau user belum menyelesaikan wawancara dan `status.md`
      belum punya baris "Wawancara:", tambahkan satu baris sesuai
      `onboarding/wawancara_profil.md` (bagian "Penanda progres").
   4. Ada peringatan `[path]` di `verify_consistency.py` → tawarkan `tidy_materials.py`
      (rencana dulu, `--apply` setelah user setuju).
   Kalau sumbernya cuma `UPDATE.md`: langkah 2 dan 3 saja, isi file diambil dari bagian
   "Isi Lengkap Berkas Sistem".
6. **Selesai → penutup** (bagian 5).

## 3. Yang TIDAK PERNAH ditimpa

- `CLAUDE.md` milik user: "Siapa aku", "Yang aku cari", "Cara ngomong ke aku", aturan isi
  personal, pilihan sapaan, catatan ruang obrolan (dan "Sesi terakhir" di instalasi
  lama, yang dipindah apa adanya ke `status.md`). Kalau update butuh menambah aturan
  umum, **tambahkan** baris baru; isi lama tidak dihapus atau diubah. Satu-satunya
  pengecualian: bagian "Baca juga" dan ringkasan alur onboarding lama (langkah 3b),
  karena keduanya penunjuk sistem, bukan milik user.
- `01_user_documents/raw_facts_about_you.md`, `interview_stories.md`
- `01_user_documents/--usersettings/` (identity, applications, JD_Insights yang sudah ada
  isinya, status, activity.log, job_profile, daily_jobs_seen)
- `01_user_documents/materials/` (isinya; ganti nama/ratakan boleh sesuai
  `sop/penamaan_file.md`, nama lama dicatat di `00_index.md`), `00_other_cv_as_role_model/`,
  semua file about item
- Semua isi `02_workflow/` (lamaran aktif, arsip, tracker Excel, laporan pagi)

Mengganti **nama** file/folder data boleh, asal isinya tidak diubah dan semua rujukan
path (`applications.json` kolom `folder`, raw_facts) ikut diperbarui.

## 4. Yang boleh diganti atau ditambah

- File sistem di `--settings/`, `.claude/agents/`, `CLAUDE.md` root paket, `_TEMPLATE/`.
- File sistem baru yang belum ada: dibuat.
- Rename folder/file sesuai "Riwayat Migrasi" di `UPDATE.md`.

Kalau user pernah mengubah file sistem sendiri (mis. menambah aturan pribadi di
`sop/lamaran.md`), pindahkan dulu bagian pribadi itu ke `CLAUDE.md` user (bagian
"pengecualian PERSONAL") sebelum file sistemnya diganti, lalu sebut di laporan.

## 5. Penutup

1. `python3 ./--settings/scripts/verify_consistency.py`. Ada yang bermasalah → bereskan dulu.
2. Tulis tanggal hari ini (`YYYY-MM-DD`) ke `01_user_documents/--usersettings/.vantage_version`.
3. Lapor ke user 2–4 baris: apa saja yang berubah, data dan gaya ngobrol tetap sama.
4. Bilang `vantage_update/` / `UPDATE.md` boleh dihapus user sendiri.

## 6. Pindah ke komputer baru

1. Di komputer lama: zip **folder Vantage utuh** (klik kanan → Compress / Kirim ke ZIP).
   Zip tidak kena batas panjang path.
2. Di komputer baru: extract ke path pendek (mis. `C:\Vantage`), bukan ke dalam banyak
   lapis folder OneDrive/iCloud.
3. Buka Nova di folder itu, ketik "halo"; Nova mengenali folder user yang sudah ada.
4. Data dari tempat lain yang cuma ada sebagian (bukan folder Vantage utuh): taruh
   **file ZIP-nya** di Inbox, bukan foldernya. Nova mengekstrak file yang dibutuhkan satu
   per satu langsung ke lokasi barunya dengan nama pendek (`onboarding/first_run.md`).

## 7. Instalasi lama yang belum punya SOP ini

Paket Update tetap jalan: `CLAUDE.md` root yang baru (dari paket) menunjuk ke
`_TEMPLATE/--settings/sop/update.md` kalau folder user belum punya `sop/update.md`.
Update pertama mungkin butuh beberapa pertanyaan tambahan; berikutnya cukup "update" +
satu "oke".
