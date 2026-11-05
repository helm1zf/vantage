# SOP Update — versi baru masuk, pindah komputer, tanpa menyalin folder lama

**Kapan dipakai:** user bilang "update" (atau aplikasi menawarkan "Vantage update available"). Juga saat user pindah ke komputer baru
(bagian 5).

**Cara kerja:** skrip membandingkan dan mengganti file sistem (hash, bukan tebakan); Nova hanya menjelaskan dan menjalankan migrasi data yang
butuh penilaian. Data user tidak pernah dipindah atau disalin.

---

## 1. Ambil kit terbaru

Folder `vantage.json` (sejajar `_TEMPLATE/`) berisi `github_repo`. Unduh ke **folder sementara** (bukan folder user):
`https://github.com/<github_repo>/releases/latest/download/Vantage_Kit.zip` lalu extract. Gagal mengunduh (tidak ada internet, repo tidak
ketemu) → satu kalimat ke user, jangan menebak isi update. Kalau user menaruh folder `vantage_update/` sendiri, pakai itu sebagai kit.

## 2. Rencana (tidak mengubah apa pun)

```
python3 <kit>/_TEMPLATE/--settings/scripts/apply_update.py --source <kit> --user <folder-user>
```

Hasilnya JSON: `new` (file baru), `changed` (file yang berbeda), `obsolete` (file lama yang dipindah ke cadangan), `package` (CLAUDE.md
dan agen di root), `same` (jumlah yang sudah sama), `pending_migrations` (perubahan data yang perlu dikerjakan, diurut dari yang tertua).

## 3. Satu ringkasan, satu konfirmasi

Kirim 3–5 baris bahasa awam: berapa file berubah, apa yang baru dari judul `pending_migrations`, dan bahwa data, CV, dan gaya ngobrol
tidak diubah. User bilang oke sekali → kerjakan sampai selesai, jangan tanya per langkah. Berhenti dan tanya HANYA kalau ada dua data yang
bentrok dan tidak jelas mana yang dipakai, atau satu langkah akan mengubah data pribadi (bagian 4).

## 4. Pasang, lalu migrasi data

1. `... apply_update.py --source <kit> --user <folder-user> --apply` mengganti file sistem. Setiap file yang diganti disalin dulu ke
   `01_user_documents/--usersettings/update_backup/<waktu>/` (bisa dikembalikan kapan saja).
2. Kerjakan tiap blok `pending_migrations` dari yang tertua: baca "Deteksi" dan "Tindakan" di blok itu, dan lakukan hanya kalau
   deteksinya cocok di folder user ini. Migrasi yang hanya mengganti file sistem sudah beres oleh skrip.
3. `python3 ./--settings/scripts/verify_consistency.py`; ada yang bermasalah → bereskan dulu.
4. `... apply_update.py --source <kit> --user <folder-user> --stamp` menulis versi ke `.vantage_version`.
5. Lapor 2–4 baris: apa yang berubah. Hapus folder sementara.

**Yang TIDAK PERNAH ditimpa** (skrip tidak menyentuhnya karena tidak ada di manifest): `CLAUDE.md` milik user, `raw_facts_about_you.md`,
`interview_stories.md`, `--usersettings/` (identity, applications, JD_Insights yang sudah ada isinya, status), `materials/`,
`00_other_cv_as_role_model/`, file about item, dan seluruh `02_workflow/`. `JD_Insights.md`, `status.md`, dan `materials/00_index.md`
hanya dibuat kalau belum ada. Kalau user pernah mengubah file sistem sendiri, versi lamanya ada di cadangan: pindahkan bagian pribadi itu
ke `CLAUDE.md` user ("pengecualian PERSONAL") dan sebut di laporan.

## 5. Pindah ke komputer baru

1. Di komputer lama: zip **folder Vantage utuh** (klik kanan → Compress / Kirim ke ZIP).
2. Di komputer baru: extract ke path pendek (mis. `C:\Vantage`), bukan ke dalam banyak lapis OneDrive/iCloud.
3. Buka Vantage dan chat Nova, ketik "halo"; Nova mengenali folder user yang sudah ada.
4. Data yang cuma ada sebagian (bukan folder Vantage utuh): taruh **file ZIP-nya** di Inbox, bukan foldernya. Ekstrak file yang dibutuhkan
   satu per satu langsung ke lokasi barunya dengan nama pendek.

## 6. Instalasi lama yang belum punya `apply_update.py`

Tidak masalah: skrip dijalankan dari kit yang baru diunduh (bagian 2). Update pertama memasang `apply_update.py`, `doctor.py`, dan
SOP ini; sesudahnya cukup "update".
