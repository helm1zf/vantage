# SOP Lamaran — dari JD sampai PDF siap kirim

Tujuan file ini: hasil lamaran ke-20 sama bagusnya dengan lamaran yang sudah dipoles
berjam-jam. File ini cuma ALUR (langkah, ambang, folder, tracker). Aturan isi tulisan
(jangkar, framing, contoh ✅/❌, layout) ada di `sop/aturan_isi.md`; rencana belajar untuk
skill gap berulang di `sop/rencana_belajar.md`.

**Siapa mengerjakan langkah mana:** Arga langkah 1-3c (analisis + skor), Bayu langkah
4-8 (dokumen + tracker), Tari memeriksa hasil Bayu (`sop/cek_kualitas.md`), Raka langkah
9 (fakta baru). Serah terimanya otomatis (`sop/tabel_arah.md` bagian 3).

**Dibaca:** file ini (alur + folder) selalu; lalu SATU bagian sesuai peran:
- Arga: `sop/lamaran_analisis.md` (langkah 1-3c: parse JD, petakan bukti, skor, JD_Insights, skip/eksekusi).
- Bayu dan Tari: `sop/lamaran_dokumen.md` (langkah 4-9: folder, build CV/CL, PDF, verifikasi, tracker, fakta baru, yang perlu ditanya) + `sop/aturan_isi.md`.
Nomor langkah (1-9) tidak berubah; yang berubah hanya letak filenya.

Dipakai bareng:
- `raw_facts_about_you.md` (buat dari `templates/raw_facts.md`) — satu-satunya sumber fakta
- `--settings/scripts/build_cv.py` / `build_cover_letter.py` — generator layout, jangan bikin layout baru dari nol
- `01_user_documents/--usersettings/applications.json` — sumber data tracker (hidden)
- `01_user_documents/--usersettings/JD_Insights.md` — log skill-gap & pola JD, lihat langkah 3b di `sop/lamaran_analisis.md` (hidden)
- `01_user_documents/--usersettings/identity.json` — data diri (nama, kontak) yang dibaca otomatis oleh builder (hidden)
- `CLAUDE.md` di folder user — aturan personal; kalau bentrok sama file ini, CLAUDE.md yang menang
  (kecuali soal alur proses: di situ file ini yang menang)

---

## Alur

**Urutan: analisis dan skor DULUAN, baru diputuskan skip atau eksekusi.** Beda dari
versi lama SOP ini yang nanya "mau dilamar atau masih lihat-lihat" di awal SEBELUM ada
skor — itu bikin user bingung nunggu jawaban ke pertanyaan yang belum ada dasarnya.
Sekarang: begitu JD dilempar, langsung jalankan langkah 1-3b di `sop/lamaran_analisis.md` (parse, petakan
bukti, skor, catat skill gap) TANPA nanya dulu. Baru SETELAH skor keluar, tentukan
skip atau eksekusi lewat langkah 3c.

**Arsip folder — by action, bukan by submitted.** Dua lokasi, STRUKTUR BEDA sengaja:
- `02_workflow/01_Pipeline/` = **antrian hidup** — yang butuh aksi: status `Draft` (bikin/upload) +
  yang aktif diproses (`Screening`, `Interview R1/R2`, `Assessment`). Folder RATA
  langsung `DD-MM_Perusahaan_Posisi/`, tanpa sub-folder Jenis/Tahun/Bulan — di sini
  diakses sering dan isinya alami sedikit, nesting cuma nambah klik.
- `02_workflow/02_Sent/` (sejajar 01_Pipeline) = **arsip** — `Applied` yang tinggal
  nunggu pasif + status tertutup (`Rejected`, `Withdrawn`, `Offer` yang selesai).
  Nested `<Jenis>/<Tahun>/<Bulan>/DD-MM_Perusahaan_Posisi/` — di sini diakses
  jarang tapi menumpuk terus, nesting-nya yang justru kepake.

Saat status pindah, **pindahkan foldernya** ke lokasi yang sesuai DAN **update field
`folder` di applications.json** (kalau nggak, link putus). Windows sering kunci folder
kalau ada File Explorer/PDF viewer kebuka di situ — tutup dulu kalau `mv` kena Permission
denied. Detail lengkap cara nentuin `<Jenis>/<Tahun>/<Bulan>` (termasuk logic penanda
bulan aktif `00_`) ada di langkah 8 di `sop/lamaran_dokumen.md`.

---
